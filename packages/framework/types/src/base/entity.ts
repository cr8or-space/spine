import { z, ZodSchema } from 'zod';

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

/**
 * Entity lifecycle states.
 *
 * Entities can transition through these states during their existence:
 * - active: Entity is currently in use in the narrative
 * - retired: Entity has been removed from active use (character death, location destroyed)
 * - archived: Entity is no longer actively referenced but preserved for history
 */
export const EntityLifecycleSchema = z.enum(['active', 'retired', 'archived']);
export type EntityLifecycle = z.infer<typeof EntityLifecycleSchema>;

/**
 * Entity type registration metadata.
 *
 * Domains use this to register their entity types with the framework.
 * This provides type information, validation, and display metadata.
 *
 * @typeParam T - The entity type this metadata describes
 */
export interface EntityType<T extends BaseEntity = BaseEntity> {
  /** Unique type identifier (e.g., 'character', 'location', 'snippet') */
  name: string;

  /** Zod schema for validating entities of this type */
  schema: ZodSchema<T>;

  /** Plural form for display (e.g., 'characters', 'locations') */
  plural: string;

  /** Human-readable description of this entity type */
  description: string;

  /**
   * Optional factory function to create new entities with defaults.
   * If not provided, entities must be created with all required fields.
   */
  create?: (partial: Partial<T>) => T;
}

/**
 * Registry for managing entity types.
 *
 * The framework provides this interface; domains register their entity types
 * during initialization. This allows the framework to validate, store, and
 * query entities without knowing their specific domain types.
 */
export interface EntityRegistry {
  /**
   * Register an entity type.
   * Throws if a type with the same name is already registered.
   */
  register<T extends BaseEntity>(entityType: EntityType<T>): void;

  /**
   * Get an entity type by name.
   * Returns null if not found.
   */
  get(name: string): EntityType | null;

  /**
   * Get all registered entity types.
   */
  getAll(): EntityType[];

  /**
   * Check if an entity type is registered.
   */
  has(name: string): boolean;

  /**
   * Validate an entity against its registered type schema.
   * Returns validation errors if invalid, empty array if valid.
   */
  validate(entity: BaseEntity): string[];
}
