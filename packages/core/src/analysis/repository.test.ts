/**
 * Tests for analysis repository
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'libsql';

import { createAnalysisRepository } from './repository';
import type { ContentAnalysis, ContinuityIssue } from '@repo/types';
import { CREATE_TABLES_SQL } from '../storage/schema';

// Create test database
function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(CREATE_TABLES_SQL);
  return db;
}

// Create test analysis data
function createTestAnalysis(overrides: Partial<ContentAnalysis> = {}): ContentAnalysis {
  return {
    id: 'analysis-1',
    contentId: 'content-1',
    contentVersion: 1,
    tensionScore: {
      score: 65,
      explanation: 'Good tension throughout',
      factors: [{ name: 'conflict', impact: 15, detail: 'Strong conflict' }],
    },
    hookStrength: {
      score: 80,
      explanation: 'Strong cliffhanger',
    },
    paceScore: {
      score: 70,
      explanation: 'Well-paced narrative',
    },
    characterVoiceScores: {
      'char-1': {
        score: 85,
        explanation: 'Consistent voice',
      },
    },
    continuityIssues: [],
    wordCount: 2500,
    readingTime: 12,
    characterAppearances: [
      { characterId: 'char-1', type: 'pov', dialogueLines: 10 },
    ],
    locationAppearances: ['loc-1'],
    threadTouches: [
      { threadId: 'thread-1', type: 'development' },
    ],
    analyzedAt: new Date().toISOString(),
    modelId: 'test-model',
    ...overrides,
  };
}

// Create a test project
function createTestProject(db: Database.Database, projectId: string = 'project-1'): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, title, format, settings_json, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, 'Test Project', 'web-serial', '{}', '{}', now, now);
}

// Create test content
function createTestContent(
  db: Database.Database,
  contentId: string = 'content-1',
  projectId: string = 'project-1',
  structureId: string = 'structure-1'
): void {
  const now = new Date().toISOString();

  // Create structure first
  db.prepare(`
    INSERT INTO structures (id, project_id, type, title, summary, beats_json, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(structureId, projectId, 'chapter', 'Test Chapter', 'Test summary', '[]', 0, now, now);

  // Create content
  db.prepare(`
    INSERT INTO contents (
      id, project_id, structure_id, current_version, text, status,
      reviews_json, generation_history_json, locked, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    contentId,
    projectId,
    structureId,
    1,
    'Test content text',
    'draft',
    '[]',
    '[]',
    0,
    now,
    now
  );
}

describe('createAnalysisRepository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    createTestProject(db);
    createTestContent(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('save', () => {
    it('should save analysis', () => {
      const repo = createAnalysisRepository(db);
      const analysis = createTestAnalysis();

      const saved = repo.save('project-1', analysis);

      expect(saved.id).toBeDefined();
      expect(saved.contentId).toBe('content-1');
    });

    it('should generate ID if not provided', () => {
      const repo = createAnalysisRepository(db);
      const analysis = createTestAnalysis({ id: undefined as unknown as string });

      const saved = repo.save('project-1', analysis);

      expect(saved.id).toBeDefined();
      expect(saved.id.length).toBeGreaterThan(0);
    });

    it('should preserve all score details', () => {
      const repo = createAnalysisRepository(db);
      const analysis = createTestAnalysis();

      repo.save('project-1', analysis);
      const retrieved = repo.findLatest('project-1', 'content-1');

      expect(retrieved?.tensionScore).toEqual(analysis.tensionScore);
      expect(retrieved?.hookStrength).toEqual(analysis.hookStrength);
      expect(retrieved?.paceScore).toEqual(analysis.paceScore);
    });
  });

  describe('findLatest', () => {
    it('should find latest analysis', () => {
      const repo = createAnalysisRepository(db);
      const analysis = createTestAnalysis();

      repo.save('project-1', analysis);
      const found = repo.findLatest('project-1', 'content-1');

      expect(found).toBeDefined();
      expect(found?.contentId).toBe('content-1');
    });

    it('should return undefined when not found', () => {
      const repo = createAnalysisRepository(db);

      const found = repo.findLatest('project-1', 'nonexistent');

      expect(found).toBeUndefined();
    });

    it('should return most recent version', () => {
      const repo = createAnalysisRepository(db);

      // Save version 1
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        contentVersion: 1,
        tensionScore: { score: 50, explanation: 'First' },
      }));

      // Save version 2
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-2',
        contentVersion: 2,
        tensionScore: { score: 75, explanation: 'Second' },
      }));

      const found = repo.findLatest('project-1', 'content-1');

      expect(found?.contentVersion).toBe(2);
      expect(found?.tensionScore.score).toBe(75);
    });
  });

  describe('findByVersion', () => {
    it('should find analysis for specific version', () => {
      const repo = createAnalysisRepository(db);

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        contentVersion: 1,
        tensionScore: { score: 50, explanation: 'First' },
      }));

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-2',
        contentVersion: 2,
        tensionScore: { score: 75, explanation: 'Second' },
      }));

      const found = repo.findByVersion('project-1', 'content-1', 1);

      expect(found?.contentVersion).toBe(1);
      expect(found?.tensionScore.score).toBe(50);
    });

    it('should return undefined for nonexistent version', () => {
      const repo = createAnalysisRepository(db);
      repo.save('project-1', createTestAnalysis({ contentVersion: 1 }));

      const found = repo.findByVersion('project-1', 'content-1', 99);

      expect(found).toBeUndefined();
    });
  });

  describe('findHistory', () => {
    it('should return analysis history in descending order', () => {
      const repo = createAnalysisRepository(db);

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        contentVersion: 1,
      }));
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-2',
        contentVersion: 2,
      }));
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-3',
        contentVersion: 3,
      }));

      const history = repo.findHistory('project-1', 'content-1');

      expect(history).toHaveLength(3);
      expect(history[0].contentVersion).toBe(3);
      expect(history[1].contentVersion).toBe(2);
      expect(history[2].contentVersion).toBe(1);
    });

    it('should return empty array when no history', () => {
      const repo = createAnalysisRepository(db);

      const history = repo.findHistory('project-1', 'nonexistent');

      expect(history).toHaveLength(0);
    });
  });

  describe('findByProject', () => {
    it('should find all analyses for project', () => {
      const repo = createAnalysisRepository(db);

      // Create second content
      createTestContent(db, 'content-2', 'project-1', 'structure-2');

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        contentId: 'content-1',
      }));
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-2',
        contentId: 'content-2',
      }));

      const all = repo.findByProject('project-1');

      expect(all).toHaveLength(2);
    });
  });

  describe('deleteByContent', () => {
    it('should delete all analyses for content', () => {
      const repo = createAnalysisRepository(db);

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        contentVersion: 1,
      }));
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-2',
        contentVersion: 2,
      }));

      const deleted = repo.deleteByContent('project-1', 'content-1');

      expect(deleted).toBe(2);
      expect(repo.findHistory('project-1', 'content-1')).toHaveLength(0);
    });
  });

  describe('deleteByProject', () => {
    it('should delete all analyses for project', () => {
      const repo = createAnalysisRepository(db);

      createTestContent(db, 'content-2', 'project-1', 'structure-2');

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        contentId: 'content-1',
      }));
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-2',
        contentId: 'content-2',
      }));

      const deleted = repo.deleteByProject('project-1');

      expect(deleted).toBe(2);
      expect(repo.findByProject('project-1')).toHaveLength(0);
    });
  });

  describe('aggregateForStructure', () => {
    it('should aggregate analyses for multiple content', () => {
      const repo = createAnalysisRepository(db);

      createTestContent(db, 'content-2', 'project-1', 'structure-2');
      createTestContent(db, 'content-3', 'project-1', 'structure-3');

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        contentId: 'content-1',
        tensionScore: { score: 60, explanation: '' },
        wordCount: 1000,
        readingTime: 5,
      }));
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-2',
        contentId: 'content-2',
        tensionScore: { score: 80, explanation: '' },
        wordCount: 2000,
        readingTime: 10,
      }));
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-3',
        contentId: 'content-3',
        tensionScore: { score: 70, explanation: '' },
        wordCount: 1500,
        readingTime: 7,
      }));

      const aggregated = repo.aggregateForStructure(
        'project-1',
        'arc-1',
        ['content-1', 'content-2', 'content-3']
      );

      expect(aggregated).toBeDefined();
      expect(aggregated?.averageTension).toBe(70); // (60 + 80 + 70) / 3
      expect(aggregated?.totalWordCount).toBe(4500);
      expect(aggregated?.totalReadingTime).toBe(22);
    });

    it('should aggregate character presence', () => {
      const repo = createAnalysisRepository(db);

      createTestContent(db, 'content-2', 'project-1', 'structure-2');

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        contentId: 'content-1',
        characterAppearances: [
          { characterId: 'char-1', type: 'pov', dialogueLines: 5 },
        ],
      }));
      repo.save('project-1', createTestAnalysis({
        id: 'analysis-2',
        contentId: 'content-2',
        characterAppearances: [
          { characterId: 'char-1', type: 'scene', dialogueLines: 3 },
          { characterId: 'char-2', type: 'pov', dialogueLines: 8 },
        ],
      }));

      const aggregated = repo.aggregateForStructure(
        'project-1',
        'arc-1',
        ['content-1', 'content-2']
      );

      expect(aggregated?.characterPresence['char-1'].appearances).toBe(2);
      expect(aggregated?.characterPresence['char-1'].povChapters).toBe(1);
      expect(aggregated?.characterPresence['char-2'].povChapters).toBe(1);
    });

    it('should count issues by severity', () => {
      const repo = createAnalysisRepository(db);

      const criticalIssue: ContinuityIssue = {
        id: 'issue-1',
        type: 'fact-contradiction',
        severity: 'critical',
        description: 'Critical issue',
        location: {},
        conflictsWith: { type: 'content', id: 'other' },
        reviewed: false,
        falsePositive: false,
      };

      const minorIssue: ContinuityIssue = {
        id: 'issue-2',
        type: 'character-voice',
        severity: 'minor',
        description: 'Minor issue',
        location: {},
        conflictsWith: { type: 'character', id: 'char-1' },
        reviewed: false,
        falsePositive: false,
      };

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        continuityIssues: [criticalIssue, minorIssue],
      }));

      const aggregated = repo.aggregateForStructure(
        'project-1',
        'arc-1',
        ['content-1']
      );

      expect(aggregated?.issuesBySeverity.critical).toBe(1);
      expect(aggregated?.issuesBySeverity.minor).toBe(1);
      expect(aggregated?.issuesBySeverity.major).toBe(0);
    });

    it('should return undefined for empty content list', () => {
      const repo = createAnalysisRepository(db);

      const aggregated = repo.aggregateForStructure('project-1', 'arc-1', []);

      expect(aggregated).toBeUndefined();
    });
  });

  describe('getIssuesBySeverity', () => {
    it('should find issues by severity', () => {
      const repo = createAnalysisRepository(db);

      const criticalIssue: ContinuityIssue = {
        id: 'issue-1',
        type: 'fact-contradiction',
        severity: 'critical',
        description: 'Critical issue',
        location: {},
        conflictsWith: { type: 'content', id: 'other' },
        reviewed: false,
        falsePositive: false,
      };

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        continuityIssues: [criticalIssue],
      }));

      const issues = repo.getIssuesBySeverity('project-1', 'critical');

      expect(issues).toHaveLength(1);
      expect(issues[0].issue.severity).toBe('critical');
    });

    it('should exclude false positives', () => {
      const repo = createAnalysisRepository(db);

      const falsePositiveIssue: ContinuityIssue = {
        id: 'issue-1',
        type: 'fact-contradiction',
        severity: 'critical',
        description: 'False positive',
        location: {},
        conflictsWith: { type: 'content', id: 'other' },
        reviewed: true,
        falsePositive: true,
      };

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        continuityIssues: [falsePositiveIssue],
      }));

      const issues = repo.getIssuesBySeverity('project-1', 'critical');

      expect(issues).toHaveLength(0);
    });
  });

  describe('markIssueReviewed', () => {
    it('should mark issue as reviewed', () => {
      const repo = createAnalysisRepository(db);

      const issue: ContinuityIssue = {
        id: 'issue-1',
        type: 'fact-contradiction',
        severity: 'critical',
        description: 'Test issue',
        location: {},
        conflictsWith: { type: 'content', id: 'other' },
        reviewed: false,
        falsePositive: false,
      };

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        continuityIssues: [issue],
      }));

      const result = repo.markIssueReviewed('project-1', 'content-1', 'issue-1', false);
      expect(result).toBe(true);

      const analysis = repo.findLatest('project-1', 'content-1');
      expect(analysis?.continuityIssues[0].reviewed).toBe(true);
      expect(analysis?.continuityIssues[0].falsePositive).toBe(false);
    });

    it('should mark issue as false positive', () => {
      const repo = createAnalysisRepository(db);

      const issue: ContinuityIssue = {
        id: 'issue-1',
        type: 'fact-contradiction',
        severity: 'critical',
        description: 'Test issue',
        location: {},
        conflictsWith: { type: 'content', id: 'other' },
        reviewed: false,
        falsePositive: false,
      };

      repo.save('project-1', createTestAnalysis({
        id: 'analysis-1',
        continuityIssues: [issue],
      }));

      repo.markIssueReviewed('project-1', 'content-1', 'issue-1', true);

      const analysis = repo.findLatest('project-1', 'content-1');
      expect(analysis?.continuityIssues[0].falsePositive).toBe(true);
    });

    it('should return false when content not found', () => {
      const repo = createAnalysisRepository(db);

      const result = repo.markIssueReviewed('project-1', 'nonexistent', 'issue-1', false);

      expect(result).toBe(false);
    });
  });
});
