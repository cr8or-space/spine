/**
 * Tests for hook specification module
 */

import { describe, expect, it } from 'vitest';

import type { Hook, HookType, Structure, ChapterType } from '@repo/serial-types';

import {
  checkHookVariety,
  cloneHook,
  createHook,
  extractHooksInOrder,
  findStructuresNeedingHooks,
  getHookRecommendations,
  getHookStats,
  getHookSummary,
  getHookTypeDescription,
  getRecentHooks,
  getRecentHookTypes,
  HOOK_TYPE_DESCRIPTIONS,
  HOOK_TYPES,
  hooksEqual,
  RECOMMENDED_HOOKS_BY_CHAPTER_TYPE,
  shouldHaveHook,
  suggestTargetStrength,
  validateHook,
} from './hooks';

// Helper to create a mock structure
function createStructure(
  id: string,
  type: 'book' | 'arc' | 'chapter' | 'scene',
  title: string,
  hook?: Hook,
  chapterType?: ChapterType,
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
    children: [],
    hook,
    chapterType,
    tensionTarget,
    createdAt: now,
    updatedAt: now,
  };
}

// Helper to create a mock hook
function createMockHook(type: HookType, description: string, targetStrength?: number): Hook {
  return { type, description, targetStrength };
}

describe('hooks', () => {
  describe('constants', () => {
    it('should have all hook types defined', () => {
      expect(HOOK_TYPES).toContain('revelation');
      expect(HOOK_TYPES).toContain('decision');
      expect(HOOK_TYPES).toContain('cliffhanger');
      expect(HOOK_TYPES).toContain('emotional');
      expect(HOOK_TYPES).toContain('question');
      expect(HOOK_TYPES).toContain('twist');
      expect(HOOK_TYPES).toContain('promise');
      expect(HOOK_TYPES).toHaveLength(7);
    });

    it('should have descriptions for all hook types', () => {
      for (const hookType of HOOK_TYPES) {
        expect(HOOK_TYPE_DESCRIPTIONS[hookType]).toBeDefined();
        expect(HOOK_TYPE_DESCRIPTIONS[hookType].length).toBeGreaterThan(0);
      }
    });

    it('should have recommendations for all chapter types', () => {
      const chapterTypes: ChapterType[] = [
        'action', 'character', 'worldbuilding', 'dialogue',
        'introspection', 'transition', 'climax', 'resolution',
      ];

      for (const chapterType of chapterTypes) {
        expect(RECOMMENDED_HOOKS_BY_CHAPTER_TYPE[chapterType]).toBeDefined();
        expect(RECOMMENDED_HOOKS_BY_CHAPTER_TYPE[chapterType].length).toBeGreaterThan(0);
      }
    });
  });

  describe('createHook', () => {
    it('should create a hook with required fields', () => {
      const hook = createHook('cliffhanger', 'Hero falls off cliff');

      expect(hook.type).toBe('cliffhanger');
      expect(hook.description).toBe('Hero falls off cliff');
      expect(hook.targetStrength).toBeUndefined();
    });

    it('should create a hook with target strength', () => {
      const hook = createHook('revelation', 'Villain revealed', 85);

      expect(hook.type).toBe('revelation');
      expect(hook.targetStrength).toBe(85);
    });
  });

  describe('validateHook', () => {
    it('should pass for valid hook', () => {
      const hook = createMockHook('cliffhanger', 'Exciting ending', 75);

      const result = validateHook(hook);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail for invalid hook type', () => {
      const hook = { type: 'invalid' as HookType, description: 'Test' };

      const result = validateHook(hook);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.field === 'type')).toBe(true);
    });

    it('should fail for empty description', () => {
      const hook = createMockHook('cliffhanger', '');

      const result = validateHook(hook);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.field === 'description')).toBe(true);
    });

    it('should fail for out-of-range target strength', () => {
      const hookLow = createMockHook('cliffhanger', 'Test', -10);
      const hookHigh = createMockHook('cliffhanger', 'Test', 150);

      expect(validateHook(hookLow).valid).toBe(false);
      expect(validateHook(hookHigh).valid).toBe(false);
    });
  });

  describe('getHookTypeDescription', () => {
    it('should return description for hook type', () => {
      const desc = getHookTypeDescription('cliffhanger');

      expect(desc).toContain('danger');
    });
  });

  describe('shouldHaveHook', () => {
    it('should return true for chapters', () => {
      const chapter = createStructure('ch-1', 'chapter', 'Chapter 1');

      expect(shouldHaveHook(chapter)).toBe(true);
    });

    it('should return false for books', () => {
      const book = createStructure('book-1', 'book', 'Book 1');

      expect(shouldHaveHook(book)).toBe(false);
    });

    it('should return false for arcs', () => {
      const arc = createStructure('arc-1', 'arc', 'Arc 1');

      expect(shouldHaveHook(arc)).toBe(false);
    });

    it('should return false for scenes', () => {
      const scene = createStructure('scene-1', 'scene', 'Scene 1');

      expect(shouldHaveHook(scene)).toBe(false);
    });
  });

  describe('findStructuresNeedingHooks', () => {
    it('should find chapters without hooks', () => {
      const structures = [
        createStructure('ch-1', 'chapter', 'Chapter 1', createMockHook('cliffhanger', 'Test')),
        createStructure('ch-2', 'chapter', 'Chapter 2'), // No hook
        createStructure('ch-3', 'chapter', 'Chapter 3'), // No hook
        createStructure('book-1', 'book', 'Book 1'), // Books don't need hooks
      ];

      const needingHooks = findStructuresNeedingHooks(structures);

      expect(needingHooks).toHaveLength(2);
      expect(needingHooks.map((s) => s.id)).toEqual(['ch-2', 'ch-3']);
    });
  });

  describe('getHookRecommendations', () => {
    it('should recommend hooks for chapter type', () => {
      const chapter = createStructure('ch-1', 'chapter', 'Chapter 1', undefined, 'action');

      const recommendations = getHookRecommendations(chapter);

      expect(recommendations.length).toBeGreaterThan(0);
      // Action chapters should have cliffhanger as a strong recommendation
      const cliffhangerRec = recommendations.find((r) => r.type === 'cliffhanger');
      expect(cliffhangerRec).toBeDefined();
    });

    it('should consider recent hooks for variety', () => {
      const chapter = createStructure('ch-1', 'chapter', 'Chapter 1', undefined, 'action');
      const recentHooks: HookType[] = ['cliffhanger', 'cliffhanger'];

      const recommendations = getHookRecommendations(chapter, recentHooks);

      // Cliffhanger should be lower priority due to recent use
      const cliffhangerRec = recommendations.find((r) => r.type === 'cliffhanger');
      expect(cliffhangerRec?.strength).not.toBe('strong');
    });

    it('should prefer unused hook types', () => {
      const chapter = createStructure('ch-1', 'chapter', 'Chapter 1');
      const recentHooks: HookType[] = ['cliffhanger', 'revelation', 'decision'];

      const recommendations = getHookRecommendations(chapter, recentHooks);

      // First recommendations should prefer unused types
      const strongRecs = recommendations.filter((r) => r.strength === 'strong' || r.strength === 'moderate');
      const unusedInRecommended = strongRecs.some((r) =>
        !recentHooks.includes(r.type) || recentHooks.filter((h) => h === r.type).length === 0
      );
      expect(unusedInRecommended).toBe(true);
    });
  });

  describe('getHookStats', () => {
    it('should calculate hook statistics', () => {
      const structures = [
        createStructure('ch-1', 'chapter', 'Ch1', createMockHook('cliffhanger', 'Test', 80)),
        createStructure('ch-2', 'chapter', 'Ch2', createMockHook('revelation', 'Test', 70)),
        createStructure('ch-3', 'chapter', 'Ch3', createMockHook('cliffhanger', 'Test')),
        createStructure('ch-4', 'chapter', 'Ch4'), // No hook
        createStructure('book-1', 'book', 'Book'), // Not counted
      ];

      const stats = getHookStats(structures);

      expect(stats.totalStructures).toBe(4); // Only chapters
      expect(stats.withHooks).toBe(3);
      expect(stats.withoutHooks).toBe(1);
      expect(stats.hookCoverage).toBe(75);
      expect(stats.typeDistribution.cliffhanger).toBe(2);
      expect(stats.typeDistribution.revelation).toBe(1);
      expect(stats.averageTargetStrength).toBe(75); // (80 + 70) / 2
    });

    it('should handle empty structures', () => {
      const stats = getHookStats([]);

      expect(stats.totalStructures).toBe(0);
      expect(stats.hookCoverage).toBe(100); // No chapters = 100% coverage
    });
  });

  describe('checkHookVariety', () => {
    it('should pass for varied hooks', () => {
      const hooks = [
        createMockHook('cliffhanger', 'Test'),
        createMockHook('revelation', 'Test'),
        createMockHook('decision', 'Test'),
      ];

      const issues = checkHookVariety(hooks);

      expect(issues).toHaveLength(0);
    });

    it('should detect consecutive same-type hooks', () => {
      const hooks = [
        createMockHook('cliffhanger', 'Test'),
        createMockHook('cliffhanger', 'Test'),
        createMockHook('cliffhanger', 'Test'),
      ];

      const issues = checkHookVariety(hooks, 2);

      expect(issues.some((i) => i.includes('consecutive'))).toBe(true);
    });

    it('should detect overused hook type', () => {
      const hooks = [
        createMockHook('cliffhanger', 'Test'),
        createMockHook('cliffhanger', 'Test'),
        createMockHook('cliffhanger', 'Test'),
        createMockHook('revelation', 'Test'),
      ];

      const issues = checkHookVariety(hooks);

      expect(issues.some((i) => i.includes('overused'))).toBe(true);
    });

    it('should detect limited variety', () => {
      const hooks = [
        createMockHook('cliffhanger', 'Test'),
        createMockHook('revelation', 'Test'),
        createMockHook('cliffhanger', 'Test'),
        createMockHook('revelation', 'Test'),
        createMockHook('cliffhanger', 'Test'),
      ];

      const issues = checkHookVariety(hooks);

      expect(issues.some((i) => i.includes('variety') || i.includes('never used'))).toBe(true);
    });
  });

  describe('suggestTargetStrength', () => {
    it('should suggest based on tension target', () => {
      const chapter = createStructure('ch-1', 'chapter', 'Chapter', undefined, undefined, 70);

      const strength = suggestTargetStrength(chapter, 0, 10);

      expect(strength).toBe(70);
    });

    it('should boost strength for climax chapters', () => {
      const chapter = createStructure('ch-1', 'chapter', 'Chapter', undefined, 'climax', 60);

      const strength = suggestTargetStrength(chapter, 0, 10);

      expect(strength).toBeGreaterThanOrEqual(85);
    });

    it('should reduce strength for transition chapters', () => {
      const chapter = createStructure('ch-1', 'chapter', 'Chapter', undefined, 'transition', 80);

      const strength = suggestTargetStrength(chapter, 0, 10);

      expect(strength).toBeLessThanOrEqual(65);
    });

    it('should boost end-of-arc resolution chapters', () => {
      const chapter = createStructure('ch-1', 'chapter', 'Chapter', undefined, 'resolution', 50);

      // Last chapter in series
      const strength = suggestTargetStrength(chapter, 9, 10);

      expect(strength).toBeGreaterThanOrEqual(75);
    });
  });

  describe('cloneHook', () => {
    it('should create a copy of a hook', () => {
      const original = createMockHook('cliffhanger', 'Original', 80);

      const cloned = cloneHook(original);

      expect(cloned.type).toBe(original.type);
      expect(cloned.description).toBe(original.description);
      expect(cloned.targetStrength).toBe(original.targetStrength);
      expect(cloned).not.toBe(original); // Different object
    });
  });

  describe('hooksEqual', () => {
    it('should return true for equal hooks', () => {
      const a = createMockHook('cliffhanger', 'Test', 80);
      const b = createMockHook('cliffhanger', 'Test', 80);

      expect(hooksEqual(a, b)).toBe(true);
    });

    it('should return false for different hooks', () => {
      const a = createMockHook('cliffhanger', 'Test', 80);
      const b = createMockHook('revelation', 'Test', 80);

      expect(hooksEqual(a, b)).toBe(false);
    });

    it('should handle undefined hooks', () => {
      const hook = createMockHook('cliffhanger', 'Test');

      expect(hooksEqual(undefined, undefined)).toBe(true);
      expect(hooksEqual(hook, undefined)).toBe(false);
      expect(hooksEqual(undefined, hook)).toBe(false);
    });
  });

  describe('getHookSummary', () => {
    it('should format hook without strength', () => {
      const hook = createMockHook('cliffhanger', 'Hero falls');

      const summary = getHookSummary(hook);

      expect(summary).toBe('[cliffhanger]: Hero falls');
    });

    it('should format hook with strength', () => {
      const hook = createMockHook('revelation', 'Big reveal', 85);

      const summary = getHookSummary(hook);

      expect(summary).toBe('[revelation] (target: 85): Big reveal');
    });
  });

  describe('extractHooksInOrder', () => {
    it('should extract hooks from structures', () => {
      const structures = [
        createStructure('ch-1', 'chapter', 'Ch1', createMockHook('cliffhanger', 'Test1')),
        createStructure('ch-2', 'chapter', 'Ch2'), // No hook
        createStructure('ch-3', 'chapter', 'Ch3', createMockHook('revelation', 'Test2')),
      ];

      const hooks = extractHooksInOrder(structures);

      expect(hooks).toHaveLength(2);
      expect(hooks[0].type).toBe('cliffhanger');
      expect(hooks[1].type).toBe('revelation');
    });
  });

  describe('getRecentHooks/getRecentHookTypes', () => {
    it('should return recent hooks', () => {
      const structures = [
        createStructure('ch-1', 'chapter', 'Ch1', createMockHook('cliffhanger', 'Test')),
        createStructure('ch-2', 'chapter', 'Ch2', createMockHook('revelation', 'Test')),
        createStructure('ch-3', 'chapter', 'Ch3', createMockHook('decision', 'Test')),
        createStructure('ch-4', 'chapter', 'Ch4', createMockHook('emotional', 'Test')),
      ];

      const recent = getRecentHooks(structures, 2);

      expect(recent).toHaveLength(2);
      expect(recent[0].type).toBe('decision');
      expect(recent[1].type).toBe('emotional');
    });

    it('should return recent hook types', () => {
      const structures = [
        createStructure('ch-1', 'chapter', 'Ch1', createMockHook('cliffhanger', 'Test')),
        createStructure('ch-2', 'chapter', 'Ch2', createMockHook('revelation', 'Test')),
        createStructure('ch-3', 'chapter', 'Ch3', createMockHook('decision', 'Test')),
      ];

      const types = getRecentHookTypes(structures, 2);

      expect(types).toEqual(['revelation', 'decision']);
    });
  });
});
