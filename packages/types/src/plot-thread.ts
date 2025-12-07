import { z } from 'zod';

import { IdSchema, TimestampSchema } from './common';

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
 * Plot thread entity in the story bible
 *
 * Plot threads are narrative throughlines that span multiple chapters/arcs.
 * They represent ongoing storylines, mysteries, conflicts, or character arcs.
 */
export const PlotThreadSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  description: z.string(),
  /** Type of plot thread */
  type: z.enum([
    'main-plot',
    'subplot',
    'mystery',
    'romance',
    'conflict',
    'character-arc',
    'worldbuilding',
    'other',
  ]),
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
  /** When this thread was introduced */
  introducedAt: z
    .object({
      contentId: IdSchema,
      chapterNumber: z.number().int().positive().optional(),
    })
    .optional(),
  /** When this thread was resolved (if resolved) */
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
