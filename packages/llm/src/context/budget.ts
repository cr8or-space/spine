/**
 * Token budget allocation
 *
 * Manages token budget distribution across different context sections
 * based on task type and available tokens.
 */

import {
  type ContextAssemblyOptions,
  type ContextTaskType,
  type TokenBudget,
  DEFAULT_BUDGET_ALLOCATIONS,
  DEFAULT_CONTEXT_OPTIONS,
} from './types';

/**
 * Calculate token budget for a given task type and total budget
 */
export function calculateBudget(
  taskType: ContextTaskType,
  totalBudget: number,
  customAllocations?: Partial<Omit<TokenBudget, 'total'>>
): TokenBudget {
  const defaults = DEFAULT_BUDGET_ALLOCATIONS[taskType];

  // Calculate total of default allocations
  const defaultTotal =
    defaults.system +
    defaults.bible +
    defaults.recentContent +
    defaults.structure +
    defaults.constraints +
    defaults.task +
    defaults.completion;

  // Scale factor to fit within total budget
  const scale = totalBudget / defaultTotal;

  // Apply scaling and any custom overrides
  const budget: TokenBudget = {
    total: totalBudget,
    system: Math.floor((customAllocations?.system ?? defaults.system) * scale),
    bible: Math.floor((customAllocations?.bible ?? defaults.bible) * scale),
    recentContent: Math.floor((customAllocations?.recentContent ?? defaults.recentContent) * scale),
    structure: Math.floor((customAllocations?.structure ?? defaults.structure) * scale),
    constraints: Math.floor((customAllocations?.constraints ?? defaults.constraints) * scale),
    task: Math.floor((customAllocations?.task ?? defaults.task) * scale),
    completion: Math.floor((customAllocations?.completion ?? defaults.completion) * scale),
  };

  // Ensure we don't exceed total (rounding can cause small overages)
  const allocated =
    budget.system +
    budget.bible +
    budget.recentContent +
    budget.structure +
    budget.constraints +
    budget.task +
    budget.completion;

  // Add any remainder to completion tokens
  if (allocated < totalBudget) {
    budget.completion += totalBudget - allocated;
  }

  return budget;
}

/**
 * Calculate budget from context assembly options
 */
export function budgetFromOptions(options: ContextAssemblyOptions): TokenBudget {
  const totalBudget = options.totalBudget ?? DEFAULT_CONTEXT_OPTIONS.totalBudget;
  return calculateBudget(options.taskType, totalBudget, options.customBudget);
}

/**
 * Check if content fits within a section budget
 */
export function fitsInBudget(tokenCount: number, sectionBudget: number): boolean {
  return tokenCount <= sectionBudget;
}

/**
 * Calculate remaining budget after using some tokens
 */
export function remainingBudget(budget: number, used: number): number {
  return Math.max(0, budget - used);
}

/**
 * Distribute remaining budget across sections proportionally
 *
 * When one section uses less than allocated, redistribute
 * to other sections that may need more.
 */
export function redistributeBudget(
  budget: TokenBudget,
  actualUsage: {
    system?: number;
    bible?: number;
    recentContent?: number;
    structure?: number;
    constraints?: number;
    task?: number;
  }
): TokenBudget {
  // Calculate unused budget from each section
  const unused = {
    system: Math.max(0, budget.system - (actualUsage.system ?? 0)),
    bible: Math.max(0, budget.bible - (actualUsage.bible ?? 0)),
    recentContent: Math.max(0, budget.recentContent - (actualUsage.recentContent ?? 0)),
    structure: Math.max(0, budget.structure - (actualUsage.structure ?? 0)),
    constraints: Math.max(0, budget.constraints - (actualUsage.constraints ?? 0)),
    task: Math.max(0, budget.task - (actualUsage.task ?? 0)),
  };

  const totalUnused = Object.values(unused).reduce((sum, v) => sum + v, 0);

  // Sections that haven't been filled yet (no actual usage reported)
  const unfilledSections = Object.entries(actualUsage)
    .filter(([, v]) => v === undefined)
    .map(([k]) => k as keyof typeof unused);

  if (unfilledSections.length === 0 || totalUnused === 0) {
    return budget;
  }

  // Distribute unused budget proportionally to unfilled sections
  const perSection = Math.floor(totalUnused / unfilledSections.length);

  const newBudget = { ...budget };
  for (const section of unfilledSections) {
    if (section in newBudget) {
      (newBudget as Record<string, number>)[section] += perSection;
    }
  }

  return newBudget;
}

/**
 * Priority order for trimming sections when over budget
 *
 * Lower priority sections are trimmed first.
 */
export const SECTION_PRIORITY: (keyof Omit<TokenBudget, 'total' | 'completion'>)[] = [
  'constraints', // Trim first - can be regenerated
  'structure', // Trim second - ancestor context is optional
  'recentContent', // Trim third - can reduce chapter count
  'bible', // Trim fourth - can switch to summaries
  'task', // Preserve task instructions
  'system', // Always preserve system prompt
];

/**
 * Calculate how much to trim from each section to fit total budget
 *
 * Returns a map of section -> tokens to trim
 */
export function calculateTrimming(
  actualUsage: {
    system: number;
    bible: number;
    recentContent: number;
    structure: number;
    constraints: number;
    task: number;
  },
  totalBudget: number,
  completionReserve: number
): Map<keyof typeof actualUsage, number> {
  const totalUsed = Object.values(actualUsage).reduce((sum, v) => sum + v, 0);
  const available = totalBudget - completionReserve;

  if (totalUsed <= available) {
    return new Map();
  }

  const excess = totalUsed - available;
  const trimming = new Map<keyof typeof actualUsage, number>();
  let remaining = excess;

  // Trim sections in priority order until we're under budget
  for (const section of SECTION_PRIORITY) {
    if (remaining <= 0) break;

    const sectionUsage = actualUsage[section];
    // Don't trim more than 80% of any section
    const maxTrim = Math.floor(sectionUsage * 0.8);
    const toTrim = Math.min(remaining, maxTrim);

    if (toTrim > 0) {
      trimming.set(section, toTrim);
      remaining -= toTrim;
    }
  }

  return trimming;
}

/**
 * Get recommended budget for common model context sizes
 */
export function getModelBudget(modelContextSize: number): number {
  // Reserve 20% for completion and overhead
  return Math.floor(modelContextSize * 0.8);
}

/**
 * Common model context sizes
 */
export const MODEL_CONTEXT_SIZES: Record<string, number> = {
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-16k': 16384,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'claude-3-haiku': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-opus': 200000,
  'llama-3-8b': 8192,
  'llama-3-70b': 8192,
  'mistral-7b': 32768,
  'mixtral-8x7b': 32768,
};

/**
 * Get budget for a model by name
 */
export function getBudgetForModel(modelName: string): number {
  // Try exact match first
  if (modelName in MODEL_CONTEXT_SIZES) {
    return getModelBudget(MODEL_CONTEXT_SIZES[modelName]);
  }

  // Try partial match
  const lowerName = modelName.toLowerCase();
  for (const [key, size] of Object.entries(MODEL_CONTEXT_SIZES)) {
    if (lowerName.includes(key.toLowerCase())) {
      return getModelBudget(size);
    }
  }

  // Default to conservative 8k context
  return getModelBudget(8192);
}
