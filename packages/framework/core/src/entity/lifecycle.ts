/**
 * Entity Lifecycle Management - Track entity state transitions.
 *
 * Entities go through lifecycle states:
 * - active: Currently in use
 * - retired: Removed from active use (e.g., character death)
 * - archived: Preserved for history but not actively referenced
 */

import type { EntityLifecycle, SpinePosition } from '@repo/framework-types';

import type { EntityRepository, StoredEntity } from './repository';

/**
 * Valid lifecycle transitions.
 *
 * active -> retired: Entity is removed from active use
 * active -> archived: Entity is preserved but inactive
 * retired -> archived: Retired entity is archived
 * archived -> active: Entity is restored (uncommon)
 */
export const VALID_LIFECYCLE_TRANSITIONS: Record<EntityLifecycle, EntityLifecycle[]> = {
  active: ['retired', 'archived'],
  retired: ['archived', 'active'],
  archived: ['active'],
};

/**
 * Check if a lifecycle transition is valid.
 */
export function isValidLifecycleTransition(from: EntityLifecycle, to: EntityLifecycle): boolean {
  return VALID_LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get valid next states for a lifecycle.
 */
export function getValidNextLifecycles(current: EntityLifecycle): EntityLifecycle[] {
  return VALID_LIFECYCLE_TRANSITIONS[current] ?? [];
}

/**
 * Entity lifecycle manager.
 */
export interface EntityLifecycleManager {
  /**
   * Retire an entity at a specific spine position.
   * Used for events like character deaths, location destruction, etc.
   */
  retire(projectId: string, entityId: string, position: SpinePosition): boolean;

  /**
   * Archive an entity.
   * Used for entities that are no longer relevant but should be preserved.
   */
  archive(projectId: string, entityId: string): boolean;

  /**
   * Restore an archived or retired entity to active status.
   */
  restore(projectId: string, entityId: string): boolean;

  /**
   * Check if an entity is active at a given spine position.
   * Returns true if the entity was introduced before and not retired before the position.
   */
  isActiveAt(entity: StoredEntity, position: SpinePosition, spineComparator: SpinePositionComparator): boolean;

  /**
   * Get entities that are active at a given spine position.
   */
  getActiveAt(
    entities: StoredEntity[],
    position: SpinePosition,
    spineComparator: SpinePositionComparator
  ): StoredEntity[];
}

/**
 * Function to compare spine positions.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export type SpinePositionComparator = (a: SpinePosition, b: SpinePosition) => number;

/**
 * Create an entity lifecycle manager.
 *
 * @param repository - Entity repository for persistence
 */
export function createEntityLifecycleManager(repository: EntityRepository): EntityLifecycleManager {
  return {
    retire(projectId: string, entityId: string, position: SpinePosition): boolean {
      return repository.updateLifecycle(projectId, entityId, 'retired', position);
    },

    archive(projectId: string, entityId: string): boolean {
      return repository.updateLifecycle(projectId, entityId, 'archived');
    },

    restore(projectId: string, entityId: string): boolean {
      return repository.updateLifecycle(projectId, entityId, 'active');
    },

    isActiveAt(
      stored: StoredEntity,
      position: SpinePosition,
      compare: SpinePositionComparator
    ): boolean {
      const { entity } = stored;

      // If not introduced yet, not active
      if (entity.introducedAt && compare(entity.introducedAt, position) > 0) {
        return false;
      }

      // If retired before this position, not active
      if (entity.retiredAt && compare(entity.retiredAt, position) <= 0) {
        return false;
      }

      // Check current lifecycle state
      return stored.lifecycle === 'active';
    },

    getActiveAt(
      entities: StoredEntity[],
      position: SpinePosition,
      compare: SpinePositionComparator
    ): StoredEntity[] {
      return entities.filter((entity) => this.isActiveAt(entity, position, compare));
    },
  };
}

/**
 * Create a simple spine position comparator based on linear order.
 *
 * This compares positions by their order values. For more complex spines
 * (tree structures), domains should provide custom comparators.
 */
export function createLinearPositionComparator(): SpinePositionComparator {
  return (a: SpinePosition, b: SpinePosition): number => {
    // If same node, compare order
    if (a.nodeId === b.nodeId) {
      return a.order - b.order;
    }
    // Otherwise, compare by order only (assumes nodes are in order)
    return a.order - b.order;
  };
}
