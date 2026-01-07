/**
 * Shared schemas used across multiple files in serial/types.
 *
 * These schemas are extracted to avoid duplication and ensure consistency.
 */

import { z } from 'zod';

import { IdSchema } from '@repo/framework-types';

/**
 * Location in content where something appears.
 *
 * Used for tracking where entities, clues, plot threads, etc.
 * are introduced or referenced in content.
 */
export const ContentLocationSchema = z.object({
  contentId: IdSchema,
  chapterNumber: z.number().int().positive().optional(),
  /** Position in reading order (1-indexed) */
  position: z.number().int().positive().optional(),
});
export type ContentLocation = z.infer<typeof ContentLocationSchema>;

/**
 * Relationship type between characters.
 *
 * Exported here for reuse in analysis schemas.
 * The canonical definition is in character.ts RelationshipSchema.
 */
export const RelationshipTypeSchema = z.enum([
  'family',
  'friend',
  'enemy',
  'romantic',
  'professional',
  'rival',
  'mentor',
  'other',
]);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

/**
 * Character arc type.
 *
 * Exported here for reuse in analysis schemas.
 * The canonical definition is in character.ts CharacterArcSchema.
 */
export const CharacterArcTypeSchema = z.enum([
  'positive-change',
  'negative-change',
  'flat',
  'corruption',
  'redemption',
  'coming-of-age',
  'disillusionment',
]);
export type CharacterArcType = z.infer<typeof CharacterArcTypeSchema>;

/**
 * Character role in the story.
 *
 * Exported here for reuse in analysis schemas.
 * The canonical definition is in character.ts CharacterSchema.
 */
export const CharacterRoleSchema = z.enum([
  'protagonist',
  'antagonist',
  'major',
  'supporting',
  'minor',
]);
export type CharacterRole = z.infer<typeof CharacterRoleSchema>;

/**
 * Plot thread type.
 *
 * Canonical definition for plot thread classification.
 * Used in PlotThread entities and analysis tracking.
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
 * Plot thread scope.
 *
 * Exported here for reuse in analysis schemas.
 * The canonical definition is in plot-thread.ts PlotThreadSchema.
 */
export const PlotThreadScopeSchema = z.enum([
  'scene',
  'chapter',
  'arc',
  'book',
  'series',
]);
export type PlotThreadScope = z.infer<typeof PlotThreadScopeSchema>;

/**
 * Plot thread status.
 *
 * Exported here for reuse in analysis schemas.
 * The canonical definition is in plot-thread.ts PlotThreadSchema.
 */
export const PlotThreadStatusSchema = z.enum([
  'planned',
  'active',
  'dormant',
  'resolved',
  'abandoned',
]);
export type PlotThreadStatus = z.infer<typeof PlotThreadStatusSchema>;

/**
 * Narrative promise expected payoff timeframe.
 *
 * Exported here for reuse in analysis schemas.
 * The canonical definition is in plot-thread.ts NarrativePromiseSchema.
 */
export const PromisePayoffSchema = z.enum([
  'immediate',
  'short-term',
  'medium-term',
  'long-term',
  'series-end',
]);
export type PromisePayoff = z.infer<typeof PromisePayoffSchema>;

/**
 * Narrative promise status.
 *
 * Exported here for reuse in analysis schemas.
 * The canonical definition is in plot-thread.ts NarrativePromiseSchema.
 */
export const PromiseStatusSchema = z.enum([
  'pending',
  'fulfilled',
  'subverted',
  'abandoned',
]);
export type PromiseStatus = z.infer<typeof PromiseStatusSchema>;
