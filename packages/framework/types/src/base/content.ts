import { z } from 'zod';

import { IdSchema } from '../common';

/**
 * Content status in the review workflow.
 *
 * Follows a linear progression: draft -> review -> approved -> published
 */
export const BaseContentStatusSchema = z.enum(['draft', 'review', 'approved', 'published']);
export type BaseContentStatus = z.infer<typeof BaseContentStatusSchema>;

/**
 * Reference to an entity found within content.
 *
 * Used to track where entities (characters, locations, etc.) are mentioned
 * or appear in the prose.
 */
export const ReferenceSchema = z.object({
  /** ID of the referenced entity */
  entityId: IdSchema,
  /** Type of the referenced entity */
  entityType: z.string(),
  /** Position of the reference in the content */
  position: z.object({
    /** Character offset where the reference starts */
    start: z.number().int().min(0),
    /** Character offset where the reference ends */
    end: z.number().int().min(0),
  }),
});
export type Reference = z.infer<typeof ReferenceSchema>;

/**
 * Base content interface for spine-aware content.
 *
 * All content in a spine-based system should extend this interface.
 * It provides:
 * - Unique identification
 * - Type discrimination
 * - Position in the spine structure
 * - Review workflow status
 * - Entity references for continuity tracking
 */
export const BaseContentSchema = z.object({
  /** Unique identifier for this content */
  id: IdSchema,
  /** Discriminator field for content type */
  type: z.string(),
  /** ID of the spine node this content belongs to */
  spineNode: IdSchema,
  /** Current status in the review workflow */
  status: BaseContentStatusSchema,
  /** References to entities found in this content */
  references: z.array(ReferenceSchema),
});
export type BaseContent = z.infer<typeof BaseContentSchema>;
