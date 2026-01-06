import { z } from 'zod';

import { IdSchema, SpinePositionSchema, TimestampSchema } from '@repo/framework-types';

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
 * World rule category discriminator
 */
export const WorldRuleCategorySchema = z.enum([
  'magic',
  'technology',
  'physics',
  'social',
  'biological',
  'economic',
  'political',
  'metaphysical',
  'other',
]);
export type WorldRuleCategory = z.infer<typeof WorldRuleCategorySchema>;

/**
 * World rule entity in the story bible.
 *
 * World rules define how the story world works: magic systems,
 * technology limits, social norms, physics alterations, etc.
 *
 * Extends BaseEntity with spine-aware lifecycle fields:
 * - introducedAt: Position in the spine where the rule was introduced
 * - retiredAt: Position in the spine where the rule was retired (e.g., invalidated)
 */
export const WorldRuleSchema = z.object({
  // BaseEntity fields
  id: IdSchema,
  /** Entity type discriminator for BaseEntity compatibility */
  type: z.literal('world-rule').default('world-rule'),
  /** Position in the spine where this rule was introduced */
  introducedAt: SpinePositionSchema.optional(),
  /** Position in the spine where this rule was retired (e.g., invalidated) */
  retiredAt: SpinePositionSchema.optional(),

  // WorldRule-specific fields
  name: z.string().min(1),
  description: z.string(),
  /** Category of rule */
  category: WorldRuleCategorySchema,
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
