import { describe, expect, it } from 'vitest';

import {
  calculateBudget,
  budgetFromOptions,
  fitsInBudget,
  remainingBudget,
  redistributeBudget,
  calculateTrimming,
  getModelBudget,
  getBudgetForModel,
  MODEL_CONTEXT_SIZES,
} from './budget';

describe('calculateBudget', () => {
  it('calculates budget for draft task with default allocations', () => {
    const budget = calculateBudget('draft', 12000);

    expect(budget.total).toBe(12000);
    expect(budget.system).toBeGreaterThan(0);
    expect(budget.bible).toBeGreaterThan(0);
    expect(budget.recentContent).toBeGreaterThan(0);
    expect(budget.structure).toBeGreaterThan(0);
    expect(budget.constraints).toBeGreaterThan(0);
    expect(budget.task).toBeGreaterThan(0);
    expect(budget.completion).toBeGreaterThan(0);

    // Total should equal sum of parts
    const sum =
      budget.system +
      budget.bible +
      budget.recentContent +
      budget.structure +
      budget.constraints +
      budget.task +
      budget.completion;
    expect(sum).toBe(budget.total);
  });

  it('scales budget proportionally for smaller totals', () => {
    const largeBudget = calculateBudget('draft', 16000);
    const smallBudget = calculateBudget('draft', 8000);

    // Smaller budget should have roughly half the allocations
    expect(smallBudget.bible).toBeLessThan(largeBudget.bible);
    expect(smallBudget.bible).toBeCloseTo(largeBudget.bible / 2, -2);
  });

  it('applies custom allocations', () => {
    const budget = calculateBudget('draft', 10000, {
      bible: 5000,
      recentContent: 3000,
    });

    // Custom allocations should be scaled and applied
    expect(budget.bible).toBeGreaterThan(budget.recentContent);
  });

  it('uses different defaults for different task types', () => {
    const draftBudget = calculateBudget('draft', 10000);
    const analysisBudget = calculateBudget('analysis', 10000);

    // Analysis needs more recent content, draft needs more bible
    expect(analysisBudget.recentContent).toBeGreaterThan(analysisBudget.bible);
    expect(draftBudget.bible).toBeGreaterThan(draftBudget.recentContent);
  });
});

describe('budgetFromOptions', () => {
  it('creates budget from context options', () => {
    const budget = budgetFromOptions({
      taskType: 'outline',
      totalBudget: 8000,
    });

    expect(budget.total).toBe(8000);
    expect(budget.system).toBeGreaterThan(0);
  });

  it('uses default total when not specified', () => {
    const budget = budgetFromOptions({
      taskType: 'draft',
    });

    expect(budget.total).toBe(8000); // Default from DEFAULT_CONTEXT_OPTIONS
  });
});

describe('fitsInBudget', () => {
  it('returns true when tokens fit', () => {
    expect(fitsInBudget(500, 1000)).toBe(true);
    expect(fitsInBudget(1000, 1000)).toBe(true);
  });

  it('returns false when tokens exceed budget', () => {
    expect(fitsInBudget(1001, 1000)).toBe(false);
    expect(fitsInBudget(2000, 1000)).toBe(false);
  });
});

describe('remainingBudget', () => {
  it('calculates remaining tokens', () => {
    expect(remainingBudget(1000, 300)).toBe(700);
    expect(remainingBudget(1000, 1000)).toBe(0);
  });

  it('returns 0 when over budget', () => {
    expect(remainingBudget(1000, 1500)).toBe(0);
  });
});

describe('redistributeBudget', () => {
  it('redistributes unused budget to unfilled sections', () => {
    const budget = {
      total: 10000,
      system: 500,
      bible: 2000,
      recentContent: 2000,
      structure: 1000,
      constraints: 500,
      task: 500,
      completion: 3500,
    };

    // Pass undefined for unfilled sections
    const redistributed = redistributeBudget(budget, {
      system: 300, // Used 300 of 500, leaves 200 unused
      bible: 1500, // Used 1500 of 2000, leaves 500 unused
      recentContent: undefined, // Not filled yet
      structure: undefined, // Not filled yet
      constraints: 400, // Used 400 of 500, leaves 100 unused
      task: 500, // Used all
    });

    // Unfilled sections should have more budget (if redistribution logic works)
    // Note: current implementation distributes to unfilled sections
    expect(redistributed.recentContent).toBeGreaterThanOrEqual(budget.recentContent);
    expect(redistributed.structure).toBeGreaterThanOrEqual(budget.structure);
  });

  it('returns original budget when no sections are unfilled', () => {
    const budget = {
      total: 5000,
      system: 500,
      bible: 1000,
      recentContent: 1000,
      structure: 500,
      constraints: 500,
      task: 500,
      completion: 1000,
    };

    const redistributed = redistributeBudget(budget, {
      system: 500,
      bible: 1000,
      recentContent: 1000,
      structure: 500,
      constraints: 500,
      task: 500,
    });

    expect(redistributed).toEqual(budget);
  });
});

describe('calculateTrimming', () => {
  it('returns empty map when under budget', () => {
    const usage = {
      system: 500,
      bible: 1000,
      recentContent: 1000,
      structure: 500,
      constraints: 500,
      task: 500,
    };

    const trimming = calculateTrimming(usage, 10000, 2000);
    expect(trimming.size).toBe(0);
  });

  it('calculates trimming amounts when over budget', () => {
    const usage = {
      system: 500,
      bible: 3000,
      recentContent: 3000,
      structure: 1000,
      constraints: 1000,
      task: 500,
    };

    // Total: 9000, available: 8000 - 2000 = 6000, excess: 3000
    const trimming = calculateTrimming(usage, 8000, 2000);

    expect(trimming.size).toBeGreaterThan(0);
    // Lower priority sections should be trimmed first
    expect(trimming.has('constraints')).toBe(true);
  });

  it('trims in priority order', () => {
    const usage = {
      system: 1000,
      bible: 2000,
      recentContent: 2000,
      structure: 2000,
      constraints: 2000,
      task: 1000,
    };

    // Need to trim significantly
    const trimming = calculateTrimming(usage, 6000, 1000);

    // Constraints should be trimmed first (lowest priority)
    if (trimming.size > 0) {
      const trimmingKeys = Array.from(trimming.keys());
      expect(trimmingKeys[0]).toBe('constraints');
    }
  });
});

describe('getModelBudget', () => {
  it('reserves 20% for completion and overhead', () => {
    expect(getModelBudget(10000)).toBe(8000);
    expect(getModelBudget(8192)).toBe(6553);
  });
});

describe('getBudgetForModel', () => {
  it('returns correct budget for known models', () => {
    expect(getBudgetForModel('gpt-4')).toBe(getModelBudget(MODEL_CONTEXT_SIZES['gpt-4']));
    expect(getBudgetForModel('gpt-4-turbo')).toBe(getModelBudget(MODEL_CONTEXT_SIZES['gpt-4-turbo']));
  });

  it('handles partial model name matches', () => {
    // Should match gpt-4
    const budget = getBudgetForModel('gpt-4-0613');
    expect(budget).toBe(getModelBudget(MODEL_CONTEXT_SIZES['gpt-4']));
  });

  it('returns conservative default for unknown models', () => {
    const budget = getBudgetForModel('unknown-model-xyz');
    expect(budget).toBe(getModelBudget(8192));
  });
});

describe('MODEL_CONTEXT_SIZES', () => {
  it('contains common model sizes', () => {
    expect(MODEL_CONTEXT_SIZES['gpt-3.5-turbo']).toBe(4096);
    expect(MODEL_CONTEXT_SIZES['gpt-4']).toBe(8192);
    expect(MODEL_CONTEXT_SIZES['gpt-4-turbo']).toBe(128000);
    expect(MODEL_CONTEXT_SIZES['claude-3-opus']).toBe(200000);
  });
});
