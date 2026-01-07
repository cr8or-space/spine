import { z } from 'zod';

import { IdSchema, TimestampSchema } from '@repo/framework-types';

/**
 * Status of a checkpoint in the validation workflow.
 *
 * - pending: Not yet validated
 * - validated: Successfully validated (compiles, tests pass)
 * - failed: Validation failed
 * - released: Frozen and immutable (published)
 */
export const CheckpointStatusSchema = z.enum([
  'pending',
  'validated',
  'failed',
  'released',
]);
export type CheckpointStatus = z.infer<typeof CheckpointStatusSchema>;

/**
 * Result of a compilation step
 */
export const CompileResultSchema = z.object({
  /** Whether compilation succeeded */
  success: z.boolean(),
  /** Compiler output (stdout/stderr) */
  output: z.string(),
  /** Parsed compilation errors */
  errors: z
    .array(
      z.object({
        file: z.string(),
        line: z.number().int().positive().optional(),
        column: z.number().int().positive().optional(),
        message: z.string(),
        severity: z.enum(['error', 'warning']),
      })
    )
    .default([]),
  /** Duration in milliseconds */
  durationMs: z.number().int().nonnegative().optional(),
});
export type CompileResult = z.infer<typeof CompileResultSchema>;

/**
 * Result of running tests
 */
export const TestResultSchema = z.object({
  /** Whether all tests passed */
  success: z.boolean(),
  /** Number of tests that passed */
  passed: z.number().int().nonnegative(),
  /** Number of tests that failed */
  failed: z.number().int().nonnegative(),
  /** Number of tests that were skipped */
  skipped: z.number().int().nonnegative().default(0),
  /** Test framework output */
  output: z.string(),
  /** Details of failed tests */
  failures: z
    .array(
      z.object({
        testName: z.string(),
        file: z.string().optional(),
        message: z.string(),
        expected: z.string().optional(),
        actual: z.string().optional(),
      })
    )
    .default([]),
  /** Duration in milliseconds */
  durationMs: z.number().int().nonnegative().optional(),
});
export type TestResult = z.infer<typeof TestResultSchema>;

/**
 * A checkpoint represents a validated state of the tangled codebase.
 *
 * Checkpoints are named points in the book where all tangled code
 * must compile and tests must pass. Once released, a checkpoint's
 * behavior is frozen.
 */
export const CheckpointSchema = z.object({
  // Entity identification
  id: IdSchema,
  /** Entity type discriminator */
  entityType: z.literal('checkpoint').default('checkpoint'),

  // Identification
  /** Human-readable name (e.g., "chapter-03-complete") */
  name: z.string().min(1),
  /** Description of what this checkpoint represents */
  description: z.string().default(''),

  // Position in book
  /** Chapter ID after which this checkpoint occurs */
  chapterId: IdSchema,

  // Status
  /** Current validation status */
  status: CheckpointStatusSchema.default('pending'),

  // Validation results
  /** When validation was last run */
  validatedAt: TimestampSchema.optional(),
  /** Result of compilation */
  compileResult: CompileResultSchema.optional(),
  /** Result of tests */
  testResult: TestResultSchema.optional(),

  // Metadata
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

/**
 * Minimal checkpoint for listings
 */
export const CheckpointSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  chapterId: IdSchema,
  status: CheckpointStatusSchema,
  /** Whether compilation passed */
  compilePassed: z.boolean().optional(),
  /** Whether tests passed */
  testsPassed: z.boolean().optional(),
});
export type CheckpointSummary = z.infer<typeof CheckpointSummarySchema>;

/**
 * Snapshot of tangled files at a checkpoint.
 *
 * Used to preserve the exact state of code when a checkpoint is released,
 * allowing comparison with current state or restoration.
 */
export const CheckpointSnapshotSchema = z.object({
  /** Checkpoint this snapshot belongs to */
  checkpointId: IdSchema,
  /** When the snapshot was taken */
  createdAt: TimestampSchema,
  /** Hash of all tangled files combined */
  contentHash: z.string(),
  /** Individual file hashes */
  fileHashes: z.record(z.string(), z.string()),
  /** Path where snapshot files are stored */
  storagePath: z.string().optional(),
});
export type CheckpointSnapshot = z.infer<typeof CheckpointSnapshotSchema>;

/**
 * Full result of validating a checkpoint
 */
export const CheckpointValidationResultSchema = z.object({
  /** Checkpoint that was validated */
  checkpointId: IdSchema,
  /** Overall success */
  success: z.boolean(),
  /** When validation was run */
  validatedAt: TimestampSchema,
  /** Tangle result (files generated) */
  tangleResult: z.object({
    success: z.boolean(),
    fileCount: z.number().int().nonnegative(),
    errors: z.array(z.string()).default([]),
  }),
  /** Compile result */
  compileResult: CompileResultSchema.optional(),
  /** Test result */
  testResult: TestResultSchema.optional(),
  /** Total duration in milliseconds */
  totalDurationMs: z.number().int().nonnegative(),
});
export type CheckpointValidationResult = z.infer<typeof CheckpointValidationResultSchema>;
