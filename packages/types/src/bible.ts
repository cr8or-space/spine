import { z } from 'zod';

import { CharacterSchema, CharacterSummarySchema } from './character';
import { IdSchema, TimestampSchema } from './common';
import { FactionSchema, FactionSummarySchema } from './faction';
import { LocationSchema, LocationSummarySchema } from './location';
import { PlotThreadSchema, PlotThreadSummarySchema } from './plot-thread';
import { TimelineEventSchema, TimelineEventSummarySchema, TimelineSpanSchema } from './timeline';
import { WorldRuleSchema, WorldRuleSummarySchema } from './world-rule';

/**
 * Story Bible - the complete knowledge base for a story
 *
 * Contains all characters, locations, factions, world rules,
 * plot threads, and timeline events that define the story world.
 */
export const BibleSchema = z.object({
  id: IdSchema,
  characters: z.array(CharacterSchema),
  locations: z.array(LocationSchema),
  factions: z.array(FactionSchema),
  worldRules: z.array(WorldRuleSchema),
  plotThreads: z.array(PlotThreadSchema),
  timelineEvents: z.array(TimelineEventSchema),
  timelineSpans: z.array(TimelineSpanSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Bible = z.infer<typeof BibleSchema>;

/**
 * Summarized bible for token-efficient context assembly
 */
export const BibleSummarySchema = z.object({
  id: IdSchema,
  characters: z.array(CharacterSummarySchema),
  locations: z.array(LocationSummarySchema),
  factions: z.array(FactionSummarySchema),
  worldRules: z.array(WorldRuleSummarySchema),
  plotThreads: z.array(PlotThreadSummarySchema),
  timelineEvents: z.array(TimelineEventSummarySchema),
});
export type BibleSummary = z.infer<typeof BibleSummarySchema>;

/**
 * Empty bible factory
 */
export function createEmptyBible(id: string): Bible {
  const now = new Date().toISOString();
  return {
    id,
    characters: [],
    locations: [],
    factions: [],
    worldRules: [],
    plotThreads: [],
    timelineEvents: [],
    timelineSpans: [],
    createdAt: now,
    updatedAt: now,
  };
}
