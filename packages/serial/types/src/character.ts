import { z } from 'zod';

import { IdSchema, SpinePositionSchema, TimestampSchema } from '@repo/framework-types';

import {
  CharacterArcTypeSchema,
  CharacterRoleSchema,
  RelationshipTypeSchema,
} from './shared';

// Re-export for convenience
export { CharacterArcTypeSchema, CharacterRoleSchema, RelationshipTypeSchema };
export type { CharacterArcType, CharacterRole, RelationshipType } from './shared';

/**
 * Character trait category
 */
export const TraitCategorySchema = z.enum([
  'personality',
  'physical',
  'skill',
  'background',
  'quirk',
]);
export type TraitCategory = z.infer<typeof TraitCategorySchema>;

/**
 * Character status in the story
 */
export const CharacterStatusSchema = z.enum([
  'active',
  'deceased',
  'absent',
  'unknown',
]);
export type CharacterStatus = z.infer<typeof CharacterStatusSchema>;

/**
 * Character trait with category
 */
export const TraitSchema = z.object({
  category: TraitCategorySchema,
  name: z.string().min(1),
  description: z.string().min(1),
});
export type Trait = z.infer<typeof TraitSchema>;

/**
 * Relationship between two characters
 */
export const RelationshipSchema = z.object({
  targetId: IdSchema,
  type: RelationshipTypeSchema,
  description: z.string().min(1),
  /** Relationship strength from -100 (hostile) to 100 (devoted) */
  intensity: z.number().min(-100).max(100),
  /** Whether this relationship is mutual or one-sided */
  mutual: z.boolean(),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

/**
 * Character arc status and progression
 */
export const CharacterArcSchema = z.object({
  type: CharacterArcTypeSchema,
  /** Where the character starts emotionally/morally */
  startingPoint: z.string(),
  /** Where the character is meant to end */
  destination: z.string(),
  /** Current progress as a percentage (0-100) */
  progress: z.number().min(0).max(100),
  /** Key moments in the arc */
  milestones: z.array(
    z.object({
      description: z.string(),
      chapterId: IdSchema.optional(),
      achieved: z.boolean(),
    })
  ),
});
export type CharacterArc = z.infer<typeof CharacterArcSchema>;

/**
 * Reference to where a character appears in content
 */
export const AppearanceRefSchema = z.object({
  contentId: IdSchema,
  chapterNumber: z.number().int().positive().optional(),
  /** Type of appearance */
  type: z.enum(['mention', 'scene', 'pov']),
  /** Brief context of the appearance */
  context: z.string().optional(),
});
export type AppearanceRef = z.infer<typeof AppearanceRefSchema>;

/**
 * Character entity in the story bible.
 *
 * Extends BaseEntity with spine-aware lifecycle fields:
 * - introducedAt: Position in the spine where the character was introduced
 * - retiredAt: Position in the spine where the character was retired (e.g., death)
 */
export const CharacterSchema = z.object({
  // BaseEntity fields
  id: IdSchema,
  /** Entity type discriminator for BaseEntity compatibility */
  entityType: z.literal('character').default('character'),
  /** Position in the spine where this character was introduced */
  introducedAt: SpinePositionSchema.optional(),
  /** Position in the spine where this character was retired (e.g., character death) */
  retiredAt: SpinePositionSchema.optional(),

  // Character-specific fields
  name: z.string().min(1),
  aliases: z.array(z.string()),
  description: z.string(),
  traits: z.array(TraitSchema),
  relationships: z.array(RelationshipSchema),
  arc: CharacterArcSchema.optional(),
  /** Example dialogue for voice consistency */
  voiceSamples: z.array(z.string()),
  /** Links to content where character appears */
  appearances: z.array(AppearanceRefSchema),
  /** Whether this is a major or minor character */
  role: CharacterRoleSchema,
  /** Whether character is currently active in the story */
  status: CharacterStatusSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Character = z.infer<typeof CharacterSchema>;

/**
 * Minimal character for context assembly (reduces token usage)
 */
export const CharacterSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  aliases: z.array(z.string()),
  role: CharacterSchema.shape.role,
  status: CharacterSchema.shape.status,
  /** Single line description */
  brief: z.string(),
});
export type CharacterSummary = z.infer<typeof CharacterSummarySchema>;
