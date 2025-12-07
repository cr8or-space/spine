import { z } from 'zod';

import { IdSchema } from '../common';

/**
 * Position within the spine (linearized content structure)
 */
export const SpinePositionSchema = z.object({
  /** ID of the spine node */
  nodeId: IdSchema,
  /** Order within the parent or at this level */
  order: z.number().int().min(0),
});
export type SpinePosition = z.infer<typeof SpinePositionSchema>;

/**
 * Base entity interface that all domain entities should extend.
 *
 * Provides common fields for spine-aware entity lifecycle:
 * - Unique identifier
 * - Entity type discriminator
 * - Optional introduction point in the spine
 * - Optional retirement point (for entities that leave the story)
 */
export const BaseEntitySchema = z.object({
  /** Unique identifier for this entity */
  id: IdSchema,
  /** Discriminator field for entity type */
  type: z.string(),
  /** Position in the spine where this entity was introduced */
  introducedAt: SpinePositionSchema.optional(),
  /** Position in the spine where this entity was retired (e.g., character death) */
  retiredAt: SpinePositionSchema.optional(),
});
export type BaseEntity = z.infer<typeof BaseEntitySchema>;
