import { describe, expect, it } from 'vitest';

import {
  RuleExceptionSchema,
  WorldRuleCategorySchema,
  WorldRuleSchema,
  WorldRuleSummarySchema,
} from './world-rule';

describe('RuleExceptionSchema', () => {
  it('validates a valid exception', () => {
    const exception = {
      condition: 'During a full moon',
      effect: 'Magic cost is reduced by half',
      applicableTo: ['550e8400-e29b-41d4-a716-446655440000'],
    };
    const result = RuleExceptionSchema.safeParse(exception);
    expect(result.success).toBe(true);
  });

  it('allows exception without applicableTo', () => {
    const exception = {
      condition: 'Near ancient artifacts',
      effect: 'Magic becomes unstable',
    };
    const result = RuleExceptionSchema.safeParse(exception);
    expect(result.success).toBe(true);
  });
});

describe('WorldRuleCategorySchema', () => {
  it('accepts all valid categories', () => {
    const categories = [
      'magic',
      'technology',
      'physics',
      'social',
      'biological',
      'economic',
      'political',
      'metaphysical',
      'other',
    ];
    for (const category of categories) {
      const result = WorldRuleCategorySchema.safeParse(category);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid category', () => {
    const result = WorldRuleCategorySchema.safeParse('supernatural');
    expect(result.success).toBe(false);
  });
});

describe('WorldRuleSchema', () => {
  const validRule = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'world-rule' as const,
    name: 'Conservation of Energy',
    description: 'All magic requires energy proportional to the effect',
    category: 'magic' as const,
    rule: 'Spellcasting depletes the caster\'s stamina. Larger effects require more energy.',
    rationale: 'Prevents unlimited power scaling',
    exceptions: [
      {
        condition: 'Using a ley line conduit',
        effect: 'External energy can be channeled',
      },
    ],
    consequences: 'Exhaustion, unconsciousness, or death if energy debt exceeds reserves',
    publicKnowledge: true,
    relatedRules: ['550e8400-e29b-41d4-a716-446655440002'],
    priority: 80,
    established: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete world rule', () => {
    const result = WorldRuleSchema.safeParse(validRule);
    expect(result.success).toBe(true);
  });

  it('applies default type', () => {
    const ruleWithoutType = {
      id: validRule.id,
      name: validRule.name,
      description: validRule.description,
      category: validRule.category,
      rule: validRule.rule,
      exceptions: validRule.exceptions,
      publicKnowledge: validRule.publicKnowledge,
      relatedRules: validRule.relatedRules,
      established: validRule.established,
      createdAt: validRule.createdAt,
      updatedAt: validRule.updatedAt,
    };
    const result = WorldRuleSchema.safeParse(ruleWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('world-rule');
    }
  });

  it('applies default priority', () => {
    const ruleWithoutPriority = {
      id: validRule.id,
      name: validRule.name,
      description: validRule.description,
      category: validRule.category,
      rule: validRule.rule,
      exceptions: [],
      publicKnowledge: validRule.publicKnowledge,
      relatedRules: [],
      established: validRule.established,
      createdAt: validRule.createdAt,
      updatedAt: validRule.updatedAt,
    };
    const result = WorldRuleSchema.safeParse(ruleWithoutPriority);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(50);
    }
  });

  it('allows spine position fields', () => {
    const ruleWithSpine = {
      ...validRule,
      introducedAt: { nodeId: 'chapter-1', order: 0 },
      retiredAt: { nodeId: 'chapter-25', order: 3 },
    };
    const result = WorldRuleSchema.safeParse(ruleWithSpine);
    expect(result.success).toBe(true);
  });

  it('rejects priority above 100', () => {
    const invalid = { ...validRule, priority: 150 };
    const result = WorldRuleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative priority', () => {
    const invalid = { ...validRule, priority: -10 };
    const result = WorldRuleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const invalid = { ...validRule, name: '' };
    const result = WorldRuleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates all categories', () => {
    const categories = [
      'magic',
      'technology',
      'physics',
      'social',
      'biological',
      'economic',
      'political',
      'metaphysical',
      'other',
    ] as const;
    for (const category of categories) {
      const rule = { ...validRule, category };
      const result = WorldRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    }
  });
});

describe('WorldRuleSummarySchema', () => {
  it('validates a valid summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Conservation of Energy',
      category: 'magic' as const,
      rule: 'Magic requires proportional energy',
      priority: 80,
    };
    const result = WorldRuleSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});
