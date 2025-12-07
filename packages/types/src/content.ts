import { z } from 'zod';

import { ContentAnalysisSchema } from './analysis';
import { IdSchema, TimestampSchema } from './common';
import { GenerationRecordSchema, ReviewSchema, ContentStatusSchema } from './review';

/**
 * Content version - a specific version of prose content
 */
export const ContentVersionSchema = z.object({
  version: z.number().int().positive(),
  text: z.string(),
  /** Word count for this version */
  wordCount: z.number().int().min(0),
  /** How this version was created */
  source: z.enum(['generated', 'edited', 'imported']),
  /** Previous version if this is an edit */
  previousVersion: z.number().int().positive().optional(),
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
 * Content diff between two versions
 */
export const ContentDiffSchema = z.object({
  contentId: IdSchema,
  fromVersion: z.number().int().positive(),
  toVersion: z.number().int().positive(),
  /** Diff hunks */
  hunks: z.array(
    z.object({
      type: z.enum(['add', 'remove', 'context']),
      lines: z.array(z.string()),
      fromLine: z.number().int().min(0).optional(),
      toLine: z.number().int().min(0).optional(),
    })
  ),
  /** Statistics */
  stats: z.object({
    additions: z.number().int().min(0),
    deletions: z.number().int().min(0),
    unchanged: z.number().int().min(0),
  }),
});
export type ContentDiff = z.infer<typeof ContentDiffSchema>;

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
