/**
 * Tests for tension curve data generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

import {
  extractPlannedTension,
  generateTensionCurve,
  calculateDivergence,
  aggregateActualTension,
  calculateStructureDivergence,
  getHighDivergenceChapters,
  getMissingAnalysisChapters,
  getMissingTargetChapters,
  type TensionCurveDependencies,
} from './tension-curve';
import { createAnalysisRepository } from './repository';
import { CREATE_TABLES_SQL } from '../storage/schema';
import type { ContentAnalysis, Structure, TensionCurveData } from '@repo/types';

// Create test database
function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(CREATE_TABLES_SQL);
  return db;
}

// Create a test structure tree
function createTestStructure(overrides: Partial<Structure> = {}): Structure {
  const now = new Date().toISOString();
  return {
    id: 'book-1',
    type: 'book',
    title: 'Test Book',
    summary: 'A test book',
    beats: [],
    order: 0,
    children: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Create a test chapter
function createTestChapter(
  id: string,
  order: number,
  tensionTarget?: number,
  overrides: Partial<Structure> = {}
): Structure {
  const now = new Date().toISOString();
  return {
    id,
    type: 'chapter',
    title: `Chapter ${order + 1}`,
    summary: `Chapter ${order + 1} summary`,
    beats: [],
    order,
    tensionTarget,
    children: [],
    parentId: 'book-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Create test analysis data
function createTestAnalysis(
  contentId: string,
  tensionScore: number,
  overrides: Partial<ContentAnalysis> = {}
): ContentAnalysis {
  return {
    id: `analysis-${contentId}`,
    contentId,
    contentVersion: 1,
    tensionScore: {
      score: tensionScore,
      explanation: 'Test tension',
    },
    paceScore: {
      score: 70,
      explanation: 'Test pacing',
    },
    characterVoiceScores: {},
    continuityIssues: [],
    wordCount: 2500,
    readingTime: 12,
    characterAppearances: [],
    locationAppearances: [],
    threadTouches: [],
    analyzedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Create mock dependencies
function createMockDeps(
  contentMap: Map<string, { contentId: string; status: string }>,
  analysisMap: Map<string, ContentAnalysis>
): TensionCurveDependencies {
  return {
    analysisRepository: {
      findLatest: vi.fn((_projectId: string, contentId: string) => {
        return analysisMap.get(contentId);
      }),
    } as unknown as TensionCurveDependencies['analysisRepository'],
    contentRepository: {
      findByStructure: vi.fn((_projectId: string, structureId: string) => {
        const data = contentMap.get(structureId);
        if (!data) return undefined;
        return {
          id: data.contentId,
          structureId,
          status: data.status,
          currentVersion: 1,
          text: 'Test content',
          versions: [],
          reviews: [],
          generationHistory: [],
          locked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }),
    } as unknown as TensionCurveDependencies['contentRepository'],
  };
}

// Setup test project
function setupTestProject(db: Database.Database): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, title, format, settings_json, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('project-1', 'Test Project', 'web-serial', '{}', '{}', now, now);
}

describe('extractPlannedTension', () => {
  it('should extract chapters in reading order', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 40),
        createTestChapter('ch-2', 1, 60),
        createTestChapter('ch-3', 2, 80),
      ],
    });

    const points = extractPlannedTension(book);

    expect(points).toHaveLength(3);
    expect(points[0].structureId).toBe('ch-1');
    expect(points[0].tensionTarget).toBe(40);
    expect(points[1].structureId).toBe('ch-2');
    expect(points[1].tensionTarget).toBe(60);
    expect(points[2].structureId).toBe('ch-3');
    expect(points[2].tensionTarget).toBe(80);
  });

  it('should handle chapters without tension targets', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 40),
        createTestChapter('ch-2', 1, undefined), // No target
        createTestChapter('ch-3', 2, 80),
      ],
    });

    const points = extractPlannedTension(book);

    expect(points).toHaveLength(3);
    expect(points[0].tensionTarget).toBe(40);
    expect(points[1].tensionTarget).toBeUndefined();
    expect(points[2].tensionTarget).toBe(80);
  });

  it('should handle nested arcs', () => {
    const now = new Date().toISOString();
    const arc1: Structure = {
      id: 'arc-1',
      type: 'arc',
      title: 'Arc 1',
      summary: 'First arc',
      beats: [],
      order: 0,
      children: [
        createTestChapter('ch-1', 0, 30),
        createTestChapter('ch-2', 1, 50),
      ],
      parentId: 'book-1',
      createdAt: now,
      updatedAt: now,
    };
    const arc2: Structure = {
      id: 'arc-2',
      type: 'arc',
      title: 'Arc 2',
      summary: 'Second arc',
      beats: [],
      order: 1,
      children: [
        createTestChapter('ch-3', 0, 70),
        createTestChapter('ch-4', 1, 90),
      ],
      parentId: 'book-1',
      createdAt: now,
      updatedAt: now,
    };

    const book = createTestStructure({
      children: [arc1, arc2],
    });

    const points = extractPlannedTension(book);

    expect(points).toHaveLength(4);
    expect(points[0].structureId).toBe('ch-1');
    expect(points[1].structureId).toBe('ch-2');
    expect(points[2].structureId).toBe('ch-3');
    expect(points[3].structureId).toBe('ch-4');
  });

  it('should include scenes in extraction', () => {
    const now = new Date().toISOString();
    const chapter: Structure = {
      id: 'ch-1',
      type: 'chapter',
      title: 'Chapter 1',
      summary: 'First chapter',
      beats: [],
      order: 0,
      tensionTarget: 50,
      children: [
        {
          id: 'scene-1',
          type: 'scene',
          title: 'Scene 1',
          summary: 'First scene',
          beats: [],
          order: 0,
          tensionTarget: 40,
          children: [],
          parentId: 'ch-1',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'scene-2',
          type: 'scene',
          title: 'Scene 2',
          summary: 'Second scene',
          beats: [],
          order: 1,
          tensionTarget: 60,
          children: [],
          parentId: 'ch-1',
          createdAt: now,
          updatedAt: now,
        },
      ],
      parentId: 'book-1',
      createdAt: now,
      updatedAt: now,
    };

    const book = createTestStructure({
      children: [chapter],
    });

    const points = extractPlannedTension(book);

    // Should include chapter and both scenes
    expect(points).toHaveLength(3);
    expect(points.find(p => p.structureId === 'ch-1')).toBeDefined();
    expect(points.find(p => p.structureId === 'scene-1')).toBeDefined();
    expect(points.find(p => p.structureId === 'scene-2')).toBeDefined();
  });

  it('should return empty array for empty book', () => {
    const book = createTestStructure({ children: [] });

    const points = extractPlannedTension(book);

    expect(points).toHaveLength(0);
  });
});

describe('calculateDivergence', () => {
  it('should calculate positive divergence when actual is higher', () => {
    const divergence = calculateDivergence(50, 70);
    expect(divergence).toBe(20);
  });

  it('should calculate negative divergence when actual is lower', () => {
    const divergence = calculateDivergence(70, 50);
    expect(divergence).toBe(-20);
  });

  it('should return zero when values are equal', () => {
    const divergence = calculateDivergence(60, 60);
    expect(divergence).toBe(0);
  });

  it('should return undefined when planned is undefined', () => {
    const divergence = calculateDivergence(undefined, 60);
    expect(divergence).toBeUndefined();
  });

  it('should return undefined when actual is undefined', () => {
    const divergence = calculateDivergence(60, undefined);
    expect(divergence).toBeUndefined();
  });

  it('should return undefined when both are undefined', () => {
    const divergence = calculateDivergence(undefined, undefined);
    expect(divergence).toBeUndefined();
  });
});

describe('generateTensionCurve', () => {
  it('should generate complete tension curve data', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 40),
        createTestChapter('ch-2', 1, 60),
        createTestChapter('ch-3', 2, 80),
      ],
    });

    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'approved' }],
      ['ch-2', { contentId: 'content-2', status: 'draft' }],
      ['ch-3', { contentId: 'content-3', status: 'published' }],
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', 45)],
      ['content-2', createTestAnalysis('content-2', 55)],
      ['content-3', createTestAnalysis('content-3', 85)],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateTensionCurve(
      { projectId: 'project-1', rootStructure: book },
      deps
    );

    expect(result.dataPoints).toHaveLength(3);
    expect(result.metadata.dataPointCount).toBe(3);
    expect(result.metadata.plannedCount).toBe(3);
    expect(result.metadata.actualCount).toBe(3);
  });

  it('should calculate correct data points', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 50),
      ],
    });

    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'approved' }],
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', 65, { wordCount: 3000 })],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateTensionCurve(
      { projectId: 'project-1', rootStructure: book },
      deps
    );

    const point = result.dataPoints[0];
    expect(point.structureId).toBe('ch-1');
    expect(point.position).toBe(1);
    expect(point.title).toBe('Chapter 1');
    expect(point.structureType).toBe('chapter');
    expect(point.plannedTension).toBe(50);
    expect(point.actualTension).toBe(65);
    expect(point.divergence).toBe(15); // 65 - 50
    expect(point.wordCount).toBe(3000);
    expect(point.contentStatus).toBe('approved');
    expect(point.hasContent).toBe(true);
    expect(point.hasAnalysis).toBe(true);
    expect(point.contentId).toBe('content-1');
  });

  it('should handle chapters without content', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 50),
      ],
    });

    const contentMap = new Map<string, { contentId: string; status: string }>();
    const analysisMap = new Map<string, ContentAnalysis>();

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateTensionCurve(
      { projectId: 'project-1', rootStructure: book },
      deps
    );

    const point = result.dataPoints[0];
    expect(point.plannedTension).toBe(50);
    expect(point.actualTension).toBeUndefined();
    expect(point.divergence).toBeUndefined();
    expect(point.hasContent).toBe(false);
    expect(point.hasAnalysis).toBe(false);
  });

  it('should handle content without analysis', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 50),
      ],
    });

    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'draft' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>();

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateTensionCurve(
      { projectId: 'project-1', rootStructure: book },
      deps
    );

    const point = result.dataPoints[0];
    expect(point.plannedTension).toBe(50);
    expect(point.actualTension).toBeUndefined();
    expect(point.divergence).toBeUndefined();
    expect(point.hasContent).toBe(true);
    expect(point.hasAnalysis).toBe(false);
  });

  it('should calculate correct metadata averages', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 40),
        createTestChapter('ch-2', 1, 60),
        createTestChapter('ch-3', 2, 80),
      ],
    });

    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'approved' }],
      ['ch-2', { contentId: 'content-2', status: 'approved' }],
      // ch-3 has no content
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', 50)],
      ['content-2', createTestAnalysis('content-2', 70)],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateTensionCurve(
      { projectId: 'project-1', rootStructure: book },
      deps
    );

    expect(result.metadata.dataPointCount).toBe(3);
    expect(result.metadata.plannedCount).toBe(3);
    expect(result.metadata.actualCount).toBe(2);
    expect(result.metadata.averagePlannedTension).toBe(60); // (40 + 60 + 80) / 3
    expect(result.metadata.averageActualTension).toBe(60); // (50 + 70) / 2
    // Divergence: ch-1 = 10, ch-2 = 10, average absolute = 10
    expect(result.metadata.averageAbsoluteDivergence).toBe(10);
  });
});

describe('aggregateActualTension', () => {
  it('should aggregate tension across multiple structures', () => {
    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'approved' }],
      ['ch-2', { contentId: 'content-2', status: 'approved' }],
      ['ch-3', { contentId: 'content-3', status: 'approved' }],
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', 40)],
      ['content-2', createTestAnalysis('content-2', 60)],
      ['content-3', createTestAnalysis('content-3', 80)],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = aggregateActualTension(
      'project-1',
      ['ch-1', 'ch-2', 'ch-3'],
      deps
    );

    expect(result).toBeDefined();
    expect(result!.averageTension).toBe(60); // (40 + 60 + 80) / 3
    expect(result!.count).toBe(3);
  });

  it('should return undefined when no analyses exist', () => {
    const contentMap = new Map<string, { contentId: string; status: string }>();
    const analysisMap = new Map<string, ContentAnalysis>();

    const deps = createMockDeps(contentMap, analysisMap);

    const result = aggregateActualTension('project-1', ['ch-1', 'ch-2'], deps);

    expect(result).toBeUndefined();
  });

  it('should only count structures with analysis', () => {
    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'approved' }],
      ['ch-2', { contentId: 'content-2', status: 'draft' }], // Has content but no analysis
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', 70)],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = aggregateActualTension('project-1', ['ch-1', 'ch-2'], deps);

    expect(result).toBeDefined();
    expect(result!.averageTension).toBe(70);
    expect(result!.count).toBe(1);
  });
});

describe('calculateStructureDivergence', () => {
  it('should calculate divergence for a single chapter', () => {
    const chapter = createTestChapter('ch-1', 0, 50);

    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'approved' }],
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', 65)],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const divergence = calculateStructureDivergence('project-1', chapter, deps);

    expect(divergence).toBe(15); // 65 - 50
  });

  it('should return undefined when chapter has no tension target', () => {
    const chapter = createTestChapter('ch-1', 0, undefined);

    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'approved' }],
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', 65)],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const divergence = calculateStructureDivergence('project-1', chapter, deps);

    expect(divergence).toBeUndefined();
  });

  it('should return undefined when chapter has no content', () => {
    const chapter = createTestChapter('ch-1', 0, 50);

    const contentMap = new Map<string, { contentId: string; status: string }>();
    const analysisMap = new Map<string, ContentAnalysis>();

    const deps = createMockDeps(contentMap, analysisMap);

    const divergence = calculateStructureDivergence('project-1', chapter, deps);

    expect(divergence).toBeUndefined();
  });

  it('should calculate divergence for an arc with children', () => {
    const now = new Date().toISOString();
    const arc: Structure = {
      id: 'arc-1',
      type: 'arc',
      title: 'Test Arc',
      summary: 'An arc',
      beats: [],
      order: 0,
      tensionTarget: 60, // Arc-level target
      children: [
        createTestChapter('ch-1', 0, 40),
        createTestChapter('ch-2', 1, 80),
      ],
      createdAt: now,
      updatedAt: now,
    };

    const contentMap = new Map([
      ['ch-1', { contentId: 'content-1', status: 'approved' }],
      ['ch-2', { contentId: 'content-2', status: 'approved' }],
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', 50)],
      ['content-2', createTestAnalysis('content-2', 90)],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const divergence = calculateStructureDivergence('project-1', arc, deps);

    // Average actual: (50 + 90) / 2 = 70
    // Divergence: 70 - 60 = 10
    expect(divergence).toBe(10);
  });
});

describe('getHighDivergenceChapters', () => {
  it('should return chapters with divergence above threshold', () => {
    const tensionCurve: TensionCurveData = {
      dataPoints: [
        {
          structureId: 'ch-1',
          position: 1,
          title: 'Chapter 1',
          structureType: 'chapter',
          plannedTension: 50,
          actualTension: 55,
          divergence: 5,
          hasContent: true,
          hasAnalysis: true,
        },
        {
          structureId: 'ch-2',
          position: 2,
          title: 'Chapter 2',
          structureType: 'chapter',
          plannedTension: 50,
          actualTension: 70,
          divergence: 20, // High divergence
          hasContent: true,
          hasAnalysis: true,
        },
        {
          structureId: 'ch-3',
          position: 3,
          title: 'Chapter 3',
          structureType: 'chapter',
          plannedTension: 50,
          actualTension: 30,
          divergence: -20, // High divergence (negative)
          hasContent: true,
          hasAnalysis: true,
        },
      ],
      metadata: {
        rootStructureId: 'book-1',
        rootTitle: 'Test Book',
        generatedAt: new Date().toISOString(),
        dataPointCount: 3,
        plannedCount: 3,
        actualCount: 3,
      },
    };

    const highDivergence = getHighDivergenceChapters(tensionCurve, 15);

    expect(highDivergence).toHaveLength(2);
    expect(highDivergence.map(p => p.structureId)).toContain('ch-2');
    expect(highDivergence.map(p => p.structureId)).toContain('ch-3');
  });

  it('should exclude chapters without divergence', () => {
    const tensionCurve: TensionCurveData = {
      dataPoints: [
        {
          structureId: 'ch-1',
          position: 1,
          title: 'Chapter 1',
          structureType: 'chapter',
          plannedTension: 50,
          actualTension: undefined,
          divergence: undefined, // No divergence
          hasContent: false,
          hasAnalysis: false,
        },
      ],
      metadata: {
        rootStructureId: 'book-1',
        rootTitle: 'Test Book',
        generatedAt: new Date().toISOString(),
        dataPointCount: 1,
        plannedCount: 1,
        actualCount: 0,
      },
    };

    const highDivergence = getHighDivergenceChapters(tensionCurve, 15);

    expect(highDivergence).toHaveLength(0);
  });
});

describe('getMissingAnalysisChapters', () => {
  it('should return chapters with planned tension but no analysis', () => {
    const tensionCurve: TensionCurveData = {
      dataPoints: [
        {
          structureId: 'ch-1',
          position: 1,
          title: 'Chapter 1',
          structureType: 'chapter',
          plannedTension: 50,
          actualTension: 55,
          hasContent: true,
          hasAnalysis: true,
        },
        {
          structureId: 'ch-2',
          position: 2,
          title: 'Chapter 2',
          structureType: 'chapter',
          plannedTension: 60,
          actualTension: undefined,
          hasContent: true,
          hasAnalysis: false, // Missing analysis
        },
        {
          structureId: 'ch-3',
          position: 3,
          title: 'Chapter 3',
          structureType: 'chapter',
          plannedTension: 70,
          actualTension: undefined,
          hasContent: false,
          hasAnalysis: false, // No content yet
        },
      ],
      metadata: {
        rootStructureId: 'book-1',
        rootTitle: 'Test Book',
        generatedAt: new Date().toISOString(),
        dataPointCount: 3,
        plannedCount: 3,
        actualCount: 1,
      },
    };

    const missing = getMissingAnalysisChapters(tensionCurve);

    expect(missing).toHaveLength(2);
    expect(missing.map(p => p.structureId)).toContain('ch-2');
    expect(missing.map(p => p.structureId)).toContain('ch-3');
  });
});

describe('getMissingTargetChapters', () => {
  it('should return chapters with content but no planned tension', () => {
    const tensionCurve: TensionCurveData = {
      dataPoints: [
        {
          structureId: 'ch-1',
          position: 1,
          title: 'Chapter 1',
          structureType: 'chapter',
          plannedTension: 50,
          actualTension: 55,
          hasContent: true,
          hasAnalysis: true,
        },
        {
          structureId: 'ch-2',
          position: 2,
          title: 'Chapter 2',
          structureType: 'chapter',
          plannedTension: undefined, // No target
          actualTension: 60,
          hasContent: true,
          hasAnalysis: true,
        },
        {
          structureId: 'ch-3',
          position: 3,
          title: 'Chapter 3',
          structureType: 'chapter',
          plannedTension: undefined, // No target
          actualTension: undefined,
          hasContent: false, // No content either
          hasAnalysis: false,
        },
      ],
      metadata: {
        rootStructureId: 'book-1',
        rootTitle: 'Test Book',
        generatedAt: new Date().toISOString(),
        dataPointCount: 3,
        plannedCount: 1,
        actualCount: 2,
      },
    };

    const missing = getMissingTargetChapters(tensionCurve);

    expect(missing).toHaveLength(1);
    expect(missing[0].structureId).toBe('ch-2');
  });
});

describe('integration with repository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    setupTestProject(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should calculate divergence in aggregateForStructure', () => {
    const repo = createAnalysisRepository(db);

    // Create test content
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO structures (id, project_id, type, title, summary, beats_json, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ch-1', 'project-1', 'chapter', 'Chapter 1', 'Summary', '[]', 0, now, now);

    db.prepare(`
      INSERT INTO contents (
        id, project_id, structure_id, current_version, text, status,
        reviews_json, generation_history_json, locked, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('content-1', 'project-1', 'ch-1', 1, 'Test content', 'draft', '[]', '[]', 0, now, now);

    // Save analysis with tension 75
    repo.save('project-1', createTestAnalysis('content-1', 75));

    // Aggregate with structure target of 50
    const aggregated = repo.aggregateForStructure(
      'project-1',
      'arc-1',
      ['content-1'],
      50 // Structure tension target
    );

    expect(aggregated).toBeDefined();
    expect(aggregated!.averageTension).toBe(75);
    expect(aggregated!.tensionDivergence).toBe(25); // 75 - 50
  });

  it('should return zero divergence when no target provided', () => {
    const repo = createAnalysisRepository(db);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO structures (id, project_id, type, title, summary, beats_json, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ch-1', 'project-1', 'chapter', 'Chapter 1', 'Summary', '[]', 0, now, now);

    db.prepare(`
      INSERT INTO contents (
        id, project_id, structure_id, current_version, text, status,
        reviews_json, generation_history_json, locked, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('content-1', 'project-1', 'ch-1', 1, 'Test content', 'draft', '[]', '[]', 0, now, now);

    repo.save('project-1', createTestAnalysis('content-1', 75));

    // Aggregate without structure target
    const aggregated = repo.aggregateForStructure(
      'project-1',
      'arc-1',
      ['content-1']
    );

    expect(aggregated).toBeDefined();
    expect(aggregated!.averageTension).toBe(75);
    expect(aggregated!.tensionDivergence).toBe(0); // No target means 0 divergence
  });
});
