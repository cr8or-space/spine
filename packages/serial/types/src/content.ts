import { z } from 'zod';

import { ContentAnalysisSchema } from './analysis';
import { IdSchema, TimestampSchema } from '@repo/framework-types';
import { GenerationRecordSchema, ReviewSchema, ContentStatusSchema } from './review';

/**
 * Version source type - how a version was created
 */
export const VersionSourceSchema = z.enum(['generated', 'edited', 'imported', 'rollback']);
export type VersionSource = z.infer<typeof VersionSourceSchema>;

/**
 * Version metadata - additional context about a content version
 */
export const VersionMetadataSchema = z.object({
  /** Model used if generated */
  modelId: z.string().optional(),
  /** Temperature if generated */
  temperature: z.number().min(0).max(2).optional(),
  /** Prompt template used if generated */
  promptTemplateId: z.string().optional(),
  /** Generation stage if generated */
  generationStage: z.enum(['outline', 'beats', 'draft', 'revision', 'self-review']).optional(),
  /** Edit description if edited */
  editDescription: z.string().optional(),
  /** Import source if imported */
  importSource: z.string().optional(),
  /** Version this was rolled back from if rollback */
  rolledBackFrom: z.number().int().positive().optional(),
  /** Whether this version was auto-saved */
  autoSaved: z.boolean().optional(),
  /** Custom tags for organization */
  tags: z.array(z.string()).optional(),
});
export type VersionMetadata = z.infer<typeof VersionMetadataSchema>;

/**
 * Content version - a specific version of prose content
 */
export const ContentVersionSchema = z.object({
  version: z.number().int().positive(),
  text: z.string(),
  /** Word count for this version */
  wordCount: z.number().int().min(0),
  /** How this version was created */
  source: VersionSourceSchema,
  /** Previous version if this is an edit */
  previousVersion: z.number().int().positive().optional(),
  /** Additional metadata about this version */
  metadata: VersionMetadataSchema.optional(),
  createdAt: TimestampSchema,
});
export type ContentVersion = z.infer<typeof ContentVersionSchema>;

/**
 * Content entity - actual prose with versioning and analysis
 *
 * Content is linked to a Structure node and contains the actual
 * written prose. It supports versioning for tracking changes and
 * analysis for quality metrics.
 */
export const ContentSchema = z.object({
  id: IdSchema,
  /** Link to the structure this content belongs to */
  structureId: IdSchema,
  /** Current version number */
  currentVersion: z.number().int().positive(),
  /** All versions of this content */
  versions: z.array(ContentVersionSchema),
  /** Current text (convenience, same as latest version text) */
  text: z.string(),
  /** Current status in the review workflow */
  status: ContentStatusSchema,
  /** Analysis of the current version */
  analysis: ContentAnalysisSchema.optional(),
  /** Reviews performed on this content */
  reviews: z.array(ReviewSchema),
  /** Generation history */
  generationHistory: z.array(GenerationRecordSchema),
  /** Whether this content is locked */
  locked: z.boolean(),
  /** Reason for lock if locked */
  lockReason: z.string().optional(),
  /** Chapter number for display */
  chapterNumber: z.number().int().positive().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  /** When this was published (if published) */
  publishedAt: TimestampSchema.optional(),
});
export type Content = z.infer<typeof ContentSchema>;

/**
 * Content summary for lists and context assembly
 */
export const ContentSummarySchema = z.object({
  id: IdSchema,
  structureId: IdSchema,
  title: z.string(),
  status: ContentStatusSchema,
  wordCount: z.number().int().min(0),
  chapterNumber: z.number().int().positive().optional(),
  /** Brief summary of the content */
  summary: z.string().optional(),
  /** Tension score if analyzed */
  tensionScore: z.number().min(0).max(100).optional(),
  /** Number of unresolved issues */
  issueCount: z.number().int().min(0),
  updatedAt: TimestampSchema,
});
export type ContentSummary = z.infer<typeof ContentSummarySchema>;

/**
 * Diff hunk type - a contiguous change block
 */
export const DiffHunkSchema = z.object({
  /** Type of change */
  type: z.enum(['add', 'remove', 'context']),
  /** Lines in this hunk */
  lines: z.array(z.string()),
  /** Starting line in the source (from) version */
  fromLine: z.number().int().min(0).optional(),
  /** Starting line in the target (to) version */
  toLine: z.number().int().min(0).optional(),
  /** Number of lines in source */
  fromCount: z.number().int().min(0).optional(),
  /** Number of lines in target */
  toCount: z.number().int().min(0).optional(),
});
export type DiffHunk = z.infer<typeof DiffHunkSchema>;

/**
 * Word-level diff for inline display
 */
export const WordDiffSchema = z.object({
  /** Type of change */
  type: z.enum(['add', 'remove', 'unchanged']),
  /** The word or text fragment */
  text: z.string(),
});
export type WordDiff = z.infer<typeof WordDiffSchema>;

/**
 * Content diff between two versions
 */
export const ContentDiffSchema = z.object({
  contentId: IdSchema,
  fromVersion: z.number().int().positive(),
  toVersion: z.number().int().positive(),
  /** Diff hunks (line-level) */
  hunks: z.array(DiffHunkSchema),
  /** Statistics */
  stats: z.object({
    additions: z.number().int().min(0),
    deletions: z.number().int().min(0),
    unchanged: z.number().int().min(0),
    /** Percentage of content changed */
    changePercent: z.number().min(0).max(100),
  }),
  /** Time between versions */
  timeDelta: z.object({
    fromTimestamp: TimestampSchema,
    toTimestamp: TimestampSchema,
    /** Duration in milliseconds */
    durationMs: z.number().int().min(0),
  }).optional(),
  /** Version sources for context */
  sources: z.object({
    from: VersionSourceSchema,
    to: VersionSourceSchema,
  }).optional(),
});
export type ContentDiff = z.infer<typeof ContentDiffSchema>;

/**
 * Version comparison result with word-level diff
 */
export const VersionComparisonSchema = z.object({
  /** The content diff */
  diff: ContentDiffSchema,
  /** Word-level changes for inline display (optional, can be computed on demand) */
  wordDiffs: z.array(
    z.object({
      paragraphIndex: z.number().int().min(0),
      words: z.array(WordDiffSchema),
    })
  ).optional(),
  /** Summary of changes */
  summary: z.object({
    /** Brief description of what changed */
    description: z.string(),
    /** Whether this is a major change */
    isMajor: z.boolean(),
    /** Estimated review time in seconds */
    estimatedReviewTime: z.number().int().min(0),
  }).optional(),
});
export type VersionComparison = z.infer<typeof VersionComparisonSchema>;

/**
 * Create empty content for a structure
 */
export function createEmptyContent(id: string, structureId: string): Content {
  const now = new Date().toISOString();
  return {
    id,
    structureId,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        text: '',
        wordCount: 0,
        source: 'generated',
        createdAt: now,
      },
    ],
    text: '',
    status: 'draft',
    reviews: [],
    generationHistory: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}
