/**
 * Tests for cycle enforcement module
 */

import { describe, expect, it } from 'vitest';

import type { ContentAnalysis, SerialSettings, Structure } from '@repo/serial-types';

import {
  analyzeCycleEnforcement,
  buildCyclePositionConfigs,
  buildPositionTargetMap,
  DEFAULT_CYCLE_ENFORCEMENT_CONFIG,
  DEFAULT_CYCLE_PATTERN,
  detectCyclePhase,
  detectCycleViolations,
  extractCycleDataPoints,
  generateCycleWarnings,
  generateRebalancingSuggestions,
  getCycleNumber,
  getCyclePosition,
  getCycleSummary,
  getPhaseDescription,
  getPositionTargetTension,
  suggestNextChapterTension,
  validateCycleConfiguration,
  type CycleDataPoint,
  type CycleViolation,
} from './cycle-enforcement';

describe('cycle-enforcement', () => {
  // Helper to create mock SerialSettings
  function createSettings(overrides: Partial<SerialSettings> = {}): SerialSettings {
    return {
      cycleLength: 5,
      cycleTensionTargets: [40, 60, 70, 80, 50],
      minimumBuffer: 5,
      releaseInterval: 2,
      enforceHookVariety: true,
      maxConsecutiveSameHook: 2,
      ...overrides,
    };
  }

  // Helper to create mock Structure
  function createStructure(
    id: string,
    type: 'book' | 'arc' | 'chapter' | 'scene',
    title: string,
    children: Structure[] = [],
    tensionTarget?: number
  ): Structure {
    const now = new Date().toISOString();
    return {
      id,
      type,
      title,
      summary: '',
      beats: [],
      order: 0,
      children,
      tensionTarget,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Helper to create a book structure with chapters
  function createBookWithChapters(
    chapterCount: number,
    tensionTargets?: (number | undefined)[]
  ): Structure {
    const chapters: Structure[] = [];
    for (let i = 0; i < chapterCount; i++) {
      const tension = tensionTargets?.[i];
      chapters.push(
        createStructure(`chapter-${i + 1}`, 'chapter', `Chapter ${i + 1}`, [], tension)
      );
    }
    return createStructure('book-1', 'book', 'Test Book', chapters);
  }

  // Helper to create mock ContentAnalysis
  function createAnalysis(
    contentId: string,
    structureId: string,
    tensionScore: number
  ): ContentAnalysis {
    return {
      id: `analysis-${contentId}`,
      contentId,
      contentVersion: 1,
      tensionScore: { score: tensionScore, explanation: 'Test' },
      paceScore: { score: 50, explanation: 'Test' },
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

  describe('getCyclePosition', () => {
    it('should return 0 for first position', () => {
      expect(getCyclePosition(1, 5)).toBe(0);
    });

    it('should cycle through positions', () => {
      expect(getCyclePosition(1, 5)).toBe(0);
      expect(getCyclePosition(2, 5)).toBe(1);
      expect(getCyclePosition(3, 5)).toBe(2);
      expect(getCyclePosition(4, 5)).toBe(3);
      expect(getCyclePosition(5, 5)).toBe(4);
      expect(getCyclePosition(6, 5)).toBe(0); // New cycle
      expect(getCyclePosition(7, 5)).toBe(1);
    });

    it('should work with different cycle lengths', () => {
      expect(getCyclePosition(1, 3)).toBe(0);
      expect(getCyclePosition(2, 3)).toBe(1);
      expect(getCyclePosition(3, 3)).toBe(2);
      expect(getCyclePosition(4, 3)).toBe(0);
    });
  });

  describe('getCycleNumber', () => {
    it('should return 1 for first cycle', () => {
      expect(getCycleNumber(1, 5)).toBe(1);
      expect(getCycleNumber(5, 5)).toBe(1);
    });

    it('should increment for new cycles', () => {
      expect(getCycleNumber(6, 5)).toBe(2);
      expect(getCycleNumber(10, 5)).toBe(2);
      expect(getCycleNumber(11, 5)).toBe(3);
    });

    it('should work with different cycle lengths', () => {
      expect(getCycleNumber(1, 3)).toBe(1);
      expect(getCycleNumber(3, 3)).toBe(1);
      expect(getCycleNumber(4, 3)).toBe(2);
      expect(getCycleNumber(7, 3)).toBe(3);
    });
  });

  describe('getPositionTargetTension', () => {
    it('should return correct target for each position', () => {
      const targets = [40, 60, 70, 80, 50];
      expect(getPositionTargetTension(0, targets)).toBe(40);
      expect(getPositionTargetTension(1, targets)).toBe(60);
      expect(getPositionTargetTension(2, targets)).toBe(70);
      expect(getPositionTargetTension(3, targets)).toBe(80);
      expect(getPositionTargetTension(4, targets)).toBe(50);
    });

    it('should wrap around for positions beyond array length', () => {
      const targets = [40, 60, 70];
      expect(getPositionTargetTension(3, targets)).toBe(40);
      expect(getPositionTargetTension(4, targets)).toBe(60);
    });

    it('should return 50 for empty targets', () => {
      expect(getPositionTargetTension(0, [])).toBe(50);
    });
  });

  describe('getPhaseDescription', () => {
    const targets = [40, 60, 70, 80, 50];

    it('should identify peak position', () => {
      expect(getPhaseDescription(3, targets)).toBe('peak');
    });

    it('should identify rising positions', () => {
      expect(getPhaseDescription(0, targets)).toBe('rising');
      expect(getPhaseDescription(1, targets)).toBe('rising');
    });

    it('should identify escalating position', () => {
      expect(getPhaseDescription(2, targets)).toBe('escalating');
    });

    it('should identify falling position', () => {
      expect(getPhaseDescription(4, targets)).toBe('falling');
    });
  });

  describe('buildPositionTargetMap', () => {
    it('should create map with all positions', () => {
      const settings = createSettings();
      const map = buildPositionTargetMap(settings);

      expect(map.size).toBe(5);
      expect(map.get(0)).toBe(40);
      expect(map.get(1)).toBe(60);
      expect(map.get(2)).toBe(70);
      expect(map.get(3)).toBe(80);
      expect(map.get(4)).toBe(50);
    });
  });

  describe('buildCyclePositionConfigs', () => {
    it('should create configs for all positions', () => {
      const settings = createSettings();
      const configs = buildCyclePositionConfigs(settings);

      expect(configs).toHaveLength(5);
      expect(configs[0]).toEqual({
        position: 0,
        targetTension: 40,
        description: 'rising',
      });
      expect(configs[3]).toEqual({
        position: 3,
        targetTension: 80,
        description: 'peak',
      });
    });
  });

  describe('extractCycleDataPoints', () => {
    it('should extract data points from structure', () => {
      const book = createBookWithChapters(5, [40, 60, 70, 80, 50]);
      const settings = createSettings();
      const analyses = new Map<string, ContentAnalysis>();

      const dataPoints = extractCycleDataPoints(book, settings, analyses);

      expect(dataPoints).toHaveLength(5);
      expect(dataPoints[0]).toMatchObject({
        structureId: 'chapter-1',
        title: 'Chapter 1',
        globalPosition: 1,
        cyclePosition: 0,
        cycleNumber: 1,
        targetTension: 40,
        plannedTension: 40,
      });
    });

    it('should calculate deviation from target', () => {
      const book = createBookWithChapters(3, [50, 70, 60]); // Different from cycle targets
      const settings = createSettings();
      const analyses = new Map<string, ContentAnalysis>();

      const dataPoints = extractCycleDataPoints(book, settings, analyses);

      // Target is 40, planned is 50, deviation = 50 - 40 = 10
      expect(dataPoints[0].deviationFromTarget).toBe(10);
      // Target is 60, planned is 70, deviation = 70 - 60 = 10
      expect(dataPoints[1].deviationFromTarget).toBe(10);
      // Target is 70, planned is 60, deviation = 60 - 70 = -10
      expect(dataPoints[2].deviationFromTarget).toBe(-10);
    });

    it('should include actual tension from analyses', () => {
      const book = createBookWithChapters(2, [40, 60]);
      const settings = createSettings();
      const analyses = new Map<string, ContentAnalysis>();
      analyses.set('chapter-1', createAnalysis('content-1', 'chapter-1', 45));

      const dataPoints = extractCycleDataPoints(book, settings, analyses);

      expect(dataPoints[0].actualTension).toBe(45);
      expect(dataPoints[0].deviationFromTarget).toBe(5); // 45 - 40
      expect(dataPoints[1].actualTension).toBeUndefined();
    });
  });

  describe('detectCyclePhase', () => {
    it('should handle zero chapters', () => {
      const settings = createSettings();
      const result = detectCyclePhase(0, settings);

      expect(result.currentCycle).toBe(1);
      expect(result.currentPosition).toBe(0);
      expect(result.totalChapters).toBe(0);
      expect(result.isCycleComplete).toBe(false);
      expect(result.nextTargetTension).toBe(40);
    });

    it('should detect position within first cycle', () => {
      const settings = createSettings();
      const result = detectCyclePhase(3, settings);

      expect(result.currentCycle).toBe(1);
      expect(result.currentPosition).toBe(2);
      expect(result.chaptersInCurrentCycle).toBe(3);
      expect(result.isCycleComplete).toBe(false);
      expect(result.phaseDescription).toBe('escalating');
      expect(result.nextTargetTension).toBe(80); // Next position is 3 (peak)
    });

    it('should detect complete cycle', () => {
      const settings = createSettings();
      const result = detectCyclePhase(5, settings);

      expect(result.currentCycle).toBe(1);
      expect(result.currentPosition).toBe(4);
      expect(result.isCycleComplete).toBe(true);
      expect(result.nextTargetTension).toBe(40); // Back to position 0
    });

    it('should detect second cycle', () => {
      const settings = createSettings();
      const result = detectCyclePhase(7, settings);

      expect(result.currentCycle).toBe(2);
      expect(result.currentPosition).toBe(1);
      expect(result.chaptersInCurrentCycle).toBe(2);
    });
  });

  describe('detectCycleViolations', () => {
    it('should return empty for no data', () => {
      const violations = detectCycleViolations([]);
      expect(violations).toHaveLength(0);
    });

    it('should detect minor violations', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
          plannedTension: 52, // 12 points off - minor violation
        },
      ];

      const violations = detectCycleViolations(dataPoints);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('minor');
      expect(violations[0].deviation).toBe(12);
    });

    it('should detect moderate violations', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
          plannedTension: 65, // 25 points off - moderate
        },
      ];

      const violations = detectCycleViolations(dataPoints);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('moderate');
    });

    it('should detect severe violations', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
          plannedTension: 90, // 50 points off - severe
        },
      ];

      const violations = detectCycleViolations(dataPoints);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('severe');
    });

    it('should not flag values within tolerance', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
          plannedTension: 45, // Only 5 points off
        },
      ];

      const violations = detectCycleViolations(dataPoints);
      expect(violations).toHaveLength(0);
    });

    it('should prefer actual tension when configured', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
          plannedTension: 45, // Within tolerance
          actualTension: 70, // But actual is way off
        },
      ];

      const violations = detectCycleViolations(dataPoints, { preferActualTension: true });

      expect(violations).toHaveLength(1);
      expect(violations[0].actualValue).toBe(70);
    });

    it('should skip points without tension values', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
          // No plannedTension or actualTension
        },
      ];

      const violations = detectCycleViolations(dataPoints);
      expect(violations).toHaveLength(0);
    });
  });

  describe('generateRebalancingSuggestions', () => {
    it('should generate suggestions for violations', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
          plannedTension: 70,
        },
      ];
      const violations: CycleViolation[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          expectedTension: 40,
          actualValue: 70,
          deviation: 30,
          severity: 'severe',
        },
      ];
      const settings = createSettings();

      const suggestions = generateRebalancingSuggestions(dataPoints, violations, settings);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].direction).toBe('decrease');
      expect(suggestions[0].priority).toBe('high');
      expect(suggestions[0].suggestedTension).toBe(40);
      expect(suggestions[0].explanation).toContain('too high');
    });

    it('should suggest increase for low tension', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-4',
          title: 'Chapter 4',
          globalPosition: 4,
          cyclePosition: 3,
          cycleNumber: 1,
          targetTension: 80,
          plannedTension: 40,
        },
      ];
      const violations: CycleViolation[] = [
        {
          structureId: 'ch-4',
          title: 'Chapter 4',
          globalPosition: 4,
          cyclePosition: 3,
          expectedTension: 80,
          actualValue: 40,
          deviation: -40,
          severity: 'severe',
        },
      ];
      const settings = createSettings();

      const suggestions = generateRebalancingSuggestions(dataPoints, violations, settings);

      expect(suggestions[0].direction).toBe('increase');
      expect(suggestions[0].explanation).toContain('too low');
    });

    it('should sort by priority', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
        },
        {
          structureId: 'ch-2',
          title: 'Chapter 2',
          globalPosition: 2,
          cyclePosition: 1,
          cycleNumber: 1,
          targetTension: 60,
        },
      ];
      const violations: CycleViolation[] = [
        {
          structureId: 'ch-1',
          title: 'Chapter 1',
          globalPosition: 1,
          cyclePosition: 0,
          expectedTension: 40,
          actualValue: 55,
          deviation: 15,
          severity: 'minor',
        },
        {
          structureId: 'ch-2',
          title: 'Chapter 2',
          globalPosition: 2,
          cyclePosition: 1,
          expectedTension: 60,
          actualValue: 95,
          deviation: 35,
          severity: 'severe',
        },
      ];
      const settings = createSettings();

      const suggestions = generateRebalancingSuggestions(dataPoints, violations, settings);

      expect(suggestions[0].priority).toBe('high'); // Severe first
      expect(suggestions[1].priority).toBe('low'); // Minor second
    });
  });

  describe('generateCycleWarnings', () => {
    it('should warn about severe violations', () => {
      const dataPoints: CycleDataPoint[] = [];
      const violations: CycleViolation[] = [
        {
          structureId: 'ch-1',
          title: 'Test',
          globalPosition: 1,
          cyclePosition: 0,
          expectedTension: 40,
          actualValue: 90,
          deviation: 50,
          severity: 'severe',
        },
      ];
      const stats = {
        totalCycles: 1,
        completeCycles: 0,
        averageDeviation: 50,
        violationCount: 1,
        complianceRate: 0,
      };
      const settings = createSettings();

      const warnings = generateCycleWarnings(dataPoints, violations, stats, settings);

      expect(warnings.some((w) => w.includes('severe'))).toBe(true);
    });

    it('should warn about low compliance rate', () => {
      const dataPoints: CycleDataPoint[] = [];
      const violations: CycleViolation[] = [];
      const stats = {
        totalCycles: 1,
        completeCycles: 0,
        averageDeviation: 20,
        violationCount: 5,
        complianceRate: 30,
      };
      const settings = createSettings();

      const warnings = generateCycleWarnings(dataPoints, violations, stats, settings);

      expect(warnings.some((w) => w.includes('30%'))).toBe(true);
    });

    it('should warn about consistently high tension', () => {
      const dataPoints: CycleDataPoint[] = [
        {
          structureId: 'ch-1',
          title: 'Ch 1',
          globalPosition: 1,
          cyclePosition: 0,
          cycleNumber: 1,
          targetTension: 40,
          plannedTension: 85,
        },
        {
          structureId: 'ch-2',
          title: 'Ch 2',
          globalPosition: 2,
          cyclePosition: 1,
          cycleNumber: 1,
          targetTension: 60,
          plannedTension: 90,
        },
      ];
      const violations: CycleViolation[] = [];
      const stats = {
        totalCycles: 1,
        completeCycles: 0,
        averageDeviation: 25,
        violationCount: 0,
        complianceRate: 80,
      };
      const settings = createSettings();

      const warnings = generateCycleWarnings(dataPoints, violations, stats, settings);

      expect(warnings.some((w) => w.includes('higher than'))).toBe(true);
    });
  });

  describe('analyzeCycleEnforcement', () => {
    it('should produce complete analysis', () => {
      const book = createBookWithChapters(10, [40, 60, 70, 80, 50, 45, 65, 75, 85, 55]);
      const settings = createSettings();
      const analyses = new Map<string, ContentAnalysis>();

      const result = analyzeCycleEnforcement(book, settings, analyses);

      expect(result.dataPoints).toHaveLength(10);
      expect(result.phaseInfo.currentCycle).toBe(2);
      expect(result.phaseInfo.currentPosition).toBe(4);
      expect(result.stats.totalCycles).toBe(2);
      expect(result.stats.completeCycles).toBe(2);
    });

    it('should handle empty structure', () => {
      const book = createBookWithChapters(0);
      const settings = createSettings();

      const result = analyzeCycleEnforcement(book, settings);

      expect(result.dataPoints).toHaveLength(0);
      expect(result.phaseInfo.totalChapters).toBe(0);
      expect(result.stats.complianceRate).toBe(100);
    });

    it('should detect violations in analysis', () => {
      const book = createBookWithChapters(5, [90, 90, 90, 90, 90]); // All high tension
      const settings = createSettings();

      const result = analyzeCycleEnforcement(book, settings);

      // Position 0 expects 40, got 90 - severe violation
      // Position 4 expects 50, got 90 - severe violation
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('suggestNextChapterTension', () => {
    it('should suggest first position for empty project', () => {
      const settings = createSettings();
      const result = suggestNextChapterTension(0, settings);

      expect(result.suggestedTension).toBe(40);
      expect(result.cyclePosition).toBe(0);
      expect(result.cycleNumber).toBe(1);
    });

    it('should suggest correct position progression', () => {
      const settings = createSettings();

      expect(suggestNextChapterTension(0, settings).suggestedTension).toBe(40);
      expect(suggestNextChapterTension(1, settings).suggestedTension).toBe(60);
      expect(suggestNextChapterTension(2, settings).suggestedTension).toBe(70);
      expect(suggestNextChapterTension(3, settings).suggestedTension).toBe(80);
      expect(suggestNextChapterTension(4, settings).suggestedTension).toBe(50);
      expect(suggestNextChapterTension(5, settings).suggestedTension).toBe(40); // New cycle
    });

    it('should provide phase description', () => {
      const settings = createSettings();

      expect(suggestNextChapterTension(2, settings).phaseDescription).toBe('escalating');
      expect(suggestNextChapterTension(3, settings).phaseDescription).toBe('peak');
    });
  });

  describe('getCycleSummary', () => {
    it('should generate readable summary', () => {
      const book = createBookWithChapters(5, [40, 60, 70, 80, 50]);
      const settings = createSettings();
      const result = analyzeCycleEnforcement(book, settings);

      const summary = getCycleSummary(result, settings);

      expect(summary).toContain('Cycle Enforcement Summary');
      expect(summary).toContain('Cycle length: 5');
      expect(summary).toContain('Complete cycles:');
      expect(summary).toContain('Compliance rate:');
    });
  });

  describe('validateCycleConfiguration', () => {
    it('should accept valid configuration', () => {
      const settings = createSettings();
      const errors = validateCycleConfiguration(settings);
      expect(errors).toHaveLength(0);
    });

    it('should reject zero cycle length', () => {
      const settings = createSettings({ cycleLength: 0 });
      const errors = validateCycleConfiguration(settings);
      expect(errors.some((e) => e.includes('at least 1'))).toBe(true);
    });

    it('should reject empty targets', () => {
      const settings = createSettings({ cycleTensionTargets: [] });
      const errors = validateCycleConfiguration(settings);
      expect(errors.some((e) => e.includes('at least one'))).toBe(true);
    });

    it('should reject mismatched length', () => {
      const settings = createSettings({
        cycleLength: 5,
        cycleTensionTargets: [40, 60, 70], // Only 3 values
      });
      const errors = validateCycleConfiguration(settings);
      expect(errors.some((e) => e.includes('must match'))).toBe(true);
    });

    it('should reject out of range targets', () => {
      const settings = createSettings({
        cycleTensionTargets: [40, 60, 150, 80, 50], // 150 is invalid
      });
      const errors = validateCycleConfiguration(settings);
      expect(errors.some((e) => e.includes('between 0 and 100'))).toBe(true);
    });
  });

  describe('DEFAULT_CYCLE_PATTERN', () => {
    it('should have 5 positions', () => {
      expect(DEFAULT_CYCLE_PATTERN).toHaveLength(5);
    });

    it('should have peak at position 3', () => {
      const maxValue = Math.max(...DEFAULT_CYCLE_PATTERN);
      const peakPosition = DEFAULT_CYCLE_PATTERN.indexOf(maxValue);
      expect(peakPosition).toBe(3);
      expect(maxValue).toBe(80);
    });
  });

  describe('DEFAULT_CYCLE_ENFORCEMENT_CONFIG', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_CYCLE_ENFORCEMENT_CONFIG.deviationTolerance).toBe(15);
      expect(DEFAULT_CYCLE_ENFORCEMENT_CONFIG.minorThreshold).toBe(10);
      expect(DEFAULT_CYCLE_ENFORCEMENT_CONFIG.moderateThreshold).toBe(20);
      expect(DEFAULT_CYCLE_ENFORCEMENT_CONFIG.severeThreshold).toBe(30);
    });
  });
});
