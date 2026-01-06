/**
 * Tests for pacing assessment service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  analyzePacing,
  calculatePacingTrend,
  calculateProfileDistribution,
  calculateSegmentDistribution,
  collectChapters,
  detectConsecutivePatterns,
  determineProfile,
  estimateTotalReadingTime,
  generatePacingWarnings,
  getAverageWordsPerMinute,
  getChaptersByProfile,
  getFastPacedChapters,
  getPacingAnalysisCompletion,
  getProfileSummary,
  getSlowPacedChapters,
  getUnanalyzedChapters,
  pacingNeedsAttention,
  DEFAULT_PACING_CONFIG,
  type ChapterPacingData,
  type ConsecutivePacingPattern,
  type PacingAnalysisDependencies,
  type PacingAnalysisInput,
  type PacingProfileDistribution,
  type PacingSegmentDistribution,
} from './pacing';

import type { ContentAnalysis, Structure } from '@repo/serial-types';
import type { PacingSegment } from './types';

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
): PacingAnalysisDependencies {
  return {
    analysisRepository: {
      findLatest: vi.fn().mockImplementation((_, contentId) => analysisMap.get(contentId)),
      save: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      findByContent: vi.fn().mockReturnValue([]),
    } as unknown as PacingAnalysisDependencies['analysisRepository'],
    contentRepository: {
      findByStructure: vi.fn().mockImplementation((_, structureId) => {
        const content = contentMap.get(structureId);
        if (content) {
          return { id: content.id, structureId, text: 'Test content' };
        }
        return undefined;
      }),
    } as unknown as PacingAnalysisDependencies['contentRepository'],
  };
}

function createTestAnalysis(overrides: Partial<ContentAnalysis> = {}): ContentAnalysis {
  return {
    id: `analysis-${Math.random().toString(36).substr(2, 9)}`,
    contentId: 'content-1',
    contentVersion: 1,
    tensionScore: { score: 50, explanation: 'Average tension' },
    paceScore: { score: 60, explanation: 'Good pacing with variety' },
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

function createChapterData(overrides: Partial<ChapterPacingData> = {}): ChapterPacingData {
  return {
    structureId: 'chapter-1',
    title: 'Test Chapter',
    position: 1,
    pacingScore: 60,
    profile: 'moderate',
    segments: [],
    wordCount: 3000,
    readingTime: 15,
    hasContent: true,
    hasAnalysis: true,
    ...overrides,
  };
}

function createSegment(overrides: Partial<PacingSegment> = {}): PacingSegment {
  return {
    startPosition: 0,
    endPosition: 30,
    type: 'dialogue',
    speed: 'moderate',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('determineProfile', () => {
  it('should return fast for mostly fast segments', () => {
    const segments: PacingSegment[] = [
      createSegment({ startPosition: 0, endPosition: 60, speed: 'fast' }),
      createSegment({ startPosition: 60, endPosition: 100, speed: 'moderate' }),
    ];

    expect(determineProfile(segments)).toBe('fast');
  });

  it('should return slow for mostly slow segments', () => {
    const segments: PacingSegment[] = [
      createSegment({ startPosition: 0, endPosition: 70, speed: 'slow' }),
      createSegment({ startPosition: 70, endPosition: 100, speed: 'moderate' }),
    ];

    expect(determineProfile(segments)).toBe('slow');
  });

  it('should return moderate for balanced segments', () => {
    const segments: PacingSegment[] = [
      createSegment({ startPosition: 0, endPosition: 33, speed: 'fast' }),
      createSegment({ startPosition: 33, endPosition: 66, speed: 'moderate' }),
      createSegment({ startPosition: 66, endPosition: 100, speed: 'slow' }),
    ];

    expect(determineProfile(segments)).toBe('varied');
  });

  it('should return moderate for empty segments', () => {
    expect(determineProfile([])).toBe('moderate');
  });
});

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

describe('calculateProfileDistribution', () => {
  it('should calculate distribution correctly', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ profile: 'fast' }),
      createChapterData({ profile: 'fast' }),
      createChapterData({ profile: 'moderate' }),
      createChapterData({ profile: 'slow' }),
    ];

    const dist = calculateProfileDistribution(chapterData);

    expect(dist.total).toBe(4);
    expect(dist.distribution.fast).toBe(2);
    expect(dist.distribution.moderate).toBe(1);
    expect(dist.distribution.slow).toBe(1);
    expect(dist.mostCommon).toBe('fast');
  });

  it('should identify unused profiles', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ profile: 'moderate' }),
      createChapterData({ profile: 'moderate' }),
    ];

    const dist = calculateProfileDistribution(chapterData);

    expect(dist.unused).toContain('fast');
    expect(dist.unused).toContain('slow');
    expect(dist.unused).toContain('varied');
    expect(dist.unused).not.toContain('moderate');
  });

  it('should handle empty data', () => {
    const dist = calculateProfileDistribution([]);

    expect(dist.total).toBe(0);
    expect(dist.mostCommon).toBe('moderate');
  });
});

describe('calculateSegmentDistribution', () => {
  it('should calculate segment distribution', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({
        segments: [
          createSegment({ type: 'dialogue', startPosition: 0, endPosition: 50 }),
          createSegment({ type: 'action', startPosition: 50, endPosition: 100 }),
        ],
      }),
    ];

    const dist = calculateSegmentDistribution(chapterData);

    expect(dist.totalSegments).toBe(2);
    expect(dist.distribution.dialogue).toBe(50);
    expect(dist.distribution.action).toBe(50);
  });

  it('should identify dominant segment type', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({
        segments: [
          createSegment({ type: 'dialogue', startPosition: 0, endPosition: 80 }),
          createSegment({ type: 'action', startPosition: 80, endPosition: 100 }),
        ],
      }),
    ];

    const dist = calculateSegmentDistribution(chapterData);

    expect(dist.dominant).toBe('dialogue');
  });

  it('should handle chapters with no segments', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ segments: [] }),
    ];

    const dist = calculateSegmentDistribution(chapterData);

    expect(dist.totalSegments).toBe(0);
  });
});

describe('calculatePacingTrend', () => {
  it('should detect speeding up trend', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ pacingScore: 40, position: 1 }),
      createChapterData({ pacingScore: 55, position: 2 }),
      createChapterData({ pacingScore: 70, position: 3 }),
      createChapterData({ pacingScore: 85, position: 4 }),
    ];

    const trend = calculatePacingTrend(chapterData);

    expect(trend.direction).toBe('speeding-up');
    expect(trend.slope).toBeGreaterThan(0);
  });

  it('should detect slowing down trend', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ pacingScore: 85, position: 1 }),
      createChapterData({ pacingScore: 70, position: 2 }),
      createChapterData({ pacingScore: 55, position: 3 }),
      createChapterData({ pacingScore: 40, position: 4 }),
    ];

    const trend = calculatePacingTrend(chapterData);

    expect(trend.direction).toBe('slowing-down');
    expect(trend.slope).toBeLessThan(0);
  });

  it('should detect stable trend', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ pacingScore: 60, position: 1 }),
      createChapterData({ pacingScore: 62, position: 2 }),
      createChapterData({ pacingScore: 58, position: 3 }),
      createChapterData({ pacingScore: 61, position: 4 }),
    ];

    const trend = calculatePacingTrend(chapterData);

    expect(trend.direction).toBe('stable');
  });

  it('should detect varied pacing', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ pacingScore: 30, position: 1 }),
      createChapterData({ pacingScore: 80, position: 2 }),
      createChapterData({ pacingScore: 40, position: 3 }),
      createChapterData({ pacingScore: 90, position: 4 }),
    ];

    const trend = calculatePacingTrend(chapterData);

    expect(trend.direction).toBe('varied');
  });

  it('should calculate average correctly', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ pacingScore: 40 }),
      createChapterData({ pacingScore: 60 }),
      createChapterData({ pacingScore: 80 }),
    ];

    const trend = calculatePacingTrend(chapterData);

    expect(trend.average).toBe(60);
    expect(trend.min).toBe(40);
    expect(trend.max).toBe(80);
  });
});

describe('detectConsecutivePatterns', () => {
  it('should detect consecutive same profile', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ profile: 'slow', position: 1, structureId: 'ch-1' }),
      createChapterData({ profile: 'slow', position: 2, structureId: 'ch-2' }),
      createChapterData({ profile: 'slow', position: 3, structureId: 'ch-3' }),
      createChapterData({ profile: 'slow', position: 4, structureId: 'ch-4' }),
      createChapterData({ profile: 'fast', position: 5, structureId: 'ch-5' }),
    ];

    const patterns = detectConsecutivePatterns(chapterData, 4);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].profile).toBe('slow');
    expect(patterns[0].count).toBe(4);
    expect(patterns[0].structureIds).toEqual(['ch-1', 'ch-2', 'ch-3', 'ch-4']);
  });

  it('should not flag streaks below threshold', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ profile: 'slow', position: 1 }),
      createChapterData({ profile: 'slow', position: 2 }),
      createChapterData({ profile: 'slow', position: 3 }),
      createChapterData({ profile: 'fast', position: 4 }),
    ];

    const patterns = detectConsecutivePatterns(chapterData, 4);

    expect(patterns).toHaveLength(0);
  });
});

describe('generatePacingWarnings', () => {
  const defaultProfileDist: PacingProfileDistribution = {
    total: 10,
    distribution: { fast: 3, moderate: 4, slow: 2, varied: 1 },
    mostCommon: 'moderate',
    unused: [],
  };

  const defaultSegmentDist: PacingSegmentDistribution = {
    totalSegments: 30,
    distribution: { action: 100, dialogue: 100, description: 50, introspection: 30, transition: 20 },
    percentages: { action: 33, dialogue: 33, description: 17, introspection: 10, transition: 7 },
    dominant: 'action',
    underRepresented: [],
  };

  it('should warn about slow pacing', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ pacingScore: 25, structureId: 'ch-1' }),
      createChapterData({ pacingScore: 30, structureId: 'ch-2' }),
      createChapterData({ pacingScore: 70, structureId: 'ch-3' }),
    ];

    const warnings = generatePacingWarnings(
      chapterData,
      defaultProfileDist,
      defaultSegmentDist,
      [],
      DEFAULT_PACING_CONFIG
    );

    const slowWarning = warnings.find((w) => w.type === 'too-slow');
    expect(slowWarning).toBeDefined();
    expect(slowWarning?.affectedStructures).toHaveLength(2);
  });

  it('should warn about monotonous pacing', () => {
    const monotonousDist: PacingProfileDistribution = {
      total: 10,
      distribution: { fast: 0, moderate: 9, slow: 1, varied: 0 },
      mostCommon: 'moderate',
      unused: ['fast', 'varied'],
    };

    const chapterData = Array(10).fill(null).map((_, i) =>
      createChapterData({ profile: 'moderate', structureId: `ch-${i}` })
    );

    const warnings = generatePacingWarnings(
      chapterData,
      monotonousDist,
      defaultSegmentDist,
      [],
      DEFAULT_PACING_CONFIG
    );

    const monoWarning = warnings.find((w) => w.type === 'monotonous');
    expect(monoWarning).toBeDefined();
  });

  it('should warn about consecutive same pacing', () => {
    const patterns: ConsecutivePacingPattern[] = [
      {
        profile: 'slow',
        startPosition: 1,
        endPosition: 5,
        count: 5,
        structureIds: ['ch-1', 'ch-2', 'ch-3', 'ch-4', 'ch-5'],
      },
    ];

    const warnings = generatePacingWarnings(
      [],
      defaultProfileDist,
      defaultSegmentDist,
      patterns,
      DEFAULT_PACING_CONFIG
    );

    const consWarning = warnings.find((w) => w.type === 'consecutive-same');
    expect(consWarning).toBeDefined();
    expect(consWarning?.severity).toBe('warning');
  });

  it('should warn about missing analysis', () => {
    const chapterData: ChapterPacingData[] = [
      createChapterData({ hasContent: true, hasAnalysis: false, structureId: 'ch-1' }),
      createChapterData({ hasContent: true, hasAnalysis: true, structureId: 'ch-2' }),
    ];

    const warnings = generatePacingWarnings(
      chapterData,
      defaultProfileDist,
      defaultSegmentDist,
      [],
      DEFAULT_PACING_CONFIG
    );

    const analysisWarning = warnings.find((w) => w.type === 'missing-analysis');
    expect(analysisWarning).toBeDefined();
  });
});

describe('analyzePacing', () => {
  it('should generate complete analysis report', () => {
    const book = createBookWithChapters(3);
    const input: PacingAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', paceScore: { score: 50, explanation: 'Moderate' }, wordCount: 3000, readingTime: 15 })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', paceScore: { score: 70, explanation: 'Fast' }, wordCount: 2500, readingTime: 12 })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', paceScore: { score: 60, explanation: 'Good' }, wordCount: 3500, readingTime: 18 })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    const report = analyzePacing(input, deps);

    expect(report.summary.structureId).toBe('book-1');
    expect(report.summary.totalChapters).toBe(3);
    expect(report.summary.chaptersAnalyzed).toBe(3);
    expect(report.chapterData).toHaveLength(3);
    expect(report.generatedAt).toBeDefined();
  });

  it('should calculate total word count and reading time', () => {
    const book = createBookWithChapters(3);
    const input: PacingAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', wordCount: 3000, readingTime: 15 })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', wordCount: 2500, readingTime: 12 })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', wordCount: 3500, readingTime: 18 })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    const report = analyzePacing(input, deps);

    expect(report.summary.totalWordCount).toBe(9000);
    expect(report.summary.totalReadingTime).toBe(45);
  });

  it('should handle chapters without analysis', () => {
    const book = createBookWithChapters(2);
    const input: PacingAnalysisInput = {
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
    const report = analyzePacing(input, deps);

    expect(report.summary.chaptersAnalyzed).toBe(1);
    expect(report.warnings.some((w) => w.type === 'missing-analysis')).toBe(true);
  });
});

describe('utility functions', () => {
  let sampleReport: ReturnType<typeof analyzePacing>;

  beforeEach(() => {
    const book = createBookWithChapters(4);
    const input: PacingAnalysisInput = {
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
      ['content-1', createTestAnalysis({ contentId: 'content-1', paceScore: { score: 30, explanation: 'Slow' }, wordCount: 4000, readingTime: 20 })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', paceScore: { score: 60, explanation: 'Moderate' }, wordCount: 3000, readingTime: 15 })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', paceScore: { score: 85, explanation: 'Fast' }, wordCount: 2000, readingTime: 10 })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    sampleReport = analyzePacing(input, deps);
  });

  describe('getSlowPacedChapters', () => {
    it('should return chapters below threshold', () => {
      const slow = getSlowPacedChapters(sampleReport, 40);
      expect(slow).toHaveLength(1);
      expect(slow[0].structureId).toBe('chapter-1');
    });
  });

  describe('getFastPacedChapters', () => {
    it('should return chapters above threshold', () => {
      const fast = getFastPacedChapters(sampleReport, 80);
      expect(fast).toHaveLength(1);
      expect(fast[0].structureId).toBe('chapter-3');
    });
  });

  describe('getChaptersByProfile', () => {
    it('should return chapters with specific profile', () => {
      const slow = getChaptersByProfile(sampleReport, 'slow');
      expect(slow.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getUnanalyzedChapters', () => {
    it('should return chapters with content but no analysis', () => {
      const unanalyzed = getUnanalyzedChapters(sampleReport);
      expect(unanalyzed).toHaveLength(1);
      expect(unanalyzed[0].structureId).toBe('chapter-4');
    });
  });

  describe('pacingNeedsAttention', () => {
    it('should return true when there are warnings', () => {
      // Create a report with warning-level issues (>2 slow chapters)
      const book = createBookWithChapters(5);
      const input: PacingAnalysisInput = {
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

      // Multiple slow chapters should trigger warning-level 'too-slow'
      const analysisMap = new Map<string, ContentAnalysis>([
        ['content-1', createTestAnalysis({ contentId: 'content-1', paceScore: { score: 20, explanation: 'Very slow' }, wordCount: 5000, readingTime: 25 })],
        ['content-2', createTestAnalysis({ contentId: 'content-2', paceScore: { score: 25, explanation: 'Slow' }, wordCount: 4500, readingTime: 22 })],
        ['content-3', createTestAnalysis({ contentId: 'content-3', paceScore: { score: 30, explanation: 'Slow' }, wordCount: 4000, readingTime: 20 })],
        ['content-4', createTestAnalysis({ contentId: 'content-4', paceScore: { score: 60, explanation: 'Moderate' }, wordCount: 3000, readingTime: 15 })],
        ['content-5', createTestAnalysis({ contentId: 'content-5', paceScore: { score: 70, explanation: 'Good' }, wordCount: 2500, readingTime: 12 })],
      ]);

      const deps = createMockDependencies(analysisMap, contentMap);
      const reportWithWarnings = analyzePacing(input, deps);

      expect(pacingNeedsAttention(reportWithWarnings)).toBe(true);
    });
  });

  describe('getPacingAnalysisCompletion', () => {
    it('should calculate completion percentage', () => {
      const completion = getPacingAnalysisCompletion(sampleReport);
      expect(completion).toBe(75); // 3 out of 4
    });
  });

  describe('getProfileSummary', () => {
    it('should return summary for all profiles', () => {
      const summary = getProfileSummary(sampleReport);

      expect(summary).toHaveLength(4);
      expect(summary.every((s) => typeof s.count === 'number')).toBe(true);
      expect(summary.every((s) => typeof s.percentage === 'number')).toBe(true);
    });
  });

  describe('getAverageWordsPerMinute', () => {
    it('should calculate words per minute', () => {
      const wpm = getAverageWordsPerMinute(sampleReport);

      expect(wpm).toBeGreaterThan(0);
      expect(wpm).toBe(sampleReport.summary.totalWordCount / sampleReport.summary.totalReadingTime);
    });
  });

  describe('estimateTotalReadingTime', () => {
    it('should format reading time correctly', () => {
      const estimate = estimateTotalReadingTime(sampleReport);

      expect(estimate.minutes).toBe(sampleReport.summary.totalReadingTime);
      expect(typeof estimate.formatted).toBe('string');
    });

    it('should format hours correctly', () => {
      // Modify the report to have more reading time
      const longReport = { ...sampleReport };
      longReport.summary = { ...longReport.summary, totalReadingTime: 150 };

      const estimate = estimateTotalReadingTime(longReport);

      expect(estimate.hours).toBe(2);
      expect(estimate.formatted).toContain('h');
    });
  });
});
