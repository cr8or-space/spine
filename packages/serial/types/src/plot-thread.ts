import { z } from 'zod';

import { IdSchema, SpinePositionSchema, TimestampSchema } from '@repo/framework-types';

import {
  ContentLocationSchema,
  PlotThreadScopeSchema,
  PlotThreadStatusSchema,
  PlotThreadTypeSchema,
  PromisePayoffSchema,
  PromiseStatusSchema,
} from './shared';

// Re-export for convenience
export {
  ContentLocationSchema,
  PlotThreadScopeSchema,
  PlotThreadStatusSchema,
  PlotThreadTypeSchema,
  PromisePayoffSchema,
  PromiseStatusSchema,
};
export type {
  ContentLocation,
  PlotThreadScope,
  PlotThreadStatus,
  PlotThreadType,
  PromisePayoff,
  PromiseStatus,
} from './shared';

/**
 * Thread touch type - how a thread is interacted with at a content point.
 */
export const ThreadTouchTypeSchema = z.enum([
  'introduction',
  'development',
  'complication',
  'climax',
  'resolution',
]);
export type ThreadTouchType = z.infer<typeof ThreadTouchTypeSchema>;

/**
 * A promise made to the reader that requires payoff
 */
export const NarrativePromiseSchema = z.object({
  id: IdSchema,
  description: z.string().min(1),
  /** When the promise was made */
  madeAt: ContentLocationSchema,
  /** When/if the promise was fulfilled */
  fulfilledAt: ContentLocationSchema.optional(),
  /** Expected timeframe for payoff */
  expectedPayoff: PromisePayoffSchema,
  status: PromiseStatusSchema,
});
export type NarrativePromise = z.infer<typeof NarrativePromiseSchema>;

/**
 * A touch point where a plot thread is referenced or advanced
 */
export const ThreadTouchSchema = z.object({
  contentId: IdSchema,
  chapterNumber: z.number().int().positive().optional(),
  type: ThreadTouchTypeSchema,
  description: z.string().min(1),
});
export type ThreadTouch = z.infer<typeof ThreadTouchSchema>;

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
  description: z.string().min(1),
  /** Type of plot thread */
  type: PlotThreadTypeSchema,
  /** Current status */
  status: PlotThreadStatusSchema,
  /** Expected scope */
  scope: PlotThreadScopeSchema,
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
  introducedAt: ContentLocationSchema.optional(),
  /** When this thread was resolved (content-based tracking) */
  resolvedAt: ContentLocationSchema.optional(),
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
