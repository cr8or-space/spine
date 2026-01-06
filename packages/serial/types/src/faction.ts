import { z } from 'zod';

import { IdSchema, SpinePositionSchema, TimestampSchema } from '@repo/framework-types';

/**
 * Faction hierarchy level
 */
export const FactionRankSchema = z.object({
  name: z.string().min(1),
  level: z.number().int().min(0),
  description: z.string(),
  privileges: z.array(z.string()),
});
export type FactionRank = z.infer<typeof FactionRankSchema>;

/**
 * Relationship between factions
 */
export const FactionRelationSchema = z.object({
  targetId: IdSchema,
  type: z.enum(['allied', 'neutral', 'rival', 'hostile', 'subsidiary', 'parent']),
  description: z.string(),
  /** Public or secret relationship */
  public: z.boolean(),
});
export type FactionRelation = z.infer<typeof FactionRelationSchema>;

/**
 * Character membership in a faction
 */
export const FactionMemberSchema = z.object({
  characterId: IdSchema,
  rank: z.string(),
  role: z.string().optional(),
  joinedAt: z.string().optional(),
  status: z.enum(['active', 'former', 'secret', 'probationary']),
});
export type FactionMember = z.infer<typeof FactionMemberSchema>;

/**
 * Faction type discriminator for organization types
 */
export const FactionTypeSchema = z.enum([
  'government',
  'military',
  'religious',
  'criminal',
  'corporate',
  'secret-society',
  'guild',
  'family',
  'informal',
  'other',
]);
export type FactionType = z.infer<typeof FactionTypeSchema>;

/**
 * Faction entity in the story bible.
 *
 * Extends BaseEntity with spine-aware lifecycle fields:
 * - introducedAt: Position in the spine where the faction was introduced
 * - retiredAt: Position in the spine where the faction was retired (e.g., disbanded)
 */
export const FactionSchema = z.object({
  // BaseEntity fields
  id: IdSchema,
  /** Entity type discriminator for BaseEntity compatibility */
  entityType: z.literal('faction').default('faction'),
  /** Position in the spine where this faction was introduced */
  introducedAt: SpinePositionSchema.optional(),
  /** Position in the spine where this faction was retired (e.g., disbanded) */
  retiredAt: SpinePositionSchema.optional(),

  // Faction-specific fields
  name: z.string().min(1),
  aliases: z.array(z.string()),
  description: z.string(),
  /** Type of organization */
  type: FactionTypeSchema,
  /** Core beliefs or mission */
  ideology: z.string().optional(),
  /** Primary goals */
  goals: z.array(z.string()),
  /** Internal hierarchy */
  ranks: z.array(FactionRankSchema),
  /** Known members */
  members: z.array(FactionMemberSchema),
  /** Relationships with other factions */
  relations: z.array(FactionRelationSchema),
  /** Associated locations (headquarters, territory) */
  locations: z.array(IdSchema),
  /** Current state in the story */
  status: z.enum(['active', 'disbanded', 'underground', 'emerging', 'unknown']),
  /** Power level relative to other factions */
  influence: z.enum(['dominant', 'major', 'moderate', 'minor', 'negligible']),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Faction = z.infer<typeof FactionSchema>;

/**
 * Minimal faction for context assembly
 */
export const FactionSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  type: FactionSchema.shape.type,
  influence: FactionSchema.shape.influence,
  brief: z.string(),
});
export type FactionSummary = z.infer<typeof FactionSummarySchema>;
