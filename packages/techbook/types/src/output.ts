import { z } from 'zod';

import { IdSchema, TimestampSchema } from '@repo/framework-types';

/**
 * Types of expected outputs
 */
export const OutputTypeSchema = z.enum([
  'text', // Plain text output (stdout, log files)
  'image', // Image output (screenshots, charts)
  'json', // Structured JSON output
  'custom', // Custom comparison using external tool
]);
export type OutputType = z.infer<typeof OutputTypeSchema>;

/**
 * How to compare actual vs expected output
 */
export const ComparatorTypeSchema = z.enum([
  'exact', // Byte-for-byte match
  'text', // Text comparison (ignores trailing whitespace)
  'image-diff', // Image comparison with tolerance
  'json-deep', // Deep equality for JSON
  'regex', // Match against regex pattern
  'custom', // Custom comparison command
]);
export type ComparatorType = z.infer<typeof ComparatorTypeSchema>;

/**
 * Expected output fixture for checkpoint validation.
 *
 * Fixtures define what output should look like when code is run.
 * They can be REPL sessions, command output, images, etc.
 */
export const ExpectedOutputSchema = z.object({
  // Entity identification
  id: IdSchema,
  /** Entity type discriminator */
  entityType: z.literal('expected-output').default('expected-output'),

  // Identification
  /** Human-readable name */
  name: z.string().min(1),
  /** What this fixture validates */
  description: z.string().default(''),

  // Type and comparison
  /** Type of output */
  type: OutputTypeSchema,
  /** How to compare outputs */
  comparator: ComparatorTypeSchema,

  // Checkpoint association
  /** Checkpoint this fixture belongs to */
  checkpointId: IdSchema,

  // Expected value
  /** Path to expected output file (relative to fixtures dir) */
  fixturePath: z.string().min(1),

  // Generation
  /** Command to generate actual output */
  command: z.string().min(1),
  /** Working directory for command (relative to build dir) */
  workingDir: z.string().default('.'),
  /** Where the command writes output (file path or "stdout") */
  outputPath: z.string().default('stdout'),
  /** Environment variables for the command */
  env: z.record(z.string(), z.string()).default({}),

  // Comparison options
  /** Tolerance for image-diff (0-1, percentage difference allowed) */
  tolerance: z.number().min(0).max(1).optional(),
  /** Custom comparison command (for comparator="custom") */
  customComparator: z.string().optional(),
  /** Regex pattern (for comparator="regex") */
  pattern: z.string().optional(),

  // Metadata
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type ExpectedOutput = z.infer<typeof ExpectedOutputSchema>;

/**
 * Result of comparing actual vs expected output
 */
export const OutputComparisonSchema = z.object({
  /** Expected output that was validated */
  expectedOutputId: IdSchema,
  expectedOutputName: z.string(),
  /** Whether outputs match */
  matches: z.boolean(),
  /** Actual output (if captured) */
  actualOutput: z.string().optional(),
  /** Difference description or diff output */
  diff: z.string().optional(),
  /** Path to diff image (for image comparisons) */
  diffImagePath: z.string().optional(),
  /** Error if comparison failed */
  error: z.string().optional(),
  /** Duration in milliseconds */
  durationMs: z.number().int().nonnegative().optional(),
});
export type OutputComparison = z.infer<typeof OutputComparisonSchema>;

/**
 * Summary of all output comparisons for a checkpoint
 */
export const OutputValidationResultSchema = z.object({
  /** Checkpoint that was validated */
  checkpointId: IdSchema,
  /** Whether all outputs matched */
  success: z.boolean(),
  /** Total fixtures checked */
  total: z.number().int().nonnegative(),
  /** Number that matched */
  passed: z.number().int().nonnegative(),
  /** Number that did not match */
  failed: z.number().int().nonnegative(),
  /** Individual comparison results */
  comparisons: z.array(OutputComparisonSchema),
  /** When validation was run */
  validatedAt: TimestampSchema,
});
export type OutputValidationResult = z.infer<typeof OutputValidationResultSchema>;

/**
 * Minimal expected output for listings
 */
export const ExpectedOutputSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  type: OutputTypeSchema,
  comparator: ComparatorTypeSchema,
  checkpointId: IdSchema,
});
export type ExpectedOutputSummary = z.infer<typeof ExpectedOutputSummarySchema>;
