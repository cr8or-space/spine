/**
 * Tests for continuity checking service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  analyzeContinuity,
  buildEntitySummaries,
  calculateSeverityDistribution,
  calculateTypeDistribution,
  collectChapters,
  continuityNeedsAttention,
  detectRecurringPatterns,
  generateContinuityWarnings,
  getChaptersWithCriticalIssues,
  getChaptersWithIssues,
  getContinuityAnalysisCompletion,
  getIssueResolutionRate,
  getIssuesBySeverity,
  getIssuesByType,
  getIssueSummaryBySeverity,
  getProblematicEntities,
  getUnanalyzedChapters,
  getUnreviewedIssues,
  DEFAULT_CONTINUITY_CONFIG,
  type ChapterContinuityData,
  type ContinuityAnalysisDependencies,
  type ContinuityAnalysisInput,
  type RecurringPattern,
} from './continuity';

import type { ContentAnalysis, ContinuityIssue, Structure } from '@repo/serial-types';

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

function createBookWithChapters(chapterCount: number): Structure {
  const chapters = Array.from({ length: chapterCount }, (_, i) =>
    createTestStructure({
      id: `chapter-${i + 1}`,
      title: `Chapter ${i + 1}`,
      order: i,
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
): ContinuityAnalysisDependencies {
  return {
    analysisRepository: {
      findLatest: vi.fn().mockImplementation((_, contentId) => analysisMap.get(contentId)),
      save: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      findByContent: vi.fn().mockReturnValue([]),
    } as unknown as ContinuityAnalysisDependencies['analysisRepository'],
    contentRepository: {
      findByStructure: vi.fn().mockImplementation((_, structureId) => {
        const content = contentMap.get(structureId);
        if (content) {
          return { id: content.id, structureId, text: 'Test content' };
        }
        return undefined;
      }),
    } as unknown as ContinuityAnalysisDependencies['contentRepository'],
  };
}

function createTestIssue(overrides: Partial<ContinuityIssue> = {}): ContinuityIssue {
  return {
    id: `issue-${Math.random().toString(36).substr(2, 9)}`,
    type: 'character-inconsistency',
    severity: 'minor',
    description: 'Test issue',
    location: { paragraphIndex: 0 },
    conflictsWith: {
      type: 'character',
      id: 'char-1',
    },
    reviewed: false,
    falsePositive: false,
    ...overrides,
  };
}

function createTestAnalysis(overrides: Partial<ContentAnalysis> = {}): ContentAnalysis {
  return {
    id: `analysis-${Math.random().toString(36).substr(2, 9)}`,
    contentId: 'content-1',
    contentVersion: 1,
    tensionScore: { score: 50, explanation: 'Average tension' },
    paceScore: { score: 60, explanation: 'Good pacing' },
    characterVoiceScores: {},
    continuityIssues: [],
    wordCount: 3000,
    readingTime: 15,
    characterAppearances: [],
    locationAppearances: [],
    threadTouches: [],
    analyzedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createChapterData(overrides: Partial<ChapterContinuityData> = {}): ChapterContinuityData {
  return {
    structureId: 'chapter-1',
    title: 'Test Chapter',
    position: 1,
    issues: [],
    issueCounts: { critical: 0, major: 0, minor: 0, nitpick: 0 },
    issuesByType: {
      'character-inconsistency': 0,
      'location-error': 0,
      'timeline-conflict': 0,
      'fact-contradiction': 0,
      'world-rule-violation': 0,
      'character-voice': 0,
      'relationship-error': 0,
      'other': 0,
    },
    characterMentions: [],
    locationMentions: [],
    hasContent: true,
    hasAnalysis: true,
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
  });

  it('should maintain reading order', () => {
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
});

describe('calculateTypeDistribution', () => {
  it('should calculate distribution correctly', () => {
    const issues: ContinuityIssue[] = [
      createTestIssue({ type: 'character-inconsistency' }),
      createTestIssue({ type: 'character-inconsistency' }),
      createTestIssue({ type: 'timeline-conflict' }),
      createTestIssue({ type: 'location-error' }),
    ];

    const dist = calculateTypeDistribution(issues);

    expect(dist.total).toBe(4);
    expect(dist.distribution['character-inconsistency']).toBe(2);
    expect(dist.distribution['timeline-conflict']).toBe(1);
    expect(dist.distribution['location-error']).toBe(1);
    expect(dist.mostCommon).toBe('character-inconsistency');
  });

  it('should identify types with no issues', () => {
    const issues: ContinuityIssue[] = [
      createTestIssue({ type: 'character-inconsistency' }),
    ];

    const dist = calculateTypeDistribution(issues);

    expect(dist.noIssues).toContain('timeline-conflict');
    expect(dist.noIssues).toContain('location-error');
    expect(dist.noIssues).not.toContain('character-inconsistency');
  });

  it('should handle empty issues', () => {
    const dist = calculateTypeDistribution([]);

    expect(dist.total).toBe(0);
    expect(dist.mostCommon).toBe('none');
  });
});

describe('calculateSeverityDistribution', () => {
  it('should calculate distribution correctly', () => {
    const issues: ContinuityIssue[] = [
      createTestIssue({ severity: 'critical' }),
      createTestIssue({ severity: 'critical' }),
      createTestIssue({ severity: 'major' }),
      createTestIssue({ severity: 'minor' }),
    ];

    const dist = calculateSeverityDistribution(issues);

    expect(dist.total).toBe(4);
    expect(dist.distribution.critical).toBe(2);
    expect(dist.distribution.major).toBe(1);
    expect(dist.distribution.minor).toBe(1);
    expect(dist.distribution.nitpick).toBe(0);
  });

  it('should calculate percentages correctly', () => {
    const issues: ContinuityIssue[] = [
      createTestIssue({ severity: 'critical' }),
      createTestIssue({ severity: 'minor' }),
    ];

    const dist = calculateSeverityDistribution(issues);

    expect(dist.percentages.critical).toBe(50);
    expect(dist.percentages.minor).toBe(50);
    expect(dist.percentages.major).toBe(0);
  });
});

describe('detectRecurringPatterns', () => {
  it('should detect recurring issues with same entity', () => {
    const chapterData: ChapterContinuityData[] = [
      createChapterData({
        structureId: 'ch-1',
        issues: [
          createTestIssue({
            type: 'character-inconsistency',
            conflictsWith: { type: 'character', id: 'char-1' },
          }),
        ],
      }),
      createChapterData({
        structureId: 'ch-2',
        issues: [
          createTestIssue({
            type: 'character-inconsistency',
            conflictsWith: { type: 'character', id: 'char-1' },
          }),
        ],
      }),
      createChapterData({
        structureId: 'ch-3',
        issues: [
          createTestIssue({
            type: 'character-inconsistency',
            conflictsWith: { type: 'character', id: 'char-1' },
          }),
        ],
      }),
    ];

    const patterns = detectRecurringPatterns(chapterData);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(patterns[0].type).toBe('character-inconsistency');
    expect(patterns[0].occurrences).toBe(3);
    expect(patterns[0].relatedEntities).toContain('char-1');
  });

  it('should not flag single occurrences', () => {
    const chapterData: ChapterContinuityData[] = [
      createChapterData({
        structureId: 'ch-1',
        issues: [
          createTestIssue({
            type: 'character-inconsistency',
            conflictsWith: { type: 'character', id: 'char-1' },
          }),
        ],
      }),
      createChapterData({
        structureId: 'ch-2',
        issues: [
          createTestIssue({
            type: 'timeline-conflict',
            conflictsWith: { type: 'timeline-event', id: 'event-1' },
          }),
        ],
      }),
    ];

    const patterns = detectRecurringPatterns(chapterData);

    expect(patterns).toHaveLength(0);
  });
});

describe('buildEntitySummaries', () => {
  it('should build summaries for entities with issues', () => {
    const issues: ContinuityIssue[] = [
      createTestIssue({
        type: 'character-inconsistency',
        conflictsWith: { type: 'character', id: 'char-1' },
      }),
      createTestIssue({
        type: 'character-voice',
        conflictsWith: { type: 'character', id: 'char-1' },
      }),
      createTestIssue({
        type: 'location-error',
        conflictsWith: { type: 'location', id: 'loc-1' },
      }),
    ];

    const chapterData: ChapterContinuityData[] = [
      createChapterData({
        structureId: 'ch-1',
        issues: [issues[0], issues[1]],
      }),
      createChapterData({
        structureId: 'ch-2',
        issues: [issues[2]],
      }),
    ];

    const summaries = buildEntitySummaries(issues, chapterData);

    expect(summaries).toHaveLength(2);

    const charSummary = summaries.find((s) => s.entityId === 'char-1');
    expect(charSummary).toBeDefined();
    expect(charSummary?.issueCount).toBe(2);
    expect(charSummary?.issueTypes).toContain('character-inconsistency');
    expect(charSummary?.issueTypes).toContain('character-voice');
  });

  it('should sort by issue count descending', () => {
    const issues: ContinuityIssue[] = [
      createTestIssue({ conflictsWith: { type: 'character', id: 'char-1' } }),
      createTestIssue({ conflictsWith: { type: 'character', id: 'char-2' } }),
      createTestIssue({ conflictsWith: { type: 'character', id: 'char-2' } }),
      createTestIssue({ conflictsWith: { type: 'character', id: 'char-2' } }),
    ];

    const chapterData: ChapterContinuityData[] = [
      createChapterData({ issues }),
    ];

    const summaries = buildEntitySummaries(issues, chapterData);

    expect(summaries[0].entityId).toBe('char-2');
    expect(summaries[0].issueCount).toBe(3);
  });
});

describe('generateContinuityWarnings', () => {
  const defaultTypeDistribution = calculateTypeDistribution([]);
  const defaultSeverityDistribution = calculateSeverityDistribution([]);

  it('should warn about high issue count', () => {
    const chapterData: ChapterContinuityData[] = [
      createChapterData({
        structureId: 'ch-1',
        issues: Array(6).fill(null).map(() => createTestIssue()),
      }),
    ];

    const warnings = generateContinuityWarnings(
      chapterData,
      chapterData.flatMap((c) => c.issues),
      calculateTypeDistribution(chapterData.flatMap((c) => c.issues)),
      calculateSeverityDistribution(chapterData.flatMap((c) => c.issues)),
      [],
      DEFAULT_CONTINUITY_CONFIG
    );

    const highCountWarning = warnings.find((w) => w.type === 'high-issue-count');
    expect(highCountWarning).toBeDefined();
  });

  it('should warn about critical issues', () => {
    const issues: ContinuityIssue[] = [
      createTestIssue({ severity: 'critical' }),
      createTestIssue({ severity: 'critical' }),
    ];

    const chapterData: ChapterContinuityData[] = [
      createChapterData({
        structureId: 'ch-1',
        issues,
        issueCounts: { critical: 2, major: 0, minor: 0, nitpick: 0 },
      }),
    ];

    const warnings = generateContinuityWarnings(
      chapterData,
      issues,
      calculateTypeDistribution(issues),
      calculateSeverityDistribution(issues),
      [],
      DEFAULT_CONTINUITY_CONFIG
    );

    const criticalWarning = warnings.find((w) => w.type === 'critical-issues');
    expect(criticalWarning).toBeDefined();
    expect(criticalWarning?.severity).toBe('critical');
  });

  it('should warn about unreviewed issues', () => {
    const issues: ContinuityIssue[] = [
      createTestIssue({ reviewed: false }),
      createTestIssue({ reviewed: false }),
      createTestIssue({ reviewed: true }),
    ];

    const chapterData: ChapterContinuityData[] = [
      createChapterData({ issues }),
    ];

    const warnings = generateContinuityWarnings(
      chapterData,
      issues,
      calculateTypeDistribution(issues),
      calculateSeverityDistribution(issues),
      [],
      DEFAULT_CONTINUITY_CONFIG
    );

    const unreviewedWarning = warnings.find((w) => w.type === 'unreviewed-issues');
    expect(unreviewedWarning).toBeDefined();
    expect(unreviewedWarning?.message).toContain('2');
  });

  it('should warn about recurring patterns', () => {
    const patterns: RecurringPattern[] = [
      {
        type: 'character-inconsistency',
        description: 'Recurring pattern',
        occurrences: 4,
        affectedStructures: ['ch-1', 'ch-2', 'ch-3', 'ch-4'],
        relatedEntities: ['char-1'],
      },
    ];

    const warnings = generateContinuityWarnings(
      [],
      [],
      defaultTypeDistribution,
      defaultSeverityDistribution,
      patterns,
      DEFAULT_CONTINUITY_CONFIG
    );

    const patternWarning = warnings.find((w) => w.type === 'recurring-pattern');
    expect(patternWarning).toBeDefined();
    expect(patternWarning?.severity).toBe('warning');
  });

  it('should warn about missing analysis', () => {
    const chapterData: ChapterContinuityData[] = [
      createChapterData({ hasContent: true, hasAnalysis: false, structureId: 'ch-1' }),
      createChapterData({ hasContent: true, hasAnalysis: true, structureId: 'ch-2' }),
    ];

    const warnings = generateContinuityWarnings(
      chapterData,
      [],
      defaultTypeDistribution,
      defaultSeverityDistribution,
      [],
      DEFAULT_CONTINUITY_CONFIG
    );

    const analysisWarning = warnings.find((w) => w.type === 'missing-analysis');
    expect(analysisWarning).toBeDefined();
  });
});

describe('analyzeContinuity', () => {
  it('should generate complete analysis report', () => {
    const book = createBookWithChapters(3);
    const input: ContinuityAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({
        contentId: 'content-1',
        continuityIssues: [createTestIssue({ severity: 'minor' })],
      })],
      ['content-2', createTestAnalysis({
        contentId: 'content-2',
        continuityIssues: [],
      })],
      ['content-3', createTestAnalysis({
        contentId: 'content-3',
        continuityIssues: [createTestIssue({ severity: 'major' })],
      })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    const report = analyzeContinuity(input, deps);

    expect(report.summary.structureId).toBe('book-1');
    expect(report.summary.totalChapters).toBe(3);
    expect(report.summary.chaptersAnalyzed).toBe(3);
    expect(report.summary.totalIssues).toBe(2);
    expect(report.chapterData).toHaveLength(3);
    expect(report.generatedAt).toBeDefined();
  });

  it('should calculate overall score based on issues', () => {
    const book = createBookWithChapters(2);
    const input: ContinuityAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
    ]);

    // Chapter with no issues should have high score
    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', continuityIssues: [] })],
      ['content-2', createTestAnalysis({
        contentId: 'content-2',
        continuityIssues: [
          createTestIssue({ severity: 'critical' }),
          createTestIssue({ severity: 'critical' }),
        ],
      })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    const report = analyzeContinuity(input, deps);

    // Chapter with no issues has score 100
    // Chapter with 2 critical issues: 100 - (2 * 10 * 3) = 40
    // Average: (100 + 40) / 2 = 70
    expect(report.summary.overallScore).toBeLessThan(100);
  });

  it('should filter issues based on config', () => {
    const book = createBookWithChapters(1);
    const input: ContinuityAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({
        contentId: 'content-1',
        continuityIssues: [
          createTestIssue({ reviewed: false }),
          createTestIssue({ reviewed: true }),
          createTestIssue({ falsePositive: true }),
        ],
      })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);

    // Default config excludes reviewed and false positives
    const report = analyzeContinuity(input, deps);
    expect(report.summary.totalIssues).toBe(1);

    // Include all issues
    const reportWithAll = analyzeContinuity(input, deps, {
      includeReviewed: true,
      includeFalsePositives: true,
    });
    expect(reportWithAll.summary.totalIssues).toBe(3);
  });

  it('should handle chapters without analysis', () => {
    const book = createBookWithChapters(2);
    const input: ContinuityAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1' })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    const report = analyzeContinuity(input, deps);

    expect(report.summary.chaptersAnalyzed).toBe(1);
    expect(report.warnings.some((w) => w.type === 'missing-analysis')).toBe(true);
  });
});

describe('utility functions', () => {
  let sampleReport: ReturnType<typeof analyzeContinuity>;

  beforeEach(() => {
    const book = createBookWithChapters(4);
    const input: ContinuityAnalysisInput = {
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
      ['content-1', createTestAnalysis({
        contentId: 'content-1',
        continuityIssues: [
          createTestIssue({ id: 'issue-1', severity: 'critical', type: 'character-inconsistency', reviewed: false }),
        ],
      })],
      ['content-2', createTestAnalysis({
        contentId: 'content-2',
        continuityIssues: [
          createTestIssue({ id: 'issue-2', severity: 'minor', type: 'timeline-conflict', reviewed: true }),
        ],
      })],
      ['content-3', createTestAnalysis({
        contentId: 'content-3',
        continuityIssues: [],
      })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    sampleReport = analyzeContinuity(input, deps, { includeReviewed: true });
  });

  describe('getChaptersWithIssues', () => {
    it('should return chapters with any issues', () => {
      const chaptersWithIssues = getChaptersWithIssues(sampleReport);

      expect(chaptersWithIssues).toHaveLength(2);
      expect(chaptersWithIssues.map((c) => c.structureId)).toContain('chapter-1');
      expect(chaptersWithIssues.map((c) => c.structureId)).toContain('chapter-2');
    });
  });

  describe('getChaptersWithCriticalIssues', () => {
    it('should return only chapters with critical issues', () => {
      const criticalChapters = getChaptersWithCriticalIssues(sampleReport);

      expect(criticalChapters).toHaveLength(1);
      expect(criticalChapters[0].structureId).toBe('chapter-1');
    });
  });

  describe('getIssuesBySeverity', () => {
    it('should filter issues by severity', () => {
      const criticalIssues = getIssuesBySeverity(sampleReport, 'critical');
      const minorIssues = getIssuesBySeverity(sampleReport, 'minor');

      expect(criticalIssues).toHaveLength(1);
      expect(minorIssues).toHaveLength(1);
    });
  });

  describe('getIssuesByType', () => {
    it('should filter issues by type', () => {
      const charIssues = getIssuesByType(sampleReport, 'character-inconsistency');
      const timelineIssues = getIssuesByType(sampleReport, 'timeline-conflict');

      expect(charIssues).toHaveLength(1);
      expect(timelineIssues).toHaveLength(1);
    });
  });

  describe('getUnreviewedIssues', () => {
    it('should return only unreviewed issues', () => {
      const unreviewed = getUnreviewedIssues(sampleReport);

      expect(unreviewed).toHaveLength(1);
      expect(unreviewed[0].id).toBe('issue-1');
    });
  });

  describe('getUnanalyzedChapters', () => {
    it('should return chapters with content but no analysis', () => {
      const unanalyzed = getUnanalyzedChapters(sampleReport);

      expect(unanalyzed).toHaveLength(1);
      expect(unanalyzed[0].structureId).toBe('chapter-4');
    });
  });

  describe('continuityNeedsAttention', () => {
    it('should return true when there are warning-level issues', () => {
      // Create a report with warning-level issues (>= criticalThreshold critical issues)
      const book = createBookWithChapters(3);
      const input: ContinuityAnalysisInput = {
        projectId: 'project-1',
        rootStructure: book,
      };

      const contentMap = new Map<string, { id: string; structureId: string }>([
        ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
        ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
        ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
      ]);

      // Multiple critical issues should trigger 'critical-issues' warning
      const analysisMap = new Map<string, ContentAnalysis>([
        ['content-1', createTestAnalysis({
          contentId: 'content-1',
          continuityIssues: [
            createTestIssue({ id: 'issue-1', severity: 'critical', type: 'character-inconsistency', reviewed: false }),
            createTestIssue({ id: 'issue-2', severity: 'critical', type: 'timeline-conflict', reviewed: false }),
          ],
        })],
        ['content-2', createTestAnalysis({
          contentId: 'content-2',
          continuityIssues: [
            createTestIssue({ id: 'issue-3', severity: 'critical', type: 'location-error', reviewed: false }),
          ],
        })],
        ['content-3', createTestAnalysis({
          contentId: 'content-3',
          continuityIssues: [],
        })],
      ]);

      const deps = createMockDependencies(analysisMap, contentMap);
      const reportWithWarnings = analyzeContinuity(input, deps);

      expect(continuityNeedsAttention(reportWithWarnings)).toBe(true);
    });
  });

  describe('getContinuityAnalysisCompletion', () => {
    it('should calculate completion percentage', () => {
      const completion = getContinuityAnalysisCompletion(sampleReport);

      expect(completion).toBe(75); // 3 out of 4
    });
  });

  describe('getIssueSummaryBySeverity', () => {
    it('should return summary for all severities', () => {
      const summary = getIssueSummaryBySeverity(sampleReport);

      expect(summary).toHaveLength(4);
      expect(summary.every((s) => typeof s.count === 'number')).toBe(true);
      expect(summary.every((s) => typeof s.percentage === 'number')).toBe(true);
    });
  });

  describe('getProblematicEntities', () => {
    it('should return entities with most issues', () => {
      const entities = getProblematicEntities(sampleReport, 5);

      expect(entities.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getIssueResolutionRate', () => {
    it('should calculate resolution rate', () => {
      const rate = getIssueResolutionRate(sampleReport);

      // 1 reviewed out of 2 total = 50%
      expect(rate).toBe(50);
    });

    it('should return 100% for no issues', () => {
      const book = createBookWithChapters(1);
      const input: ContinuityAnalysisInput = {
        projectId: 'project-1',
        rootStructure: book,
      };

      const contentMap = new Map<string, { id: string; structureId: string }>([
        ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ]);

      const analysisMap = new Map<string, ContentAnalysis>([
        ['content-1', createTestAnalysis({ contentId: 'content-1', continuityIssues: [] })],
      ]);

      const deps = createMockDependencies(analysisMap, contentMap);
      const report = analyzeContinuity(input, deps);

      expect(getIssueResolutionRate(report)).toBe(100);
    });
  });
});
