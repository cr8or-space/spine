import { z } from 'zod';

import { IdSchema } from '../common';

/**
 * Constraint types that can be applied across domains.
 *
 * These represent categories of rules that content must follow:
 * - fact: Something that is true (e.g., "Character X has blue eyes")
 * - rule: A behavioral or world rule (e.g., "Magic requires concentration")
 * - relationship: A connection between entities (e.g., "A is B's mentor")
 * - timeline: A temporal constraint (e.g., "Event A happened before B")
 * - style: A stylistic requirement (e.g., "Use present tense")
 * - structural: A structural requirement (e.g., "Must have at least 3 scenes")
 */
export const ConstraintTypeSchema = z.enum([
  'fact',
  'rule',
  'relationship',
  'timeline',
  'style',
  'structural',
]);
export type ConstraintType = z.infer<typeof ConstraintTypeSchema>;

/**
 * Constraint severity levels.
 *
 * Determines how violations should be handled:
 * - error: Violation must be fixed before proceeding
 * - warning: Violation should be reviewed but can be ignored
 * - info: Informational only, no action required
 */
export const ConstraintSeveritySchema = z.enum(['error', 'warning', 'info']);
export type ConstraintSeverity = z.infer<typeof ConstraintSeveritySchema>;

/**
 * A constraint definition.
 *
 * Constraints are rules that content must follow. They are extracted from
 * entities (story bible entries, glossary items, etc.) and used to:
 * - Guide LLM generation
 * - Validate content for consistency
 * - Track dependencies between content and entities
 *
 * The constraint system is domain-agnostic. Domains define what entity types
 * produce constraints and how to extract them.
 */
export const ConstraintSchema = z.object({
  /** Unique identifier for this constraint */
  id: IdSchema,

  /** Type of constraint */
  type: ConstraintTypeSchema,

  /** Entity ID that is the source of this constraint */
  sourceEntityId: IdSchema,

  /** Entity type of the source (domain-specific, e.g., 'character', 'concept') */
  sourceEntityType: z.string(),

  /** Human-readable statement of the constraint */
  statement: z.string(),

  /** Priority for conflict resolution (higher = more important) */
  priority: z.number().int().min(0).max(100).default(50),

  /** Severity of violations */
  severity: ConstraintSeveritySchema.default('warning'),

  /** Whether this constraint is currently active */
  active: z.boolean().default(true),

  /** Optional scope limiting where this constraint applies */
  scope: z
    .object({
      /** Only applies after this spine position */
      after: IdSchema.optional(),
      /** Only applies before this spine position */
      before: IdSchema.optional(),
      /** Only applies to these content types */
      contentTypes: z.array(z.string()).optional(),
    })
    .optional(),
});
export type Constraint = z.infer<typeof ConstraintSchema>;

/**
 * Result of checking a constraint against content.
 */
export const ConstraintCheckResultSchema = z.object({
  /** The constraint that was checked */
  constraintId: IdSchema,

  /** Whether the constraint was satisfied */
  satisfied: z.boolean(),

  /** Confidence in the result (0-1) for computed/LLM checks */
  confidence: z.number().min(0).max(1).optional(),

  /** Human-readable explanation of the result */
  explanation: z.string().optional(),

  /** Location in content where violation was found (if any) */
  violationLocation: z
    .object({
      /** Character offset where violation starts */
      start: z.number().int().min(0),
      /** Character offset where violation ends */
      end: z.number().int().min(0),
    })
    .optional(),

  /** Suggested fix for the violation */
  suggestedFix: z.string().optional(),
});
export type ConstraintCheckResult = z.infer<typeof ConstraintCheckResultSchema>;

/**
 * Interface for constraint extractors.
 *
 * Domains implement this to extract constraints from their entity types.
 * For example, the serial domain extracts constraints from Characters
 * like "has blue eyes" or "speaks with a French accent".
 *
 * @typeParam Entity - The entity type this extractor handles
 */
export interface ConstraintExtractor<Entity> {
  /** Entity type this extractor handles */
  entityType: string;

  /**
   * Extract constraints from an entity.
   *
   * @param entity - The entity to extract constraints from
   * @returns Array of constraints (without id, which is assigned by the system)
   */
  extract(entity: Entity): Omit<Constraint, 'id'>[];
}
