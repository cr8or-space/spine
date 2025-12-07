import { z } from 'zod';

import { IdSchema, TimestampSchema } from './common';

/**
 * Timeline position can be absolute (date) or relative (story time)
 */
export const TimelinePositionSchema = z.object({
  /** Absolute date if the story uses real dates */
  date: z.string().optional(),
  /** Relative position in story time (e.g., "Day 1", "Year 3, Month 2") */
  storyTime: z.string().optional(),
  /** Chapter number where this occurs */
  chapterNumber: z.number().int().positive().optional(),
  /** Approximate position if exact is unknown */
  approximate: z.boolean().default(false),
});
export type TimelinePosition = z.infer<typeof TimelinePositionSchema>;

/**
 * Causal relationship between timeline events
 */
export const CausalLinkSchema = z.object({
  /** The event that causes this one */
  causeEventId: IdSchema,
  /** Type of causality */
  type: z.enum(['direct', 'indirect', 'enables', 'prevents', 'triggers']),
  description: z.string().optional(),
});
export type CausalLink = z.infer<typeof CausalLinkSchema>;

/**
 * Timeline event entity in the story bible
 *
 * Timeline events track what happens when in the story,
 * including backstory events that aren't directly shown.
 */
export const TimelineEventSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  description: z.string(),
  /** When this event occurs */
  position: TimelinePositionSchema,
  /** Duration if the event spans time */
  duration: z.string().optional(),
  /** Type of event */
  type: z.enum([
    'backstory',
    'flashback',
    'current',
    'flashforward',
    'prophecy',
    'hypothetical',
  ]),
  /** Importance to the plot */
  significance: z.enum(['critical', 'major', 'moderate', 'minor', 'background']),
  /** Characters involved */
  involvedCharacters: z.array(IdSchema),
  /** Locations where this occurs */
  locations: z.array(IdSchema),
  /** Plot threads this event relates to */
  relatedThreads: z.array(IdSchema),
  /** Causal relationships */
  causes: z.array(CausalLinkSchema),
  /** Events that this event causes */
  effects: z.array(IdSchema),
  /** Whether this event has been shown/mentioned in content */
  revealed: z.boolean(),
  /** Content where this event is shown/mentioned */
  contentRefs: z.array(IdSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/**
 * Minimal timeline event for context assembly
 */
export const TimelineEventSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  position: TimelinePositionSchema,
  type: TimelineEventSchema.shape.type,
  significance: TimelineEventSchema.shape.significance,
  revealed: z.boolean(),
});
export type TimelineEventSummary = z.infer<typeof TimelineEventSummarySchema>;

/**
 * A span of time in the story (e.g., an era, period, or arc timeframe)
 */
export const TimelineSpanSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  description: z.string(),
  start: TimelinePositionSchema,
  end: TimelinePositionSchema.optional(),
  /** Events within this span */
  events: z.array(IdSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type TimelineSpan = z.infer<typeof TimelineSpanSchema>;
