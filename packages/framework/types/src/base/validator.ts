import { z } from 'zod';

import { SpinePositionSchema } from './entity';

/**
 * Phase in the validation pipeline.
 *
 * Validators are organized into phases that run in a specific order:
 * - structural: Basic structure validation (required fields, types)
 * - automated: Rule-based validation (consistency checks, format rules)
 * - computed: AI-assisted or expensive validation (continuity, style)
 */
export const ValidationPhaseSchema = z.enum(['structural', 'automated', 'computed']);
export type ValidationPhase = z.infer<typeof ValidationPhaseSchema>;

/**
 * Result of a single validation check.
 */
export const ValidationResultSchema = z.object({
  /** Whether this check passed, failed, or produced a warning */
  status: z.enum(['pass', 'fail', 'warn']),
  /** Human-readable description of the result */
  message: z.string(),
  /** Optional location in the spine where the issue was found */
  location: SpinePositionSchema.optional(),
  /** Optional suggested fix for the issue */
  fix: z.string().optional(),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

/**
 * Validator interface for implementing validation rules.
 *
 * Validators are composable units that check specific aspects of content
 * or entities. They are organized by phase and can be run in parallel
 * within a phase.
 *
 * @typeParam Context - The type of context the validator operates on
 */
export interface Validator<Context> {
  /** Unique name for this validator */
  name: string;

  /** Phase in which this validator runs */
  phase: ValidationPhase;

  /**
   * Run the validation and return results.
   *
   * @param context - The context to validate against
   * @returns Array of validation results (can be empty if no issues)
   */
  validate(context: Context): Promise<ValidationResult[]>;
}

/**
 * Registry for managing validators.
 *
 * @typeParam Context - The type of context validators operate on
 */
export interface ValidatorRegistry<Context> {
  /**
   * Register a validator.
   */
  register(validator: Validator<Context>): void;

  /**
   * Get all validators for a specific phase.
   */
  getByPhase(phase: ValidationPhase): Validator<Context>[];

  /**
   * Get all registered validators.
   */
  getAll(): Validator<Context>[];

  /**
   * Run all validators and return aggregated results.
   */
  runAll(context: Context): Promise<ValidationResult[]>;

  /**
   * Run validators for a specific phase.
   */
  runPhase(phase: ValidationPhase, context: Context): Promise<ValidationResult[]>;
}
