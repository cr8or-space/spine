/**
 * Tests for hook management module
 */

import { describe, expect, it } from 'vitest';

import type { ContentAnalysis, HookType } from '@repo/types';

import {
  analyzeHookPatterns,
  calculateHookDistribution,
  calculateStrengthTrend,
  calculateVarietyScore,
  classifyHookFromExplanation,
  DEFAULT_HOOK_ANALYSIS_CONFIG,
  detectRepetitions,
  extractHookDataPoints,
  generateVarietyWarnings,
  getHookUsageSummary,
  HOOK_TYPES,
  type HookDataPoint,
  suggestNextHookType,
} from './hook-management';

describe('hook-management', () => {
  // Helper to create mock ContentAnalysis
  function createMockAnalysis(
    contentId: string,
    hookStrength: number,
    explanation: string
  ): ContentAnalysis {
    return {
      id: `analysis-${contentId}`,
      contentId,
      contentVersion: 1,
      tensionScore: { score: 50, explanation: 'Test tension' },
      hookStrength: { score: hookStrength, explanation },
      paceScore: { score: 50, explanation: 'Test pace' },
      characterVoiceScores: {},
      continuityIssues: [],
      wordCount: 2500,
      readingTime: 10,
      characterAppearances: [],
      locationAppearances: [],
      threadTouches: [],
      analyzedAt: new Date().toISOString(),
    };
  }

  // Helper to create hook data points
  function createDataPoint(
    contentId: string,
    position: number,
    hookType: HookType | 'none',
    strength: number
  ): HookDataPoint {
    return { contentId, position, hookType, strength };
  }

  describe('classifyHookFromExplanation', () => {
    it('should classify revelation hooks', () => {
      expect(classifyHookFromExplanation('A major revelation about the villain')).toBe('revelation');
      expect(classifyHookFromExplanation('The reveal of hidden truth')).toBe('revelation');
      expect(classifyHookFromExplanation('Important discovery made')).toBe('revelation');
    });

    it('should classify decision hooks', () => {
      expect(classifyHookFromExplanation('The hero faces a critical decision')).toBe('decision');
      expect(classifyHookFromExplanation('A difficult choice lies ahead')).toBe('decision');
      expect(classifyHookFromExplanation('Moral dilemma presented')).toBe('decision');
    });

    it('should classify cliffhanger hooks', () => {
      expect(classifyHookFromExplanation('Ends on a classic cliffhanger')).toBe('cliffhanger');
      expect(classifyHookFromExplanation('Cliff-hanger with danger')).toBe('cliffhanger');
      expect(classifyHookFromExplanation('Building suspense for next chapter')).toBe('cliffhanger');
    });

    it('should classify emotional hooks', () => {
      expect(classifyHookFromExplanation('Strong emotional beat')).toBe('emotional');
      expect(classifyHookFromExplanation('Deep feelings expressed')).toBe('emotional');
    });

    it('should classify question hooks', () => {
      expect(classifyHookFromExplanation('Leaves readers with a burning question')).toBe('question');
      expect(classifyHookFromExplanation('A mystery is introduced')).toBe('question');
      expect(classifyHookFromExplanation('Unanswered questions remain')).toBe('question');
    });

    it('should classify twist hooks', () => {
      expect(classifyHookFromExplanation('A dramatic twist at the end')).toBe('twist');
    });

    it('should classify promise hooks', () => {
      expect(classifyHookFromExplanation('Sets up a promise for future payoff')).toBe('promise');
    });

    it('should return none for unclassifiable hooks', () => {
      expect(classifyHookFromExplanation('The chapter ends adequately')).toBe('none');
      expect(classifyHookFromExplanation('')).toBe('none');
    });
  });

  describe('extractHookDataPoints', () => {
    it('should extract hook data from analyses', () => {
      const analyses = [
        createMockAnalysis('content-1', 75, 'A great cliffhanger ending'),
        createMockAnalysis('content-2', 60, 'Emotional moment at the end'),
        createMockAnalysis('content-3', 80, 'Major revelation revealed'),
      ];
      const positionMap = new Map([
        ['content-1', 1],
        ['content-2', 2],
        ['content-3', 3],
      ]);

      const dataPoints = extractHookDataPoints(analyses, positionMap);

      expect(dataPoints).toHaveLength(3);
      expect(dataPoints[0]).toEqual({
        contentId: 'content-1',
        position: 1,
        hookType: 'cliffhanger',
        strength: 75,
        title: undefined,
      });
      expect(dataPoints[1].hookType).toBe('emotional');
      expect(dataPoints[2].hookType).toBe('revelation');
    });

    it('should sort by position', () => {
      const analyses = [
        createMockAnalysis('content-3', 80, 'revelation'),
        createMockAnalysis('content-1', 75, 'cliffhanger'),
      ];
      const positionMap = new Map([
        ['content-1', 1],
        ['content-3', 3],
      ]);

      const dataPoints = extractHookDataPoints(analyses, positionMap);

      expect(dataPoints[0].position).toBe(1);
      expect(dataPoints[1].position).toBe(3);
    });

    it('should skip analyses without hookStrength', () => {
      const analyses: ContentAnalysis[] = [
        {
          id: 'analysis-1',
          contentId: 'content-1',
          contentVersion: 1,
          tensionScore: { score: 50, explanation: 'Test' },
          paceScore: { score: 50, explanation: 'Test' },
          characterVoiceScores: {},
          continuityIssues: [],
          wordCount: 2500,
          readingTime: 10,
          characterAppearances: [],
          locationAppearances: [],
          threadTouches: [],
          analyzedAt: new Date().toISOString(),
        },
      ];
      const positionMap = new Map([['content-1', 1]]);

      const dataPoints = extractHookDataPoints(analyses, positionMap);

      expect(dataPoints).toHaveLength(0);
    });

    it('should include titles when provided', () => {
      const analyses = [createMockAnalysis('content-1', 75, 'cliffhanger')];
      const positionMap = new Map([['content-1', 1]]);
      const titleMap = new Map([['content-1', 'Chapter 1: The Beginning']]);

      const dataPoints = extractHookDataPoints(analyses, positionMap, titleMap);

      expect(dataPoints[0].title).toBe('Chapter 1: The Beginning');
    });
  });

  describe('calculateHookDistribution', () => {
    it('should calculate distribution of hook types', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'revelation', 80),
        createDataPoint('4', 4, 'emotional', 65),
        createDataPoint('5', 5, 'cliffhanger', 70),
      ];

      const distribution = calculateHookDistribution(dataPoints);

      expect(distribution['cliffhanger']).toBe(3);
      expect(distribution['revelation']).toBe(1);
      expect(distribution['emotional']).toBe(1);
      expect(distribution['decision']).toBe(0);
      expect(distribution['none']).toBe(0);
    });

    it('should handle empty input', () => {
      const distribution = calculateHookDistribution([]);

      // All types should be 0
      for (const hookType of HOOK_TYPES) {
        expect(distribution[hookType]).toBe(0);
      }
    });

    it('should count none types', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'none', 30),
        createDataPoint('2', 2, 'cliffhanger', 70),
      ];

      const distribution = calculateHookDistribution(dataPoints);

      expect(distribution['none']).toBe(1);
      expect(distribution['cliffhanger']).toBe(1);
    });
  });

  describe('calculateVarietyScore', () => {
    it('should return 100 for perfectly varied distribution', () => {
      // Equal distribution across all 7 types
      const distribution: Record<string, number> = {};
      for (const hookType of HOOK_TYPES) {
        distribution[hookType] = 1;
      }
      distribution['none'] = 0;

      const score = calculateVarietyScore(distribution);

      // Should be close to 100 (maximum entropy)
      expect(score).toBeGreaterThan(95);
    });

    it('should return low score for single-type usage', () => {
      const distribution: Record<string, number> = {};
      for (const hookType of HOOK_TYPES) {
        distribution[hookType] = 0;
      }
      distribution['cliffhanger'] = 10;
      distribution['none'] = 0;

      const score = calculateVarietyScore(distribution);

      // Should be 0 (no variety)
      expect(score).toBe(0);
    });

    it('should return 0 for empty distribution', () => {
      const distribution: Record<string, number> = {};
      for (const hookType of HOOK_TYPES) {
        distribution[hookType] = 0;
      }

      const score = calculateVarietyScore(distribution);

      expect(score).toBe(0);
    });

    it('should return moderate score for moderate variety', () => {
      const distribution: Record<string, number> = {
        cliffhanger: 3,
        revelation: 2,
        emotional: 1,
        decision: 0,
        question: 0,
        twist: 0,
        promise: 0,
        none: 0,
      };

      const score = calculateVarietyScore(distribution);

      // Should be somewhere in the middle
      expect(score).toBeGreaterThan(30);
      expect(score).toBeLessThan(70);
    });
  });

  describe('detectRepetitions', () => {
    it('should detect consecutive repetitions exceeding limit', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'cliffhanger', 80),
        createDataPoint('4', 4, 'revelation', 70),
      ];

      const repetitions = detectRepetitions(dataPoints, 2);

      expect(repetitions).toHaveLength(1);
      expect(repetitions[0].hookType).toBe('cliffhanger');
      expect(repetitions[0].consecutiveCount).toBe(3);
      expect(repetitions[0].startPosition).toBe(1);
      expect(repetitions[0].endPosition).toBe(3);
    });

    it('should not detect repetitions within limit', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'revelation', 80),
      ];

      const repetitions = detectRepetitions(dataPoints, 2);

      expect(repetitions).toHaveLength(0);
    });

    it('should ignore none type repetitions', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'none', 30),
        createDataPoint('2', 2, 'none', 35),
        createDataPoint('3', 3, 'none', 40),
        createDataPoint('4', 4, 'none', 45),
      ];

      const repetitions = detectRepetitions(dataPoints, 2);

      expect(repetitions).toHaveLength(0);
    });

    it('should detect multiple repetition runs', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'cliffhanger', 80),
        createDataPoint('4', 4, 'revelation', 70),
        createDataPoint('5', 5, 'emotional', 65),
        createDataPoint('6', 6, 'emotional', 70),
        createDataPoint('7', 7, 'emotional', 75),
      ];

      const repetitions = detectRepetitions(dataPoints, 2);

      expect(repetitions).toHaveLength(2);
      expect(repetitions[0].hookType).toBe('cliffhanger');
      expect(repetitions[1].hookType).toBe('emotional');
    });

    it('should handle empty input', () => {
      const repetitions = detectRepetitions([], 2);
      expect(repetitions).toHaveLength(0);
    });

    it('should detect repetition at end of sequence', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'revelation', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'cliffhanger', 80),
        createDataPoint('4', 4, 'cliffhanger', 85),
      ];

      const repetitions = detectRepetitions(dataPoints, 2);

      expect(repetitions).toHaveLength(1);
      expect(repetitions[0].endPosition).toBe(4);
    });
  });

  describe('calculateStrengthTrend', () => {
    it('should calculate basic statistics', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 60),
        createDataPoint('2', 2, 'revelation', 70),
        createDataPoint('3', 3, 'emotional', 80),
      ];

      const trend = calculateStrengthTrend(dataPoints);

      expect(trend.average).toBe(70);
      expect(trend.min).toBe(60);
      expect(trend.max).toBe(80);
    });

    it('should detect improving trend', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 50),
        createDataPoint('2', 2, 'revelation', 60),
        createDataPoint('3', 3, 'emotional', 70),
        createDataPoint('4', 4, 'decision', 80),
        createDataPoint('5', 5, 'twist', 90),
      ];

      const trend = calculateStrengthTrend(dataPoints);

      expect(trend.trend).toBe('improving');
      expect(trend.slope).toBeGreaterThan(0);
    });

    it('should detect declining trend', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 90),
        createDataPoint('2', 2, 'revelation', 80),
        createDataPoint('3', 3, 'emotional', 70),
        createDataPoint('4', 4, 'decision', 60),
        createDataPoint('5', 5, 'twist', 50),
      ];

      const trend = calculateStrengthTrend(dataPoints);

      expect(trend.trend).toBe('declining');
      expect(trend.slope).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'revelation', 71),
        createDataPoint('3', 3, 'emotional', 69),
        createDataPoint('4', 4, 'decision', 70),
        createDataPoint('5', 5, 'twist', 70),
      ];

      const trend = calculateStrengthTrend(dataPoints);

      expect(trend.trend).toBe('stable');
    });

    it('should identify weak hooks', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'revelation', 40),
        createDataPoint('3', 3, 'emotional', 30),
        createDataPoint('4', 4, 'decision', 80),
      ];

      const trend = calculateStrengthTrend(dataPoints, { weakHookThreshold: 50 });

      expect(trend.weakHooks).toHaveLength(2);
      expect(trend.weakHooks[0].contentId).toBe('2');
      expect(trend.weakHooks[1].contentId).toBe('3');
    });

    it('should handle empty input', () => {
      const trend = calculateStrengthTrend([]);

      expect(trend.average).toBe(0);
      expect(trend.trend).toBe('stable');
      expect(trend.weakHooks).toHaveLength(0);
    });

    it('should handle single data point', () => {
      const dataPoints: HookDataPoint[] = [createDataPoint('1', 1, 'cliffhanger', 70)];

      const trend = calculateStrengthTrend(dataPoints);

      expect(trend.average).toBe(70);
      expect(trend.trend).toBe('stable');
    });
  });

  describe('generateVarietyWarnings', () => {
    it('should warn about consecutive repetitions', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'cliffhanger', 80),
      ];

      const warnings = generateVarietyWarnings(dataPoints, {
        enforceHookVariety: true,
        maxConsecutiveSameHook: 2,
        cycleLength: 5,
        cycleTensionTargets: [],
        minimumBuffer: 5,
        releaseInterval: 2,
      });

      expect(warnings.some((w) => w.includes('consecutive'))).toBe(true);
    });

    it('should warn about low variety score', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'cliffhanger', 80),
        createDataPoint('4', 4, 'cliffhanger', 85),
        createDataPoint('5', 5, 'cliffhanger', 90),
      ];

      const warnings = generateVarietyWarnings(dataPoints, {
        enforceHookVariety: true,
        maxConsecutiveSameHook: 10,
        cycleLength: 5,
        cycleTensionTargets: [],
        minimumBuffer: 5,
        releaseInterval: 2,
      });

      expect(warnings.some((w) => w.includes('variety'))).toBe(true);
    });

    it('should warn about overused hook types', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'revelation', 80),
        createDataPoint('4', 4, 'cliffhanger', 85),
      ];

      const warnings = generateVarietyWarnings(dataPoints, {
        enforceHookVariety: true,
        maxConsecutiveSameHook: 10,
        cycleLength: 5,
        cycleTensionTargets: [],
        minimumBuffer: 5,
        releaseInterval: 2,
      });

      expect(warnings.some((w) => w.includes('overused'))).toBe(true);
    });

    it('should warn about weak hooks', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 30),
        createDataPoint('2', 2, 'revelation', 35),
        createDataPoint('3', 3, 'emotional', 40),
      ];

      const warnings = generateVarietyWarnings(dataPoints, undefined, { weakHookThreshold: 50 });

      expect(warnings.some((w) => w.includes('weak'))).toBe(true);
    });

    it('should warn about declining strength', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 90),
        createDataPoint('2', 2, 'revelation', 80),
        createDataPoint('3', 3, 'emotional', 70),
        createDataPoint('4', 4, 'decision', 60),
        createDataPoint('5', 5, 'twist', 50),
      ];

      const warnings = generateVarietyWarnings(dataPoints);

      expect(warnings.some((w) => w.includes('declining'))).toBe(true);
    });

    it('should not warn when variety is good', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'revelation', 75),
        createDataPoint('3', 3, 'emotional', 80),
        createDataPoint('4', 4, 'decision', 75),
        createDataPoint('5', 5, 'twist', 70),
      ];

      const warnings = generateVarietyWarnings(dataPoints, {
        enforceHookVariety: true,
        maxConsecutiveSameHook: 2,
        cycleLength: 5,
        cycleTensionTargets: [],
        minimumBuffer: 5,
        releaseInterval: 2,
      });

      // Should have minimal warnings
      expect(warnings.filter((w) => w.includes('variety') || w.includes('consecutive'))).toHaveLength(0);
    });

    it('should respect enforceHookVariety setting', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'cliffhanger', 80),
        createDataPoint('4', 4, 'cliffhanger', 85),
      ];

      const warnings = generateVarietyWarnings(dataPoints, {
        enforceHookVariety: false,
        maxConsecutiveSameHook: 2,
        cycleLength: 5,
        cycleTensionTargets: [],
        minimumBuffer: 5,
        releaseInterval: 2,
      });

      // Should still warn about repetition but not variety
      expect(warnings.some((w) => w.includes('consecutive'))).toBe(true);
      expect(warnings.some((w) => w.includes('Low hook variety'))).toBe(false);
    });
  });

  describe('analyzeHookPatterns', () => {
    it('should generate complete pattern analysis', () => {
      const analyses = [
        createMockAnalysis('content-1', 75, 'cliffhanger ending'),
        createMockAnalysis('content-2', 60, 'emotional beat'),
        createMockAnalysis('content-3', 80, 'revelation discovered'),
        createMockAnalysis('content-4', 70, 'decision point'),
      ];
      const positionMap = new Map([
        ['content-1', 1],
        ['content-2', 2],
        ['content-3', 3],
        ['content-4', 4],
      ]);

      const result = analyzeHookPatterns(analyses, positionMap);

      expect(result.analysis.recentHooks).toHaveLength(4);
      expect(result.analysis.varietyScore).toBeGreaterThan(50);
      expect(result.strengthTrend.average).toBeGreaterThan(0);
    });

    it('should respect analysis window', () => {
      const analyses: ContentAnalysis[] = [];
      const positionMap = new Map<string, number>();

      // Create 25 chapters
      for (let i = 1; i <= 25; i++) {
        analyses.push(createMockAnalysis(`content-${i}`, 70, 'cliffhanger'));
        positionMap.set(`content-${i}`, i);
      }

      const result = analyzeHookPatterns(analyses, positionMap, undefined, {
        analysisWindow: 10,
      });

      // Should only include last 10 chapters
      expect(result.analysis.recentHooks.length).toBeLessThanOrEqual(10);
    });

    it('should include repetition details', () => {
      const analyses = [
        createMockAnalysis('content-1', 75, 'cliffhanger'),
        createMockAnalysis('content-2', 70, 'cliffhanger'),
        createMockAnalysis('content-3', 80, 'cliffhanger'),
      ];
      const positionMap = new Map([
        ['content-1', 1],
        ['content-2', 2],
        ['content-3', 3],
      ]);

      const result = analyzeHookPatterns(analyses, positionMap, {
        enforceHookVariety: true,
        maxConsecutiveSameHook: 2,
        cycleLength: 5,
        cycleTensionTargets: [],
        minimumBuffer: 5,
        releaseInterval: 2,
      });

      expect(result.repetitionDetails).toHaveLength(1);
      expect(result.repetitionDetails[0].hookType).toBe('cliffhanger');
    });

    it('should use default settings when not provided', () => {
      const analyses = [createMockAnalysis('content-1', 75, 'cliffhanger')];
      const positionMap = new Map([['content-1', 1]]);

      const result = analyzeHookPatterns(analyses, positionMap);

      expect(result.analysis).toBeDefined();
      expect(result.strengthTrend).toBeDefined();
    });
  });

  describe('getHookUsageSummary', () => {
    it('should generate readable summary', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'revelation', 80),
        createDataPoint('3', 3, 'emotional', 60),
      ];

      const summary = getHookUsageSummary(dataPoints);

      expect(summary).toContain('Hook Analysis Summary');
      expect(summary).toContain('3 chapters');
      expect(summary).toContain('Variety score');
      expect(summary).toContain('cliffhanger');
    });

    it('should handle empty data', () => {
      const summary = getHookUsageSummary([]);

      expect(summary).toContain('No hook data available');
    });

    it('should include weak hook info when present', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 30),
        createDataPoint('2', 2, 'revelation', 40),
      ];

      const summary = getHookUsageSummary(dataPoints);

      expect(summary).toContain('Weak hooks');
    });
  });

  describe('suggestNextHookType', () => {
    it('should suggest all types for empty history', () => {
      const suggestions = suggestNextHookType([]);

      expect(suggestions).toHaveLength(HOOK_TYPES.length);
    });

    it('should avoid recently used types', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
      ];

      const suggestions = suggestNextHookType(dataPoints, 2);

      // Cliffhanger should not be first (at consecutive limit)
      expect(suggestions[0]).not.toBe('cliffhanger');
    });

    it('should prefer less used types', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
        createDataPoint('3', 3, 'cliffhanger', 80),
        createDataPoint('4', 4, 'revelation', 70),
      ];

      const suggestions = suggestNextHookType(dataPoints, 3);

      // Unused types should be preferred over cliffhanger
      expect(suggestions.indexOf('cliffhanger')).toBeGreaterThan(3);
    });

    it('should exclude type at consecutive limit', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'cliffhanger', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
      ];

      const suggestions = suggestNextHookType(dataPoints, 2);

      // Cliffhanger should be excluded entirely when at limit
      expect(suggestions).not.toContain('cliffhanger');
    });

    it('should allow type when below consecutive limit', () => {
      const dataPoints: HookDataPoint[] = [
        createDataPoint('1', 1, 'revelation', 70),
        createDataPoint('2', 2, 'cliffhanger', 75),
      ];

      const suggestions = suggestNextHookType(dataPoints, 2);

      // Cliffhanger should still be available (only 1 consecutive)
      expect(suggestions).toContain('cliffhanger');
    });
  });

  describe('DEFAULT_HOOK_ANALYSIS_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_HOOK_ANALYSIS_CONFIG.weakHookThreshold).toBe(50);
      expect(DEFAULT_HOOK_ANALYSIS_CONFIG.analysisWindow).toBe(20);
      expect(DEFAULT_HOOK_ANALYSIS_CONFIG.includeUnanalyzed).toBe(false);
    });
  });

  describe('HOOK_TYPES constant', () => {
    it('should include all 7 hook types', () => {
      expect(HOOK_TYPES).toHaveLength(7);
      expect(HOOK_TYPES).toContain('revelation');
      expect(HOOK_TYPES).toContain('decision');
      expect(HOOK_TYPES).toContain('cliffhanger');
      expect(HOOK_TYPES).toContain('emotional');
      expect(HOOK_TYPES).toContain('question');
      expect(HOOK_TYPES).toContain('twist');
      expect(HOOK_TYPES).toContain('promise');
    });
  });
});
