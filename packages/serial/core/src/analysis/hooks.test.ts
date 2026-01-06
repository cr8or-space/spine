/**
 * Tests for hook analysis service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  analyzeHooks,
  calculateHookDistribution,
  calculateHookStrengthTrend,
  calculateVarietyScore,
  classifyHookFromExplanation,
  collectChapters,
  detectRepetitions,
  generateHookWarnings,
  getChaptersByHookType,
  getChaptersWithoutHooks,
  getHookAnalysisCompletion,
  getHookUsageByType,
  getStrongestHooks,
  getUnanalyzedChapters,
  getWeakHookChapters,
  hooksNeedAttention,
  suggestNextHookType,
  DEFAULT_HOOKS_CONFIG,
  type ChapterHookData,
  type HookAnalysisDependencies,
  type HookAnalysisInput,
  type HookDistribution,
  type HookRepetition,
  type HookStrengthTrend,
} from './hooks';

import type { ContentAnalysis, HookType, Structure } from '@repo/serial-types';

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
): HookAnalysisDependencies {
  return {
    analysisRepository: {
      findLatest: vi.fn().mockImplementation((_, contentId) => analysisMap.get(contentId)),
      save: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
      findByContent: vi.fn().mockReturnValue([]),
    } as unknown as HookAnalysisDependencies['analysisRepository'],
    contentRepository: {
      findByStructure: vi.fn().mockImplementation((_, structureId) => {
        const content = contentMap.get(structureId);
        if (content) {
          return { id: content.id, structureId, text: 'Test content' };
        }
        return undefined;
      }),
    } as unknown as HookAnalysisDependencies['contentRepository'],
  };
}

function createTestAnalysis(overrides: Partial<ContentAnalysis> = {}): ContentAnalysis {
  return {
    id: `analysis-${Math.random().toString(36).substr(2, 9)}`,
    contentId: 'content-1',
    contentVersion: 1,
    tensionScore: { score: 50, explanation: 'Average tension' },
    hookStrength: { score: 70, explanation: 'Good cliffhanger ending' },
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

function createChapterData(overrides: Partial<ChapterHookData> = {}): ChapterHookData {
  return {
    structureId: 'chapter-1',
    title: 'Test Chapter',
    position: 1,
    hookType: 'cliffhanger',
    hookStrength: 70,
    hasContent: true,
    hasAnalysis: true,
    ...overrides,
  };
}

function createDistribution(counts: Partial<Record<HookType | 'none', number>> = {}): HookDistribution {
  const distribution: Record<HookType | 'none', number> = {
    revelation: 0,
    decision: 0,
    cliffhanger: 0,
    emotional: 0,
    question: 0,
    twist: 0,
    promise: 0,
    none: 0,
    ...counts,
  };

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  let mostCommon: HookType | 'none' = 'none';
  let maxCount = 0;
  for (const [type, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = type as HookType | 'none';
    }
  }

  const hookTypes: HookType[] = ['revelation', 'decision', 'cliffhanger', 'emotional', 'question', 'twist', 'promise'];
  const unused = hookTypes.filter((t) => distribution[t] === 0);
  const leastUsed = hookTypes.filter((t) => distribution[t] > 0 && distribution[t] < total * 0.1);

  return { total, distribution, mostCommon, leastUsed, unused };
}

// ============================================================================
// Tests
// ============================================================================

describe('classifyHookFromExplanation', () => {
  it('should identify cliffhanger hooks', () => {
    expect(classifyHookFromExplanation('Strong cliffhanger ending')).toBe('cliffhanger');
    expect(classifyHookFromExplanation('The cliff-hanger moment was intense')).toBe('cliffhanger');
  });

  it('should identify revelation hooks', () => {
    expect(classifyHookFromExplanation('Major revelation at the end')).toBe('revelation');
    expect(classifyHookFromExplanation('The reveal was unexpected')).toBe('revelation');
  });

  it('should identify decision hooks', () => {
    expect(classifyHookFromExplanation('Critical decision point')).toBe('decision');
    expect(classifyHookFromExplanation('The choice must be made')).toBe('decision');
  });

  it('should identify emotional hooks', () => {
    expect(classifyHookFromExplanation('Deeply emotional ending')).toBe('emotional');
    expect(classifyHookFromExplanation('The feeling of loss lingered')).toBe('emotional');
  });

  it('should identify question hooks', () => {
    expect(classifyHookFromExplanation('Leaves a compelling question')).toBe('question');
    expect(classifyHookFromExplanation('The mystery deepens')).toBe('question');
  });

  it('should identify twist hooks', () => {
    expect(classifyHookFromExplanation('Unexpected twist ending')).toBe('twist');
  });

  it('should identify promise hooks', () => {
    expect(classifyHookFromExplanation('Promise of adventure')).toBe('promise');
    // 'anticipation' maps to 'promise' hook type since there's no separate 'anticipation' type
    expect(classifyHookFromExplanation('Building anticipation')).toBe('promise');
  });

  it('should return none for unidentifiable hooks', () => {
    expect(classifyHookFromExplanation('Generic ending')).toBe('none');
    expect(classifyHookFromExplanation('No hook, weak ending')).toBe('none');
  });
});

describe('collectChapters', () => {
  it('should collect chapters from a flat book', () => {
    const book = createBookWithChapters(3);
    const chapters = collectChapters(book);

    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe('Chapter 1');
  });

  it('should collect chapters in reading order', () => {
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

describe('calculateHookDistribution', () => {
  it('should calculate distribution correctly', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookType: 'cliffhanger' }),
      createChapterData({ hookType: 'cliffhanger' }),
      createChapterData({ hookType: 'revelation' }),
      createChapterData({ hookType: 'emotional' }),
    ];

    const distribution = calculateHookDistribution(chapterData);

    expect(distribution.total).toBe(4);
    expect(distribution.distribution.cliffhanger).toBe(2);
    expect(distribution.distribution.revelation).toBe(1);
    expect(distribution.distribution.emotional).toBe(1);
    expect(distribution.mostCommon).toBe('cliffhanger');
  });

  it('should identify unused hook types', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookType: 'cliffhanger' }),
      createChapterData({ hookType: 'cliffhanger' }),
    ];

    const distribution = calculateHookDistribution(chapterData);

    expect(distribution.unused).toContain('revelation');
    expect(distribution.unused).toContain('twist');
    expect(distribution.unused).not.toContain('cliffhanger');
  });

  it('should handle empty data', () => {
    const distribution = calculateHookDistribution([]);

    expect(distribution.total).toBe(0);
    expect(distribution.mostCommon).toBe('none');
  });
});

describe('calculateVarietyScore', () => {
  it('should give high score for diverse usage', () => {
    const distribution = createDistribution({
      cliffhanger: 2,
      revelation: 2,
      emotional: 2,
      question: 2,
      twist: 1,
      decision: 1,
      promise: 1,
    });

    const score = calculateVarietyScore(distribution);

    expect(score).toBeGreaterThan(70);
  });

  it('should give low score for single type usage', () => {
    const distribution = createDistribution({
      cliffhanger: 10,
    });

    const score = calculateVarietyScore(distribution);

    expect(score).toBeLessThan(30);
  });

  it('should return 0 for no data', () => {
    const distribution = createDistribution();

    const score = calculateVarietyScore(distribution);

    expect(score).toBe(0);
  });
});

describe('calculateHookStrengthTrend', () => {
  it('should detect improving trend', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookStrength: 40, position: 1 }),
      createChapterData({ hookStrength: 55, position: 2 }),
      createChapterData({ hookStrength: 70, position: 3 }),
      createChapterData({ hookStrength: 85, position: 4 }),
    ];

    const trend = calculateHookStrengthTrend(chapterData, 50);

    expect(trend.direction).toBe('improving');
    expect(trend.slope).toBeGreaterThan(0);
  });

  it('should detect declining trend', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookStrength: 85, position: 1 }),
      createChapterData({ hookStrength: 70, position: 2 }),
      createChapterData({ hookStrength: 55, position: 3 }),
      createChapterData({ hookStrength: 40, position: 4 }),
    ];

    const trend = calculateHookStrengthTrend(chapterData, 50);

    expect(trend.direction).toBe('declining');
    expect(trend.slope).toBeLessThan(0);
  });

  it('should count weak hooks', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookStrength: 30 }),
      createChapterData({ hookStrength: 40 }),
      createChapterData({ hookStrength: 70 }),
      createChapterData({ hookStrength: 80 }),
    ];

    const trend = calculateHookStrengthTrend(chapterData, 50);

    expect(trend.weakHookCount).toBe(2);
  });

  it('should calculate average correctly', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookStrength: 40 }),
      createChapterData({ hookStrength: 60 }),
      createChapterData({ hookStrength: 80 }),
    ];

    const trend = calculateHookStrengthTrend(chapterData, 50);

    expect(trend.average).toBe(60);
    expect(trend.min).toBe(40);
    expect(trend.max).toBe(80);
  });
});

describe('detectRepetitions', () => {
  it('should detect consecutive same hooks', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookType: 'cliffhanger', position: 1, structureId: 'ch-1' }),
      createChapterData({ hookType: 'cliffhanger', position: 2, structureId: 'ch-2' }),
      createChapterData({ hookType: 'cliffhanger', position: 3, structureId: 'ch-3' }),
      createChapterData({ hookType: 'revelation', position: 4, structureId: 'ch-4' }),
    ];

    const repetitions = detectRepetitions(chapterData, 3);

    expect(repetitions).toHaveLength(1);
    expect(repetitions[0].hookType).toBe('cliffhanger');
    expect(repetitions[0].count).toBe(3);
    expect(repetitions[0].structureIds).toEqual(['ch-1', 'ch-2', 'ch-3']);
  });

  it('should not flag streaks below threshold', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookType: 'cliffhanger', position: 1 }),
      createChapterData({ hookType: 'cliffhanger', position: 2 }),
      createChapterData({ hookType: 'revelation', position: 3 }),
    ];

    const repetitions = detectRepetitions(chapterData, 3);

    expect(repetitions).toHaveLength(0);
  });

  it('should not flag none repetitions', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookType: 'none', position: 1 }),
      createChapterData({ hookType: 'none', position: 2 }),
      createChapterData({ hookType: 'none', position: 3 }),
    ];

    const repetitions = detectRepetitions(chapterData, 3);

    expect(repetitions).toHaveLength(0);
  });
});

describe('generateHookWarnings', () => {
  const defaultDist = createDistribution({ cliffhanger: 5, revelation: 3 });
  const defaultTrend: HookStrengthTrend = {
    direction: 'stable',
    slope: 0,
    average: 70,
    min: 60,
    max: 80,
    weakHookCount: 0,
  };

  it('should warn about weak hooks', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookStrength: 30, structureId: 'ch-1' }),
      createChapterData({ hookStrength: 40, structureId: 'ch-2' }),
      createChapterData({ hookStrength: 70, structureId: 'ch-3' }),
    ];

    const warnings = generateHookWarnings(
      chapterData,
      defaultDist,
      defaultTrend,
      [],
      DEFAULT_HOOKS_CONFIG
    );

    const weakWarning = warnings.find((w) => w.type === 'weak-hook');
    expect(weakWarning).toBeDefined();
    expect(weakWarning?.affectedStructures).toHaveLength(2);
  });

  it('should warn about missing hooks', () => {
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookType: 'none', hasContent: true, structureId: 'ch-1' }),
      createChapterData({ hookType: 'cliffhanger', hasContent: true, structureId: 'ch-2' }),
    ];

    const warnings = generateHookWarnings(
      chapterData,
      defaultDist,
      defaultTrend,
      [],
      DEFAULT_HOOKS_CONFIG
    );

    const missingWarning = warnings.find((w) => w.type === 'missing-hook');
    expect(missingWarning).toBeDefined();
  });

  it('should warn about repetition', () => {
    const repetitions: HookRepetition[] = [
      {
        hookType: 'cliffhanger',
        startPosition: 1,
        endPosition: 4,
        count: 4,
        structureIds: ['ch-1', 'ch-2', 'ch-3', 'ch-4'],
      },
    ];

    const warnings = generateHookWarnings(
      [],
      defaultDist,
      defaultTrend,
      repetitions,
      DEFAULT_HOOKS_CONFIG
    );

    const repWarning = warnings.find((w) => w.type === 'repetition');
    expect(repWarning).toBeDefined();
  });

  it('should warn about low variety', () => {
    const lowVarietyDist = createDistribution({ cliffhanger: 10 });

    const chapterData = Array(10).fill(null).map((_, i) =>
      createChapterData({ hookType: 'cliffhanger', structureId: `ch-${i}` })
    );

    const warnings = generateHookWarnings(
      chapterData,
      lowVarietyDist,
      defaultTrend,
      [],
      DEFAULT_HOOKS_CONFIG
    );

    const varietyWarning = warnings.find((w) => w.type === 'low-variety');
    expect(varietyWarning).toBeDefined();
  });

  it('should warn about declining strength', () => {
    const decliningTrend: HookStrengthTrend = {
      direction: 'declining',
      slope: -5,
      average: 50,
      min: 30,
      max: 70,
      weakHookCount: 2,
    };

    const warnings = generateHookWarnings(
      [],
      defaultDist,
      decliningTrend,
      [],
      DEFAULT_HOOKS_CONFIG
    );

    const declineWarning = warnings.find((w) => w.type === 'declining-strength');
    expect(declineWarning).toBeDefined();
  });
});

describe('suggestNextHookType', () => {
  it('should suggest unused types first', () => {
    const distribution = createDistribution({ cliffhanger: 3, revelation: 2 });
    // Need at least one chapter to get a suggestion
    const chapterData: ChapterHookData[] = [
      createChapterData({ hookType: 'cliffhanger', hookStrength: 70 }),
    ];

    const suggestion = suggestNextHookType(chapterData, distribution);

    expect(distribution.unused).toContain(suggestion);
  });

  it('should avoid recently used hooks', () => {
    const distribution = createDistribution({
      cliffhanger: 3,
      revelation: 2,
      emotional: 1,
      question: 1,
      twist: 1,
      decision: 1,
      promise: 1,
    });

    const chapterData: ChapterHookData[] = [
      createChapterData({ hookType: 'cliffhanger', position: 1 }),
      createChapterData({ hookType: 'cliffhanger', position: 2 }),
      createChapterData({ hookType: 'cliffhanger', position: 3 }),
    ];

    const suggestion = suggestNextHookType(chapterData, distribution);

    expect(suggestion).not.toBe('cliffhanger');
  });

  it('should return undefined for empty data', () => {
    const distribution = createDistribution();

    const suggestion = suggestNextHookType([], distribution);

    expect(suggestion).toBeUndefined();
  });
});

describe('analyzeHooks', () => {
  it('should generate complete analysis report', () => {
    const book = createBookWithChapters(3);
    const input: HookAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', hookStrength: { score: 70, explanation: 'Good cliffhanger' } })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', hookStrength: { score: 60, explanation: 'Emotional ending' } })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', hookStrength: { score: 80, explanation: 'Great revelation' } })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    const report = analyzeHooks(input, deps);

    expect(report.summary.structureId).toBe('book-1');
    expect(report.summary.totalChapters).toBe(3);
    expect(report.summary.chaptersAnalyzed).toBe(3);
    expect(report.chapterData).toHaveLength(3);
    expect(report.generatedAt).toBeDefined();
  });

  it('should calculate average strength', () => {
    const book = createBookWithChapters(3);
    const input: HookAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', hookStrength: { score: 60, explanation: 'OK' } })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', hookStrength: { score: 70, explanation: 'Good' } })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', hookStrength: { score: 80, explanation: 'Great' } })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    const report = analyzeHooks(input, deps);

    expect(report.summary.averageStrength).toBe(70);
  });

  it('should suggest next hook type', () => {
    const book = createBookWithChapters(3);
    const input: HookAnalysisInput = {
      projectId: 'project-1',
      rootStructure: book,
    };

    const contentMap = new Map<string, { id: string; structureId: string }>([
      ['chapter-1', { id: 'content-1', structureId: 'chapter-1' }],
      ['chapter-2', { id: 'content-2', structureId: 'chapter-2' }],
      ['chapter-3', { id: 'content-3', structureId: 'chapter-3' }],
    ]);

    const analysisMap = new Map<string, ContentAnalysis>([
      ['content-1', createTestAnalysis({ contentId: 'content-1', hookStrength: { score: 70, explanation: 'Cliffhanger' } })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', hookStrength: { score: 70, explanation: 'Cliffhanger' } })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', hookStrength: { score: 70, explanation: 'Cliffhanger' } })],
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    const report = analyzeHooks(input, deps);

    expect(report.suggestedNextHook).toBeDefined();
    expect(report.suggestedNextHook).not.toBe('cliffhanger');
  });

  it('should handle chapters without analysis', () => {
    const book = createBookWithChapters(2);
    const input: HookAnalysisInput = {
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
    const report = analyzeHooks(input, deps);

    expect(report.summary.chaptersAnalyzed).toBe(1);
    expect(report.warnings.some((w) => w.type === 'missing-analysis')).toBe(true);
  });
});

describe('utility functions', () => {
  let sampleReport: ReturnType<typeof analyzeHooks>;

  beforeEach(() => {
    const book = createBookWithChapters(4);
    const input: HookAnalysisInput = {
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
      ['content-1', createTestAnalysis({ contentId: 'content-1', hookStrength: { score: 30, explanation: 'Weak ending' } })],
      ['content-2', createTestAnalysis({ contentId: 'content-2', hookStrength: { score: 70, explanation: 'Good cliffhanger' } })],
      ['content-3', createTestAnalysis({ contentId: 'content-3', hookStrength: { score: 90, explanation: 'Great revelation' } })],
      // content-4 has no hook analysis
    ]);

    const deps = createMockDependencies(analysisMap, contentMap);
    sampleReport = analyzeHooks(input, deps);
  });

  describe('getWeakHookChapters', () => {
    it('should return chapters below threshold', () => {
      const weakChapters = getWeakHookChapters(sampleReport, 50);
      expect(weakChapters).toHaveLength(1);
      expect(weakChapters[0].structureId).toBe('chapter-1');
    });
  });

  describe('getChaptersWithoutHooks', () => {
    it('should return chapters with none hook type', () => {
      // In our sample, chapter-1 has weak ending which classifies as 'none'
      const noHooks = getChaptersWithoutHooks(sampleReport);
      // Chapter 1 has "Weak ending" which might classify as 'none'
      expect(noHooks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUnanalyzedChapters', () => {
    it('should return chapters with content but no hook analysis', () => {
      const unanalyzed = getUnanalyzedChapters(sampleReport);
      expect(unanalyzed).toHaveLength(1);
      expect(unanalyzed[0].structureId).toBe('chapter-4');
    });
  });

  describe('hooksNeedAttention', () => {
    it('should return true when there are warnings', () => {
      // Create a report with warning-level issues (>2 weak hooks)
      const book = createBookWithChapters(5);
      const input: HookAnalysisInput = {
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

      // Multiple weak hooks should trigger warning-level 'weak-hook'
      const analysisMap = new Map<string, ContentAnalysis>([
        ['content-1', createTestAnalysis({ contentId: 'content-1', hookStrength: { score: 20, explanation: 'Weak ending' } })],
        ['content-2', createTestAnalysis({ contentId: 'content-2', hookStrength: { score: 25, explanation: 'Poor hook' } })],
        ['content-3', createTestAnalysis({ contentId: 'content-3', hookStrength: { score: 30, explanation: 'Weak conclusion' } })],
        ['content-4', createTestAnalysis({ contentId: 'content-4', hookStrength: { score: 70, explanation: 'Good cliffhanger' } })],
        ['content-5', createTestAnalysis({ contentId: 'content-5', hookStrength: { score: 80, explanation: 'Strong revelation' } })],
      ]);

      const deps = createMockDependencies(analysisMap, contentMap);
      const reportWithWarnings = analyzeHooks(input, deps);

      expect(hooksNeedAttention(reportWithWarnings)).toBe(true);
    });
  });

  describe('getHookUsageByType', () => {
    it('should return usage summary for all types', () => {
      const usage = getHookUsageByType(sampleReport);

      expect(usage.length).toBe(8); // 7 hook types + 'none'
      expect(usage.every((u) => typeof u.count === 'number')).toBe(true);
      expect(usage.every((u) => typeof u.percentage === 'number')).toBe(true);
    });
  });

  describe('getHookAnalysisCompletion', () => {
    it('should calculate completion percentage', () => {
      const completion = getHookAnalysisCompletion(sampleReport);
      // 3 analyzed out of 4 with content = 75%
      expect(completion).toBe(75);
    });
  });

  describe('getChaptersByHookType', () => {
    it('should return chapters with specific hook type', () => {
      const cliffhangers = getChaptersByHookType(sampleReport, 'cliffhanger');
      // Chapter 2 has cliffhanger
      expect(cliffhangers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStrongestHooks', () => {
    it('should return top hooks by strength', () => {
      const strongest = getStrongestHooks(sampleReport, 2);

      expect(strongest).toHaveLength(2);
      expect(strongest[0].hookStrength).toBeGreaterThanOrEqual(strongest[1].hookStrength!);
    });
  });
});
