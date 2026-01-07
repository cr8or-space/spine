import { z } from 'zod';

import { IdSchema, TimestampSchema } from '@repo/framework-types';

/**
 * Operations that can be performed on code snippets.
 *
 * - introduce: First appearance of code (creates new part)
 * - replace: Complete replacement of existing part
 * - append: Add code after existing part content
 * - prepend: Add code before existing part content
 * - delete: Remove the part entirely
 */
export const SnippetOperationSchema = z.enum([
  'introduce',
  'replace',
  'append',
  'prepend',
  'delete',
]);
export type SnippetOperation = z.infer<typeof SnippetOperationSchema>;

/**
 * Information about a named part within a tangled file.
 *
 * Parts are named sections of code that can be targeted
 * by subsequent snippets for modification.
 */
export const FilePartSchema = z.object({
  /** Name of the part (e.g., "parseExpression") */
  name: z.string().min(1),
  /** File this part belongs to */
  file: z.string().min(1),
  /** Parent part name if nested (e.g., "parseExpression" for "parseExpression.setup") */
  parentPart: z.string().optional(),
  /** Line range in the tangled output */
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
});
export type FilePart = z.infer<typeof FilePartSchema>;

/**
 * A code snippet embedded in the book prose.
 *
 * Snippets are the atomic units of code in a literate program.
 * They target a specific file (and optionally a named part within it)
 * and specify an operation to perform.
 */
export const SnippetSchema = z.object({
  // Entity identification
  id: IdSchema,
  /** Entity type discriminator */
  entityType: z.literal('snippet').default('snippet'),

  // Human-readable identification
  /** Descriptive name for this snippet */
  name: z.string().min(1),

  // Target specification
  /** Target file path (e.g., "src/parser.ts") */
  file: z.string().min(1),
  /** Target part within the file (e.g., "parseExpression") */
  part: z.string().optional(),

  // Operation
  /** What operation to perform */
  operation: SnippetOperationSchema,

  // Code content
  /** Programming language for syntax highlighting */
  language: z.string().min(1),
  /** The actual code content */
  code: z.string(),

  // Position in book
  /** Chapter where this snippet appears */
  chapterId: IdSchema,
  /** Order within the chapter (for multiple snippets in same chapter) */
  order: z.number().int().nonnegative(),

  // Context
  /** ID of prose that explains this snippet */
  explanationId: IdSchema.optional(),

  // Metadata
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Snippet = z.infer<typeof SnippetSchema>;

/**
 * Minimal snippet for listings and navigation
 */
export const SnippetSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  file: z.string(),
  part: z.string().optional(),
  operation: SnippetOperationSchema,
  language: z.string(),
  /** Number of lines in the snippet */
  lineCount: z.number().int().nonnegative(),
  chapterId: IdSchema,
});
export type SnippetSummary = z.infer<typeof SnippetSummarySchema>;

/**
 * The result of tangling a single file from its snippets.
 *
 * Contains the assembled source code and metadata about
 * which parts exist and their positions.
 */
export const TangledFileSchema = z.object({
  /** Target file path */
  path: z.string().min(1),
  /** Assembled file content */
  content: z.string(),
  /** Parts that exist in this file */
  parts: z.array(FilePartSchema),
  /** IDs of snippets that contributed to this file */
  sourceSnippetIds: z.array(IdSchema),
  /** Hash for change detection */
  contentHash: z.string().optional(),
});
export type TangledFile = z.infer<typeof TangledFileSchema>;

/**
 * Result of a tangle operation across all files
 */
export const TangleResultSchema = z.object({
  /** Whether the tangle completed successfully */
  success: z.boolean(),
  /** Files that were generated */
  files: z.array(TangledFileSchema),
  /** Errors encountered during tangling */
  errors: z.array(
    z.object({
      snippetId: IdSchema.optional(),
      file: z.string().optional(),
      message: z.string(),
    })
  ),
  /** Timestamp of the tangle operation */
  tangledAt: TimestampSchema,
});
export type TangleResult = z.infer<typeof TangleResultSchema>;

/**
 * Snippet history entry for tracking evolution of code
 */
export const SnippetHistoryEntrySchema = z.object({
  /** Snippet that modified this file/part */
  snippetId: IdSchema,
  /** Chapter where the change occurred */
  chapterId: IdSchema,
  /** Operation performed */
  operation: SnippetOperationSchema,
  /** Brief description of the change */
  description: z.string().optional(),
});
export type SnippetHistoryEntry = z.infer<typeof SnippetHistoryEntrySchema>;

/**
 * Evolution history of a file or part
 */
export const FileEvolutionSchema = z.object({
  /** File path */
  file: z.string(),
  /** Part name (if tracking a specific part) */
  part: z.string().optional(),
  /** Ordered history of changes */
  history: z.array(SnippetHistoryEntrySchema),
});
export type FileEvolution = z.infer<typeof FileEvolutionSchema>;
