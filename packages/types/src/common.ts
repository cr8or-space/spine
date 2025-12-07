import { z } from 'zod';

/**
 * Common ID type used across all entities
 */
export const IdSchema = z.string().min(1);
export type Id = z.infer<typeof IdSchema>;

/**
 * Timestamp in ISO 8601 format
 */
export const TimestampSchema = z.string().datetime();
export type Timestamp = z.infer<typeof TimestampSchema>;

/**
 * Result type for operations that can fail with expected errors
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Reference to another entity
 */
export const EntityRefSchema = z.object({
  id: IdSchema,
  type: z.enum([
    'character',
    'location',
    'faction',
    'world-rule',
    'plot-thread',
    'timeline-event',
    'structure',
    'content',
  ]),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

/**
 * Cross-reference between entities
 */
export const CrossReferenceSchema = z.object({
  sourceId: IdSchema,
  sourceType: EntityRefSchema.shape.type,
  targetId: IdSchema,
  targetType: EntityRefSchema.shape.type,
  context: z.string().optional(),
});
export type CrossReference = z.infer<typeof CrossReferenceSchema>;
