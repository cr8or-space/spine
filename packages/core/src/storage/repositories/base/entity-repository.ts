import type { BaseEntity, SpinePosition } from '@repo/types';

/**
 * Generic repository interface for spine-aware entities.
 *
 * This interface provides a consistent API for storing and retrieving
 * entities that extend BaseEntity. Implementations can use various
 * storage backends (SQLite, file system, etc.) while maintaining
 * a uniform interface.
 *
 * @typeParam T - Entity type that extends BaseEntity
 *
 * @example
 * ```typescript
 * class CharacterRepository implements EntityRepository<Character> {
 *   async findById(id: string): Promise<Character | null> {
 *     // Implementation using SQLite
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface EntityRepository<T extends BaseEntity> {
  /**
   * Find an entity by its unique identifier.
   *
   * @param id - Unique entity identifier
   * @returns The entity if found, null otherwise
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities of a specific type.
   *
   * Note: For repositories that handle multiple entity types,
   * this returns entities matching the given type discriminator.
   *
   * @param type - Entity type discriminator
   * @returns Array of matching entities
   */
  findByType(type: string): Promise<T[]>;

  /**
   * Find all entities in this repository.
   *
   * @returns Array of all entities
   */
  findAll(): Promise<T[]>;

  /**
   * Save an entity (create or update).
   *
   * If the entity already exists (by id), it will be updated.
   * Otherwise, a new entity will be created.
   *
   * @param entity - Entity to save
   */
  save(entity: T): Promise<void>;

  /**
   * Delete an entity by its unique identifier.
   *
   * @param id - Unique entity identifier
   * @throws May throw if entity doesn't exist (implementation-dependent)
   */
  delete(id: string): Promise<void>;

  /**
   * Find entities that were introduced at a specific spine position.
   *
   * This is useful for finding all entities that were introduced
   * at a particular point in the narrative.
   *
   * @param position - Spine position to search for
   * @returns Array of entities introduced at this position
   */
  findBySpinePosition(position: SpinePosition): Promise<T[]>;
}

/**
 * Extended repository interface with additional query capabilities.
 *
 * This interface extends the basic EntityRepository with more
 * advanced querying options useful for complex operations.
 *
 * @typeParam T - Entity type that extends BaseEntity
 */
export interface ExtendedEntityRepository<T extends BaseEntity> extends EntityRepository<T> {
  /**
   * Find entities that are active at a given spine position.
   *
   * An entity is active at a position if:
   * - It has been introduced (introducedAt <= position)
   * - It has not been retired (retiredAt is null or retiredAt > position)
   *
   * @param position - Spine position to check
   * @returns Array of active entities
   */
  findActiveAt(position: SpinePosition): Promise<T[]>;

  /**
   * Find entities that were retired at or before a given position.
   *
   * @param position - Spine position threshold
   * @returns Array of retired entities
   */
  findRetiredBefore(position: SpinePosition): Promise<T[]>;

  /**
   * Count entities matching the repository type.
   *
   * @returns Total count of entities
   */
  count(): Promise<number>;

  /**
   * Check if an entity with the given ID exists.
   *
   * @param id - Entity identifier to check
   * @returns True if entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Find entities matching a predicate function.
   *
   * Note: This loads all entities into memory, so use sparingly
   * for large datasets. Prefer database-level queries when possible.
   *
   * @param predicate - Function to test each entity
   * @returns Array of matching entities
   */
  findWhere(predicate: (entity: T) => boolean): Promise<T[]>;
}

/**
 * Options for bulk operations.
 */
export interface BulkOperationOptions {
  /**
   * Whether to continue on error or fail fast.
   * @default false
   */
  continueOnError?: boolean;
}

/**
 * Result of a bulk operation.
 */
export interface BulkOperationResult {
  /** Number of successful operations */
  successful: number;
  /** Number of failed operations */
  failed: number;
  /** Error messages for failed operations (if any) */
  errors?: string[];
}

/**
 * Repository interface with bulk operation support.
 *
 * Use this interface for repositories that need to handle
 * large-scale data operations efficiently.
 *
 * @typeParam T - Entity type that extends BaseEntity
 */
export interface BulkEntityRepository<T extends BaseEntity> extends EntityRepository<T> {
  /**
   * Save multiple entities in a single operation.
   *
   * More efficient than calling save() multiple times for large batches.
   *
   * @param entities - Array of entities to save
   * @param options - Bulk operation options
   * @returns Result of the bulk operation
   */
  saveMany(entities: T[], options?: BulkOperationOptions): Promise<BulkOperationResult>;

  /**
   * Delete multiple entities by their IDs.
   *
   * @param ids - Array of entity identifiers
   * @param options - Bulk operation options
   * @returns Result of the bulk operation
   */
  deleteMany(ids: string[], options?: BulkOperationOptions): Promise<BulkOperationResult>;
}
