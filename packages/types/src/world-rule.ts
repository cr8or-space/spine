import { z } from 'zod';

import { IdSchema, TimestampSchema } from './common';

/**
 * Exception to a world rule
 */
export const RuleExceptionSchema = z.object({
  condition: z.string(),
  effect: z.string(),
  /** Which characters/factions can invoke this exception */
  applicableTo: z.array(IdSchema).optional(),
});
export type RuleException = z.infer<typeof RuleExceptionSchema>;

/**
 * World rule entity in the story bible
 *
 * World rules define how the story world works: magic systems,
 * technology limits, social norms, physics alterations, etc.
 */
export const WorldRuleSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  description: z.string(),
  /** Category of rule */
  category: z.enum([
    'magic',
    'technology',
    'physics',
    'social',
    'biological',
    'economic',
    'political',
    'metaphysical',
    'other',
  ]),
  /** The rule statement itself */
  rule: z.string(),
  /** Why this rule exists (in-universe or narrative reason) */
  rationale: z.string().optional(),
  /** Exceptions to this rule */
  exceptions: z.array(RuleExceptionSchema),
  /** Consequences of violating this rule */
  consequences: z.string().optional(),
  /** Whether this rule is known to characters in-story */
  publicKnowledge: z.boolean(),
  /** Related rules (dependencies, conflicts) */
  relatedRules: z.array(IdSchema),
  /** Priority when rules conflict (higher wins) */
  priority: z.number().int().min(0).max(100).default(50),
  /** Whether this rule has been established in published content */
  established: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type WorldRule = z.infer<typeof WorldRuleSchema>;

/**
 * Minimal world rule for context assembly
 */
export const WorldRuleSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  category: WorldRuleSchema.shape.category,
  rule: z.string(),
  priority: z.number(),
});
export type WorldRuleSummary = z.infer<typeof WorldRuleSummarySchema>;
