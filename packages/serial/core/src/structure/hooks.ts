/**
 * Hook specification for story structure
 *
 * Hooks are the compelling endings that keep readers engaged between chapters.
 * This module handles the specification side (what hooks are planned/targeted),
 * while analysis/hook-management.ts handles the analysis side (what hooks were detected).
 *
 * Provides functions for:
 * - Hook creation and validation
 * - Hook type utilities
 * - Finding structures needing hooks
 * - Hook recommendations based on structure context
 */

import type { Hook, HookType, Structure, ChapterType } from '@repo/serial-types';

/**
 * All valid hook types
 */
export const HOOK_TYPES: HookType[] = [
  'revelation',
  'decision',
  'cliffhanger',
  'emotional',
  'question',
  'twist',
  'promise',
];

/**
 * Hook type descriptions for user guidance
 */
export const HOOK_TYPE_DESCRIPTIONS: Record<HookType, string> = {
  revelation: 'A significant piece of information is revealed to the reader or character',
  decision: 'A character faces a crucial choice with unclear consequences',
  cliffhanger: 'Physical danger or immediate threat creates urgency',
  emotional: 'An emotional moment creates empathy and investment',
  question: 'A mystery or puzzle is raised that demands answers',
  twist: 'An unexpected turn challenges assumptions',
  promise: 'A hint of exciting developments creates anticipation',
};

/**
 * Recommended hook types based on chapter type
 * These are suggestions, not requirements
 */
export const RECOMMENDED_HOOKS_BY_CHAPTER_TYPE: Record<ChapterType, HookType[]> = {
  action: ['cliffhanger', 'twist', 'revelation'],
  character: ['emotional', 'decision', 'revelation'],
  worldbuilding: ['revelation', 'question', 'promise'],
  dialogue: ['decision', 'emotional', 'revelation'],
  introspection: ['decision', 'emotional', 'revelation'],
  transition: ['promise', 'question', 'emotional'],
  climax: ['cliffhanger', 'twist', 'revelation'],
  resolution: ['emotional', 'promise', 'revelation'],
};

/**
 * Hook validation result
 */
export interface HookValidationResult {
  valid: boolean;
  issues: HookValidationIssue[];
}

/**
 * Individual hook validation issue
 */
export interface HookValidationIssue {
  field: 'type' | 'description' | 'targetStrength';
  message: string;
}

/**
 * Hook recommendation
 */
export interface HookRecommendation {
  type: HookType;
  reason: string;
  strength: 'strong' | 'moderate' | 'possible';
}

/**
 * Hook statistics for a collection of structures
 */
export interface HookStats {
  /** Total structures analyzed */
  totalStructures: number;
  /** Structures with hooks */
  withHooks: number;
  /** Structures without hooks */
  withoutHooks: number;
  /** Percentage with hooks */
  hookCoverage: number;
  /** Distribution by hook type */
  typeDistribution: Record<HookType, number>;
  /** Average target strength (for hooks with targets) */
  averageTargetStrength: number;
}

/**
 * Create a new hook specification
 *
 * @param type - Hook type
 * @param description - Description of the hook
 * @param targetStrength - Optional target strength (0-100)
 * @returns New hook object
 */
export function createHook(
  type: HookType,
  description: string,
  targetStrength?: number
): Hook {
  return {
    type,
    description,
    targetStrength,
  };
}

/**
 * Validate a hook specification
 *
 * @param hook - Hook to validate
 * @returns Validation result
 */
export function validateHook(hook: Hook): HookValidationResult {
  const issues: HookValidationIssue[] = [];

  // Validate type
  if (!HOOK_TYPES.includes(hook.type)) {
    issues.push({
      field: 'type',
      message: `Invalid hook type: ${hook.type}. Valid types: ${HOOK_TYPES.join(', ')}`,
    });
  }

  // Validate description
  if (!hook.description.trim()) {
    issues.push({
      field: 'description',
      message: 'Hook description cannot be empty',
    });
  }

  // Validate target strength
  if (hook.targetStrength !== undefined) {
    if (hook.targetStrength < 0 || hook.targetStrength > 100) {
      issues.push({
        field: 'targetStrength',
        message: 'Target strength must be between 0 and 100',
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get description for a hook type
 *
 * @param type - Hook type
 * @returns Description string
 */
export function getHookTypeDescription(type: HookType): string {
  return HOOK_TYPE_DESCRIPTIONS[type];
}

/**
 * Check if a structure should have a hook
 *
 * Chapters and some scenes typically need hooks.
 *
 * @param structure - Structure to check
 * @returns true if the structure should have a hook
 */
export function shouldHaveHook(structure: Structure): boolean {
  // Chapters always need hooks
  if (structure.type === 'chapter') {
    return true;
  }

  // Scene at end of chapter might need a hook
  // (This is a simplified heuristic; actual logic may depend on context)
  if (structure.type === 'scene') {
    // For now, we don't require hooks on scenes
    return false;
  }

  // Books and arcs don't have hooks in the traditional sense
  return false;
}

/**
 * Find structures that need hooks but don't have them
 *
 * @param structures - Structures to analyze
 * @returns Structures needing hooks
 */
export function findStructuresNeedingHooks(structures: Structure[]): Structure[] {
  return structures.filter((s) => shouldHaveHook(s) && !s.hook);
}

/**
 * Get recommended hook types for a structure
 *
 * @param structure - Structure to get recommendations for
 * @param recentHooks - Recent hook types used (for variety consideration)
 * @returns Array of recommendations sorted by strength
 */
export function getHookRecommendations(
  structure: Structure,
  recentHooks: HookType[] = []
): HookRecommendation[] {
  const recommendations: HookRecommendation[] = [];

  // Get base recommendations from chapter type
  const baseRecommendations = structure.chapterType
    ? RECOMMENDED_HOOKS_BY_CHAPTER_TYPE[structure.chapterType]
    : [];

  // Count recent hook usage
  const recentCounts = new Map<HookType, number>();
  for (const hook of recentHooks) {
    recentCounts.set(hook, (recentCounts.get(hook) ?? 0) + 1);
  }

  // Score each hook type
  for (const hookType of HOOK_TYPES) {
    const isBaseRecommendation = baseRecommendations.includes(hookType);
    const recentUsage = recentCounts.get(hookType) ?? 0;

    // Determine strength based on factors
    let strength: 'strong' | 'moderate' | 'possible';
    let reason: string;

    if (isBaseRecommendation && recentUsage === 0) {
      strength = 'strong';
      reason = `Fits ${structure.chapterType ?? 'this'} chapter type and hasn't been used recently`;
    } else if (isBaseRecommendation) {
      strength = recentUsage >= 2 ? 'possible' : 'moderate';
      reason = `Fits ${structure.chapterType ?? 'this'} chapter type but used ${recentUsage} time(s) recently`;
    } else if (recentUsage === 0) {
      strength = 'moderate';
      reason = 'Would add variety (not used recently)';
    } else {
      strength = 'possible';
      reason = `Used ${recentUsage} time(s) recently`;
    }

    recommendations.push({
      type: hookType,
      reason,
      strength,
    });
  }

  // Sort by strength (strong first, then moderate, then possible)
  const strengthOrder = { strong: 0, moderate: 1, possible: 2 };
  recommendations.sort((a, b) => strengthOrder[a.strength] - strengthOrder[b.strength]);

  return recommendations;
}

/**
 * Get hook statistics for a collection of structures
 *
 * @param structures - Structures to analyze
 * @returns Hook statistics
 */
export function getHookStats(structures: Structure[]): HookStats {
  // Filter to structures that should have hooks
  const hookRequired = structures.filter(shouldHaveHook);

  const withHooks = hookRequired.filter((s) => s.hook);
  const withoutHooks = hookRequired.filter((s) => !s.hook);

  // Calculate type distribution
  const typeDistribution: Record<HookType, number> = {
    revelation: 0,
    decision: 0,
    cliffhanger: 0,
    emotional: 0,
    question: 0,
    twist: 0,
    promise: 0,
  };

  let totalTargetStrength = 0;
  let countWithTargetStrength = 0;

  for (const structure of withHooks) {
    if (structure.hook) {
      typeDistribution[structure.hook.type]++;
      if (structure.hook.targetStrength !== undefined) {
        totalTargetStrength += structure.hook.targetStrength;
        countWithTargetStrength++;
      }
    }
  }

  const averageTargetStrength = countWithTargetStrength > 0
    ? Math.round(totalTargetStrength / countWithTargetStrength)
    : 0;

  return {
    totalStructures: hookRequired.length,
    withHooks: withHooks.length,
    withoutHooks: withoutHooks.length,
    hookCoverage: hookRequired.length > 0
      ? Math.round((withHooks.length / hookRequired.length) * 100)
      : 100,
    typeDistribution,
    averageTargetStrength,
  };
}

/**
 * Check for hook variety issues
 *
 * @param hooks - Recent hooks in order
 * @param maxConsecutive - Maximum consecutive same-type hooks allowed
 * @returns Array of issue descriptions
 */
export function checkHookVariety(
  hooks: Hook[],
  maxConsecutive: number = 2
): string[] {
  const issues: string[] = [];

  if (hooks.length < 2) {
    return issues;
  }

  // Check consecutive usage
  let consecutiveCount = 1;
  let lastType = hooks[0].type;

  for (let i = 1; i < hooks.length; i++) {
    if (hooks[i].type === lastType) {
      consecutiveCount++;
      if (consecutiveCount > maxConsecutive) {
        issues.push(
          `Hook type "${lastType}" used ${consecutiveCount} times consecutively (max: ${maxConsecutive})`
        );
      }
    } else {
      consecutiveCount = 1;
      lastType = hooks[i].type;
    }
  }

  // Check overall distribution
  const typeCounts = new Map<HookType, number>();
  for (const hook of hooks) {
    typeCounts.set(hook.type, (typeCounts.get(hook.type) ?? 0) + 1);
  }

  // Check for dominant type
  for (const [type, count] of typeCounts.entries()) {
    const percentage = (count / hooks.length) * 100;
    if (percentage > 50 && hooks.length >= 4) {
      issues.push(
        `Hook type "${type}" is overused (${Math.round(percentage)}% of chapters)`
      );
    }
  }

  // Check for unused types
  const unusedTypes = HOOK_TYPES.filter((t) => !typeCounts.has(t) || typeCounts.get(t) === 0);
  if (unusedTypes.length >= 4 && hooks.length >= 5) {
    issues.push(
      `Limited variety: ${unusedTypes.length} hook types never used (${unusedTypes.join(', ')})`
    );
  }

  return issues;
}

/**
 * Suggest a target strength based on chapter position and tension target
 *
 * @param structure - Structure to suggest for
 * @param position - Position in chapter sequence (0-based)
 * @param totalChapters - Total number of chapters
 * @returns Suggested target strength (0-100)
 */
export function suggestTargetStrength(
  structure: Structure,
  position: number,
  totalChapters: number
): number {
  // Base strength from tension target
  let baseStrength = structure.tensionTarget ?? 60;

  // Adjust based on chapter type
  if (structure.chapterType) {
    switch (structure.chapterType) {
      case 'climax':
        baseStrength = Math.max(baseStrength, 85);
        break;
      case 'action':
        baseStrength = Math.max(baseStrength, 70);
        break;
      case 'transition':
        baseStrength = Math.min(baseStrength, 65);
        break;
      case 'resolution': {
        // End of arc might need strong hook for next arc
        const isEndOfSection = position === totalChapters - 1;
        baseStrength = isEndOfSection ? Math.max(baseStrength, 75) : Math.min(baseStrength, 55);
        break;
      }
    }
  }

  // Ensure within range
  return Math.max(0, Math.min(100, Math.round(baseStrength)));
}

/**
 * Clone a hook (useful for templates)
 *
 * @param hook - Hook to clone
 * @returns New hook object
 */
export function cloneHook(hook: Hook): Hook {
  return {
    type: hook.type,
    description: hook.description,
    targetStrength: hook.targetStrength,
  };
}

/**
 * Compare two hooks for equality
 *
 * @param a - First hook
 * @param b - Second hook
 * @returns true if hooks are equal
 */
export function hooksEqual(a: Hook | undefined, b: Hook | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;

  return (
    a.type === b.type &&
    a.description === b.description &&
    a.targetStrength === b.targetStrength
  );
}

/**
 * Get a summary string for a hook
 *
 * @param hook - Hook to summarize
 * @returns Summary string
 */
export function getHookSummary(hook: Hook): string {
  const strengthPart = hook.targetStrength !== undefined
    ? ` (target: ${hook.targetStrength})`
    : '';
  return `[${hook.type}]${strengthPart}: ${hook.description}`;
}

/**
 * Extract hooks from structures in order
 *
 * @param structures - Structures to extract from (should be in order)
 * @returns Array of hooks (only from structures that have them)
 */
export function extractHooksInOrder(structures: Structure[]): Hook[] {
  return structures
    .filter((s) => s.hook !== undefined)
    .map((s) => s.hook!);
}

/**
 * Get recent hooks for variety analysis
 *
 * @param structures - Structures in reading order
 * @param count - Number of recent hooks to return
 * @returns Recent hooks (most recent last)
 */
export function getRecentHooks(structures: Structure[], count: number): Hook[] {
  const allHooks = extractHooksInOrder(structures);
  return allHooks.slice(-count);
}

/**
 * Get recent hook types for variety analysis
 *
 * @param structures - Structures in reading order
 * @param count - Number of recent hooks to consider
 * @returns Recent hook types (most recent last)
 */
export function getRecentHookTypes(structures: Structure[], count: number): HookType[] {
  return getRecentHooks(structures, count).map((h) => h.type);
}
