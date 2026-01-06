import { z } from 'zod';

import { IdSchema, TimestampSchema } from '@repo/framework-types';

/**
 * Content status in the review workflow
 */
export const ContentStatusSchema = z.enum(['draft', 'review', 'approved', 'published']);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

/**
 * Review comment on content
 */
export const ReviewCommentSchema = z.object({
  id: IdSchema,
  /** Location in content */
  location: z.object({
    paragraphIndex: z.number().int().min(0),
    startOffset: z.number().int().min(0).optional(),
    endOffset: z.number().int().min(0).optional(),
  }),
  text: z.string(),
  /** Type of comment */
  type: z.enum(['note', 'issue', 'suggestion', 'praise']),
  /** Whether this comment has been addressed */
  resolved: z.boolean(),
  createdAt: TimestampSchema,
});
export type ReviewComment = z.infer<typeof ReviewCommentSchema>;

/**
 * Action taken on a paragraph during review
 */
export const ParagraphActionSchema = z.object({
  paragraphIndex: z.number().int().min(0),
  action: z.enum(['accept', 'reject', 'regenerate', 'edit']),
  /** New text if edited */
  newText: z.string().optional(),
  /** Reason for action */
  reason: z.string().optional(),
  timestamp: TimestampSchema,
});
export type ParagraphAction = z.infer<typeof ParagraphActionSchema>;

/**
 * Review session for a piece of content
 */
export const ReviewSchema = z.object({
  id: IdSchema,
  contentId: IdSchema,
  contentVersion: z.number().int().positive(),
  /** Overall verdict */
  verdict: z.enum(['pending', 'approved', 'rejected', 'needs-revision']).optional(),
  /** Comments made during review */
  comments: z.array(ReviewCommentSchema),
  /** Per-paragraph actions */
  paragraphActions: z.array(ParagraphActionSchema),
  /** Time spent reviewing (seconds) */
  timeSpent: z.number().int().min(0).optional(),
  startedAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
});
export type Review = z.infer<typeof ReviewSchema>;

/**
 * Lock point - prevents content from being affected by revision cascades
 */
export const LockPointSchema = z.object({
  id: IdSchema,
  /** Content ID that is locked */
  contentId: IdSchema,
  /** Reason for locking */
  reason: z.string(),
  /** Whether this lock prevents all changes or just cascaded changes */
  type: z.enum(['cascade-protection', 'full-lock']),
  createdAt: TimestampSchema,
});
export type LockPoint = z.infer<typeof LockPointSchema>;
export type LockPointType = LockPoint['type'];

/**
 * Generation record - history of how content was generated
 */
export const GenerationRecordSchema = z.object({
  id: IdSchema,
  contentId: IdSchema,
  version: z.number().int().positive(),
  /** Model used for generation */
  modelId: z.string(),
  /** Temperature setting */
  temperature: z.number().min(0).max(2),
  /** Token counts */
  tokens: z.object({
    prompt: z.number().int().min(0),
    completion: z.number().int().min(0),
  }),
  /** Generation duration in milliseconds */
  durationMs: z.number().int().min(0),
  /** Pipeline stage that produced this */
  stage: z.enum(['outline', 'beats', 'draft', 'revision', 'self-review']),
  /** Prompt template used */
  promptTemplateId: z.string().optional(),
  /** Whether generation succeeded */
  success: z.boolean(),
  /** Error message if failed */
  error: z.string().optional(),
  createdAt: TimestampSchema,
});
export type GenerationRecord = z.infer<typeof GenerationRecordSchema>;

/**
 * Revision impact - what would be affected by a change
 */
export const RevisionImpactSchema = z.object({
  /** Content that triggered the analysis */
  sourceContentId: IdSchema,
  /** Contents that would be invalidated */
  affectedContents: z.array(
    z.object({
      contentId: IdSchema,
      reason: z.string(),
      severity: z.enum(['direct', 'indirect']),
    })
  ),
  /** Lock points that protect content from cascade */
  protectedByLocks: z.array(IdSchema),
  /** Revision horizon used for analysis */
  horizonChapters: z.number().int().positive(),
  analyzedAt: TimestampSchema,
});
export type RevisionImpact = z.infer<typeof RevisionImpactSchema>;

/**
 * Review queue item
 */
export const ReviewQueueItemSchema = z.object({
  contentId: IdSchema,
  structureId: IdSchema,
  title: z.string(),
  status: ContentStatusSchema,
  /** Priority in queue (higher = more urgent) */
  priority: z.number().int(),
  /** When this entered the queue */
  queuedAt: TimestampSchema,
  /** Number of pending continuity issues */
  issueCount: z.number().int().min(0),
  /** Word count */
  wordCount: z.number().int().min(0),
});
export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;
