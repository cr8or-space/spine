import { z } from 'zod';

import { IdSchema, SpinePositionSchema, TimestampSchema } from '@repo/framework-types';

/**
 * A promise made to the reader that requires payoff
 */
export const NarrativePromiseSchema = z.object({
  id: IdSchema,
  description: z.string(),
  /** When the promise was made */
  madeAt: z.object({
    contentId: IdSchema,
    chapterNumber: z.number().int().positive().optional(),
  }),
  /** When/if the promise was fulfilled */
  fulfilledAt: z
    .object({
      contentId: IdSchema,
      chapterNumber: z.number().int().positive().optional(),
    })
    .optional(),
  /** Expected timeframe for payoff */
  expectedPayoff: z.enum(['immediate', 'short-term', 'medium-term', 'long-term', 'series-end']),
  status: z.enum(['pending', 'fulfilled', 'subverted', 'abandoned']),
});
export type NarrativePromise = z.infer<typeof NarrativePromiseSchema>;

/**
 * A touch point where a plot thread is referenced or advanced
 */
export const ThreadTouchSchema = z.object({
  contentId: IdSchema,
  chapterNumber: z.number().int().positive().optional(),
  type: z.enum(['introduction', 'development', 'complication', 'climax', 'resolution']),
  description: z.string(),
});
export type ThreadTouch = z.infer<typeof ThreadTouchSchema>;

/**
 * Plot thread type discriminator
 */
export const PlotThreadTypeSchema = z.enum([
  'main-plot',
  'subplot',
  'mystery',
  'romance',
  'conflict',
  'character-arc',
  'worldbuilding',
  'other',
]);
export type PlotThreadType = z.infer<typeof PlotThreadTypeSchema>;

/**
 * Plot thread entity in the story bible.
 *
 * Plot threads are narrative throughlines that span multiple chapters/arcs.
 * They represent ongoing storylines, mysteries, conflicts, or character arcs.
 *
 * Extends BaseEntity with spine-aware lifecycle fields:
 * - spineIntroducedAt: Position in the spine where the thread was introduced
 * - spineRetiredAt: Position in the spine where the thread was retired (e.g., resolved)
 *
 * Note: PlotThread has its own introducedAt/resolvedAt fields for content-based tracking,
 * while spineIntroducedAt/spineRetiredAt are for spine-based positioning.
 */
export const PlotThreadSchema = z.object({
  // BaseEntity fields
  id: IdSchema,
  /** Entity type discriminator for BaseEntity compatibility */
  entityType: z.literal('plot-thread').default('plot-thread'),
  /** Position in the spine where this thread was introduced (spine-based tracking) */
  spineIntroducedAt: SpinePositionSchema.optional(),
  /** Position in the spine where this thread was retired (spine-based tracking) */
  spineRetiredAt: SpinePositionSchema.optional(),

  // PlotThread-specific fields
  name: z.string().min(1),
  description: z.string(),
  /** Type of plot thread */
  type: PlotThreadTypeSchema,
  /** Current status */
  status: z.enum(['planned', 'active', 'dormant', 'resolved', 'abandoned']),
  /** Expected scope */
  scope: z.enum(['scene', 'chapter', 'arc', 'book', 'series']),
  /** Priority for inclusion in context (higher = more important) */
  priority: z.number().int().min(0).max(100),
  /** Characters involved in this thread */
  involvedCharacters: z.array(IdSchema),
  /** Related locations */
  relatedLocations: z.array(IdSchema),
  /** Promises made within this thread */
  promises: z.array(NarrativePromiseSchema),
  /** Touch points throughout the story */
  touches: z.array(ThreadTouchSchema),
  /** Parent thread if this is a sub-thread */
  parentThreadId: IdSchema.optional(),
  /** Child threads */
  childThreads: z.array(IdSchema),
  /** When this thread was introduced (content-based tracking) */
  introducedAt: z
    .object({
      contentId: IdSchema,
      chapterNumber: z.number().int().positive().optional(),
    })
    .optional(),
  /** When this thread was resolved (content-based tracking) */
  resolvedAt: z
    .object({
      contentId: IdSchema,
      chapterNumber: z.number().int().positive().optional(),
    })
    .optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type PlotThread = z.infer<typeof PlotThreadSchema>;

/**
 * Minimal plot thread for context assembly
 */
export const PlotThreadSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  type: PlotThreadSchema.shape.type,
  status: PlotThreadSchema.shape.status,
  priority: z.number(),
  brief: z.string(),
});
export type PlotThreadSummary = z.infer<typeof PlotThreadSummarySchema>;
