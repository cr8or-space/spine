/**
 * Entity module - Registration, storage, and relationship management.
 */

// Registry
export { createEntityRegistry, defineEntityType } from './registry';

// Repository
export {
  createEntityRepository,
  type EntityRepository,
  type StoredEntity,
  type EntityQueryOptions,
} from './repository';

// Graph
export {
  createEntityGraph,
  type EntityGraph,
  type EntityRelationship,
  type RelationshipQueryOptions,
} from './graph';

// Lifecycle
export {
  createEntityLifecycleManager,
  createLinearPositionComparator,
  isValidLifecycleTransition,
  getValidNextLifecycles,
  VALID_LIFECYCLE_TRANSITIONS,
  type EntityLifecycleManager,
  type SpinePositionComparator,
} from './lifecycle';
