/**
 * Tests for tension scoring and analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  analyzeTension,
  calculateTensionTrend,
  collectChapters,
  generateTensionRecommendations,
  generateTensionWarnings,
  getAnalysisCompletion,
  getChaptersWithoutTargets,
  getCriticalWarnings,
  getHighDivergenceChapters,
  getHighTensionChapters,
  getLowTensionChapters,
  getUnanalyzedChapters,
  tensionNeedsAttention,
  DEFAULT_TENSION_CONFIG,
  type ChapterTensionData,
  type TensionAnalysisDependencies,
  type TensionAnalysisInput,
  type TensionWarning,
} from './tension';

import type { ContentAnalysis, Structure } from '@repo/serial-types';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestStructure(
  overrides: Partial<Structure> = {},
  children: Structure[] = []
): Structure {
  return {
    id: `structure-${Math.random().toString(36).substr(2, 9)}`,
    type: 'chapter',
    title: 'Test Chapter',
    summary: 'Test summary',
    beats: [],
    order: 0,
    children,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createBookWithChapters(chapterCount: number, tensionTargets?: number[]): Structure {
  const chapters = Array.from({ length: chapterCount }, (_, i) =>
    createTestStructure({
      id: `chapter-${i + 1}`,
      title: `Chapter ${i + 1}`,
      order: i,
      tensionTarget: tensionTargets?.[i],
    })
  );

  return createTestStructure(
    {
      id: 'book-1',
      type: 'book',
      title: 'Test Book',
    },
    chapters
  );
}

function createMockDependencies(
  analysisMap: Map<string, ContentAnalysis> = new Map(),
  contentMap: Map<string, { id: string; structureId: string }> = new Map()
): TensionAnalysisDependencies {
  return {
    analysisRepository: {
      findLatest: vi.fn().mockImplementation((_, contentId) => analysisMap.get(contentId)),
      save: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      findByContent: vi.fn().mockReturnValue([]),
    } as unknown as TensionAnalysisDependencies['analysisRepository'],
    contentRepository: {
      findByStructure: vi.fn().mockImplementation((_, structureId) => {
        const content = contentMap.get(structureId);
        if (content) {
          return { id: content.id, structureId, text: 'Test content' };
        }
        return undefined;
      }),
    } as unknown as TensionAnalysisDependencies['contentRepository'],
  };
}

function createTestAnalysis(overrides: Partial<ContentAnalysis> = {}): ContentAnalysis {
  return {
    id: `analysis-${Math.random().toString(36).substr(2, 9)}`,
    contentId: 'content-1',
    contentVersion: 1,
    tensionScore: { score: 50, explanation: 'Average tension' },
    paceScore: { score: 50, explanation: 'Average pace' },
    characterVoiceScores: {},
    continuityIssues: [],
    wordCount: 1000,
    readingTime: 5,
    characterAppearances: [],
    locationAppearances: [],
    threadTouches: [],
    analyzedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createChapterData(overrides: Partial<ChapterTensionData> = {}): ChapterTensionData {
  return {
    structureId: 'chapter-1',
    title: 'Test Chapter',
    position: 1,
    hasContent: true,
    hasAnalysis: true,
    moments: [],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('collectChapters', () => {
  it('should collect chapters from a flat book', () => {
    const book = createBookWithChapters(3);

    const chapters = collectChapters(book);

    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe('Chapter 1');
    expect(chapters[2].title).toBe('Chapter 3');
  });

  it('should collect chapters from nested arcs', () => {
    const arc1 = createTestStructure(
      { id: 'arc-1', type: 'arc', title: 'Arc 1', order: 0 },
      [
        createTestStructure({ id: 'ch-1', title: 'Chapter 1', order: 0 }),
        createTestStructure({ id: 'ch-2', title: 'Chapter 2', order: 1 }),
      ]
    );
    const arc2 = createTestStructure(
      { id: 'arc-2', type: 'arc', title: 'Arc 2', order: 1 },
      [createTestStructure({ id: 'ch-3', title: 'Chapter 3', order: 0 })]
    );
    const book = createTestStructure(
      { id: 'book-1', type: 'book', title: 'Test Book' },
      [arc1, arc2]
    );

    const chapters = collectChapters(book);

    expect(chapters).toHaveLength(3);
    expect(chapters[0].id).toBe('ch-1');
    expect(chapters[1].id).toBe('ch-2');
    expect(chapters[2].id).toBe('ch-3');
  });

  it('should return chapters in reading order', () => {
    const book = createTestStructure({ id: 'book', type: 'book' }, [
      createTestStructure({ id: 'ch-3', title: 'Chapter 3', order: 2 }),
      createTestStructure({ id: 'ch-1', title: 'Chapter 1', order: 0 }),
      createTestStructure({ id: 'ch-2', title: 'Chapter 2', order: 1 }),
    ]);

    const chapters = collectChapters(book);

    expect(chapters[0].title).toBe('Chapter 1');
    expect(chapters[1].title).toBe('Chapter 2');
    expect(chapters[2].title).toBe('Chapter 3');
  });

  it('should return empty array for book with no chapters', () => {
    const book = createTestStructure({ type: 'book' }, []);

    const chapters = collectChapters(book);

    expect(chapters).toHaveLength(0);
  });
});

describe('calculateTensionTrend', () => {
  it('should calculate rising trend', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 30, position: 1 }),
      createChapterData({ actualTension: 50, position: 2 }),
      createChapterData({ actualTension: 70, position: 3 }),
      createChapterData({ actualTension: 90, position: 4 }),
    ];

    const trend = calculateTensionTrend(chapterData);

    expect(trend.direction).toBe('rising');
    expect(trend.slope).toBeGreaterThan(0);
    expect(trend.average).toBe(60);
    expect(trend.min).toBe(30);
    expect(trend.max).toBe(90);
  });

  it('should calculate falling trend', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 90, position: 1 }),
      createChapterData({ actualTension: 70, position: 2 }),
      createChapterData({ actualTension: 50, position: 3 }),
      createChapterData({ actualTension: 30, position: 4 }),
    ];

    const trend = calculateTensionTrend(chapterData);

    expect(trend.direction).toBe('falling');
    expect(trend.slope).toBeLessThan(0);
  });

  it('should calculate stable trend', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 50, position: 1 }),
      createChapterData({ actualTension: 51, position: 2 }),
      createChapterData({ actualTension: 49, position: 3 }),
      createChapterData({ actualTension: 50, position: 4 }),
    ];

    const trend = calculateTensionTrend(chapterData);

    expect(trend.direction).toBe('stable');
    expect(Math.abs(trend.slope)).toBeLessThan(1);
  });

  it('should detect varied tension', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 20, position: 1 }),
      createChapterData({ actualTension: 80, position: 2 }),
      createChapterData({ actualTension: 30, position: 3 }),
      createChapterData({ actualTension: 90, position: 4 }),
    ];

    const trend = calculateTensionTrend(chapterData);

    expect(trend.direction).toBe('varied');
    expect(trend.standardDeviation).toBeGreaterThan(15);
  });

  it('should handle empty data', () => {
    const trend = calculateTensionTrend([]);

    expect(trend.direction).toBe('stable');
    expect(trend.average).toBe(0);
    expect(trend.slope).toBe(0);
  });

  it('should handle chapters without analysis', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 50, position: 1 }),
      createChapterData({ actualTension: undefined, position: 2 }),
      createChapterData({ actualTension: 60, position: 3 }),
    ];

    const trend = calculateTensionTrend(chapterData);

    expect(trend.average).toBe(55); // Only counts analyzed chapters
  });
});

describe('generateTensionWarnings', () => {
  it('should warn about low tension chapters', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 20, structureId: 'ch-1' }),
      createChapterData({ actualTension: 25, structureId: 'ch-2' }),
      createChapterData({ actualTension: 50, structureId: 'ch-3' }),
    ];

    const warnings = generateTensionWarnings(chapterData, DEFAULT_TENSION_CONFIG);

    const lowWarning = warnings.find((w) => w.type === 'too-low');
    expect(lowWarning).toBeDefined();
    expect(lowWarning?.affectedStructures).toHaveLength(2);
    expect(lowWarning?.affectedStructures).toContain('ch-1');
    expect(lowWarning?.affectedStructures).toContain('ch-2');
  });

  it('should warn about high tension fatigue', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 90, structureId: 'ch-1' }),
      createChapterData({ actualTension: 95, structureId: 'ch-2' }),
      createChapterData({ actualTension: 88, structureId: 'ch-3' }),
      createChapterData({ actualTension: 40, structureId: 'ch-4' }),
    ];

    const warnings = generateTensionWarnings(chapterData, DEFAULT_TENSION_CONFIG);

    const highWarning = warnings.find((w) => w.type === 'too-high');
    expect(highWarning).toBeDefined();
  });

  it('should warn about significant divergence', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ plannedTension: 50, actualTension: 80, divergence: 30, structureId: 'ch-1' }),
      createChapterData({ plannedTension: 60, actualTension: 30, divergence: -30, structureId: 'ch-2' }),
    ];

    const warnings = generateTensionWarnings(chapterData, DEFAULT_TENSION_CONFIG);

    const divergenceWarning = warnings.find((w) => w.type === 'divergence');
    expect(divergenceWarning).toBeDefined();
    expect(divergenceWarning?.affectedStructures).toHaveLength(2);
  });

  it('should warn about flat tension', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 50 }),
      createChapterData({ actualTension: 52 }),
      createChapterData({ actualTension: 48 }),
      createChapterData({ actualTension: 51 }),
    ];

    const warnings = generateTensionWarnings(chapterData, DEFAULT_TENSION_CONFIG);

    const flatWarning = warnings.find((w) => w.type === 'flat-line');
    expect(flatWarning).toBeDefined();
  });

  it('should warn about declining trend', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 80, position: 1 }),
      createChapterData({ actualTension: 70, position: 2 }),
      createChapterData({ actualTension: 60, position: 3 }),
      createChapterData({ actualTension: 40, position: 4 }),
    ];

    const warnings = generateTensionWarnings(chapterData, DEFAULT_TENSION_CONFIG);

    const declineWarning = warnings.find((w) => w.type === 'declining-trend');
    expect(declineWarning).toBeDefined();
  });

  it('should warn about missing targets', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ hasContent: true, plannedTension: undefined, structureId: 'ch-1' }),
      createChapterData({ hasContent: true, plannedTension: 50, structureId: 'ch-2' }),
    ];

    const warnings = generateTensionWarnings(chapterData, DEFAULT_TENSION_CONFIG);

    const targetWarning = warnings.find((w) => w.type === 'missing-target');
    expect(targetWarning).toBeDefined();
    expect(targetWarning?.affectedStructures).toContain('ch-1');
  });

  it('should warn about missing analysis', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ hasContent: true, hasAnalysis: false, structureId: 'ch-1' }),
      createChapterData({ hasContent: true, hasAnalysis: true, structureId: 'ch-2' }),
    ];

    const warnings = generateTensionWarnings(chapterData, DEFAULT_TENSION_CONFIG);

    const analysisWarning = warnings.find((w) => w.type === 'missing-analysis');
    expect(analysisWarning).toBeDefined();
    expect(analysisWarning?.affectedStructures).toContain('ch-1');
  });

  it('should return no warnings for healthy data', () => {
    const chapterData: ChapterTensionData[] = [
      createChapterData({ actualTension: 40, plannedTension: 45, divergence: -5 }),
      createChapterData({ actualTension: 60, plannedTension: 55, divergence: 5 }),
      createChapterData({ actualTension: 50, plannedTension: 50, divergence: 0 }),
      createChapterData({ actualTension: 70, plannedTension: 65, divergence: 5 }),
    ];

    const warnings = generateTensionWarnings(chapterData, DEFAULT_TENSION_CONFIG);

    // No critical warnings expected
    const criticalWarnings = warnings.filter((w) => w.severity === 'critical' || w.severity === 'warning');
    expect(criticalWarnings).toHaveLength(0);
  });
});

describe('generateTensionRecommendations', () => {
  it('should recommend increasing tension for declining trend', () => {
    const chapterData: ChapterTensionData[] = [];
    const trend = { direction: 'falling' as const, slope: -3, average: 50, min: 30, max: 70, standardDeviation: 10 };
    const warnings: TensionWarning[] = [];

    const recommendations = generateTensionRecommendations(chapterData, warnings, trend);

    const increaseRec = recommendations.find((r) => r.type === 'increase');
    expect(increaseRec).toBeDefined();
    expect(increaseRec?.priority).toBe(1);
  });

  it('should recommend varying tension for flat-line', () => {
    const chapterData: ChapterTensionData[] = [];
    const trend = { direction: 'stable' as const, slope: 0, average: 50, min: 48, max: 52, standardDeviation: 2 };
    const warnings: TensionWarning[] = [
      { type: 'flat-line', severity: 'info', message: 'Flat tension', affectedStructures: ['ch-1'] },
    ];

    const recommendations = generateTensionRecommendations(chapterData, warnings, trend);

    const varyRec = recommendations.find((r) => r.type === 'vary');
    expect(varyRec).toBeDefined();
    expect(varyRec?.actions.length).toBeGreaterThan(0);
  });

  it('should recommend decreasing tension for fatigue', () => {
    const chapterData: ChapterTensionData[] = [];
    const trend = { direction: 'stable' as const, slope: 0, average: 90, min: 85, max: 95, standardDeviation: 3 };
    const warnings: TensionWarning[] = [
      { type: 'too-high', severity: 'warning', message: 'High tension', affectedStructures: ['ch-1'] },
    ];

    const recommendations = generateTensionRecommendations(chapterData, warnings, trend);

    const decreaseRec = recommendations.find((r) => r.type === 'decrease');
    expect(decreaseRec).toBeDefined();
  });

  it('should prioritize recommendations correctly', () => {
    const chapterData: ChapterTensionData[] = [];
    const trend = { direction: 'falling' as const, slope: -3, average: 50, min: 30, max: 70, standardDeviation: 10 };
    const warnings: TensionWarning[] = [
      { type: 'flat-line', severity: 'info', message: 'Flat', affectedStructures: [] },
      { type: 'missing-analysis', severity: 'info', message: 'Missing', affectedStructures: ['ch-1'] },
    ];

    const recommendations = generateTensionRecommendations(chapterData, warnings, trend);

    expect(recommendations[0].type).toBe('increase'); // Priority 1
    expect(recommendations[recommendations.length - 1].type).toBe('analyze'); // Priority 4
  });
});

describe('analyzeTension', () => {
  it('should generate complete analysis report', () => {
    const book = createBookWithChapters(3, [40, 60, 80]);
    const input: TensionAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', tensionScore: { score: 45, explanation: 'Low tension' } })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', tensionScore: { score: 55, explanation: 'Medium tension' } })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', tensionScore: { score: 75, explanation: 'High tension' } })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);

    const report = analyzeTension(input, deps);

    expect(report.summary.structureId).toBe('book-1');
    expect(report.summary.totalChapters).toBe(3);
    expect(report.summary.chaptersAnalyzed).toBe(3);
    expect(report.chapterData).toHaveLength(3);
    expect(report.generatedAt).toBeDefined();
  });

  it('should calculate averages correctly', () => {
    const book = createBookWithChapters(3, [40, 60, 80]);
    const input: TensionAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', tensionScore: { score: 30, explanation: '' } })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', tensionScore: { score: 60, explanation: '' } })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', tensionScore: { score: 90, explanation: '' } })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);

    const report = analyzeTension(input, deps);

    expect(report.summary.averageTension).toBe(60); // (30 + 60 + 90) / 3
    expect(report.summary.plannedAverageTension).toBe(60); // (40 + 60 + 80) / 3
  });

  it('should handle chapters without content', () => {
    const book = createBookWithChapters(3);
    const input: TensionAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    // Only first chapter has content
    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', tensionScore: { score: 50, explanation: '' } })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);

    const report = analyzeTension(input, deps);

    expect(report.summary.chaptersWithContent).toBe(1);
    expect(report.summary.chaptersAnalyzed).toBe(1);
    expect(report.summary.totalChapters).toBe(3);
  });

  it('should handle content without analysis', () => {
    const book = createBookWithChapters(2);
    const input: TensionAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
    ]);

    // Only first chapter has analysis
    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1' })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);

    const report = analyzeTension(input, deps);

    expect(report.summary.chaptersWithContent).toBe(2);
    expect(report.summary.chaptersAnalyzed).toBe(1);
    expect(report.warnings.some((w) => w.type === 'missing-analysis')).toBe(true);
  });

  it('should apply custom config', () => {
    const book = createBookWithChapters(2);
    const input: TensionAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
    ]);

    // Tension of 35 is below default threshold (30) but above custom (20)
    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', tensionScore: { score: 25, explanation: '' } })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);

    const reportDefault = analyzeTension(input, deps);
    const reportCustom = analyzeTension(input, deps, { lowTensionThreshold: 20 });

    expect(reportDefault.warnings.some((w) => w.type === 'too-low')).toBe(true);
    expect(reportCustom.warnings.some((w) => w.type === 'too-low')).toBe(false);
  });
});

describe('utility functions', () => {
  let sampleReport: ReturnType<typeof analyzeTension>;

  beforeEach(() => {
    const book = createBookWithChapters(4, [50, 50, 50, 50]);
    const input: TensionAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
      ['chapter-4', { id: 'content-4', structureId: 'chapter-4' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', tensionScore: { score: 20, explanation: '' } })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', tensionScore: { score: 50, explanation: '' } })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', tensionScore: { score: 90, explanation: '' } })],
      // content-4 has no analysis
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    sampleReport = analyzeTension(input, deps);
  });

  describe('getLowTensionChapters', () => {
    it('should return chapters below threshold', () => {
      const lowChapters = getLowTensionChapters(sampleReport, 30);
      expect(lowChapters).toHaveLength(1);
      expect(lowChapters[0].structureId).toBe('chapter-1');
    });
  });

  describe('getHighTensionChapters', () => {
    it('should return chapters above threshold', () => {
      const highChapters = getHighTensionChapters(sampleReport, 85);
      expect(highChapters).toHaveLength(1);
      expect(highChapters[0].structureId).toBe('chapter-3');
    });
  });

  describe('getHighDivergenceChapters', () => {
    it('should return chapters with high divergence', () => {
      const divergentChapters = getHighDivergenceChapters(sampleReport, 15);
      // Chapter 1: planned 50, actual 20, divergence -30
      // Chapter 3: planned 50, actual 90, divergence 40
      expect(divergentChapters.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getUnanalyzedChapters', () => {
    it('should return chapters with content but no analysis', () => {
      const unanalyzed = getUnanalyzedChapters(sampleReport);
      expect(unanalyzed).toHaveLength(1);
      expect(unanalyzed[0].structureId).toBe('chapter-4');
    });
  });

  describe('getChaptersWithoutTargets', () => {
    it('should return chapters without tension targets', () => {
      // Our test setup has targets on all chapters
      const noTargets = getChaptersWithoutTargets(sampleReport);
      expect(noTargets).toHaveLength(0);
    });
  });

  describe('tensionNeedsAttention', () => {
    it('should return true when there are warning-level issues', () => {
      // Create a report with warning-level issues (>3 chapters with low tension)
      const book = createBookWithChapters(5, [30, 30, 30, 30, 30]);
      const input: TensionAnalysisInput = {
        projectId: 'project-1',
        rootStructure: book,
      };

      const contentMap = new Map<string, { id: string; structureId: string }>([
        ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
        ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
        ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
        ['chapter-4', { id: 'content-4', structureId: 'chapter-4' }],
        ['chapter-5', { id: 'content-5', structureId: 'chapter-5' }],
      ]);

      // All chapters have very low tension (20) - this should trigger warning-level 'too-low'
      const analysisMap = new Map<string, ContentAnalysis>([
        ['content-1', createTestAnalysis({ contentId: 'content-1', tensionScore: { score: 20, explanation: '' } })],
        ['content-2', createTestAnalysis({ contentId: 'content-2', tensionScore: { score: 20, explanation: '' } })],
        ['content-3', createTestAnalysis({ contentId: 'content-3', tensionScore: { score: 20, explanation: '' } })],
        ['content-4', createTestAnalysis({ contentId: 'content-4', tensionScore: { score: 20, explanation: '' } })],
        ['content-5', createTestAnalysis({ contentId: 'content-5', tensionScore: { score: 20, explanation: '' } })],
      ]);

      const deps = createMockDependencies(analysisMap, contentMap);
      const reportWithWarnings = analyzeTension(input, deps);

      expect(tensionNeedsAttention(reportWithWarnings)).toBe(true);
    });

    it('should return false when only info-level issues', () => {
      const book = createBookWithChapters(2, [50, 50]);
      const input: TensionAnalysisInput = {
        projectId: 'project-1',
        rootStructure: book,
      };

      const contentMap = new Map<string, { id: string; structureId: string }>([
        ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
        ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ]);

      const analysisMap = new Map<string, ContentAnalysis>([
        ['content-1', createTestAnalysis({ contentId: 'content-1', tensionScore: { score: 50, explanation: '' } })],
        ['content-2', createTestAnalysis({ contentId: 'content-2', tensionScore: { score: 55, explanation: '' } })],
      ]);

      const deps = createMockDependencies(analysisMap, contentMap);
      const report = analyzeTension(input, deps);

      // This should have only info-level warnings (if any)
      const hasWarnings = report.warnings.some((w) => w.severity === 'warning' || w.severity === 'critical');
      if (!hasWarnings) {
        expect(tensionNeedsAttention(report)).toBe(false);
      }
    });
  });

  describe('getCriticalWarnings', () => {
    it('should return only critical warnings', () => {
      const critical = getCriticalWarnings(sampleReport);
      expect(critical.every((w) => w.severity === 'critical')).toBe(true);
    });
  });

  describe('getAnalysisCompletion', () => {
    it('should calculate completion percentage', () => {
      const completion = getAnalysisCompletion(sampleReport);
      // 3 analyzed out of 4 with content = 75%
      expect(completion).toBe(75);
    });

    it('should return 0 for no content', () => {
      const book = createBookWithChapters(2);
      const input: TensionAnalysisInput = {
        projectId: 'project-1',
        rootStructure: book,
      };
      const deps = createMockDependencies();
      const report = analyzeTension(input, deps);

      expect(getAnalysisCompletion(report)).toBe(0);
    });
  });
});
