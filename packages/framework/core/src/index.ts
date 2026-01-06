/**
 * Framework Core
 *
 * Domain-agnostic infrastructure for spine-based authoring tools.
 *
 * Exports:
 * - storage/ - SQLite schema, database, repository base classes, migrations
 * - entity/ - Entity registry, repository, relationship graph, lifecycle tracking
 * - content/ - Content storage, version tracking, reference indexing
 * - validation/ - Pipeline orchestration, result aggregation
 * - spine/ - Base spine implementations, checkpoint management
 */

// Re-export types for convenience
export * from '@repo/framework-types';

// Storage module
export {
  // Schema
  SCHEMA_VERSION,
  CREATE_TABLES_SQL,
  DROP_TABLES_SQL,
  // Database
  openDatabase,
  createTestDatabase,
  type DatabaseOptions,
  type DatabaseConnection,
  // Migrations
  createMigrationRegistry,
  FRAMEWORK_MIGRATIONS,
  type Migration,
  type MigrationRegistry,
  // Repository utilities
  generateId,
  nowTimestamp,
  parseJson,
  boolToInt,
  intToBool,
  wrapResult,
  createBaseRepository,
  createProjectScopedRepository,
  mapRow,
  mapRows,
  type Result,
  type Repository,
  type ProjectScopedRepository,
} from './storage';

// Entity module
export {
  // Registry
  createEntityRegistry,
  defineEntityType,
  // Repository
  createEntityRepository,
  type EntityRepository,
  type StoredEntity,
  type EntityQueryOptions,
  // Graph
  createEntityGraph,
  type EntityGraph,
  type EntityRelationship,
  type RelationshipQueryOptions,
  // Lifecycle
  createEntityLifecycleManager,
  createLinearPositionComparator,
  isValidLifecycleTransition,
  getValidNextLifecycles,
  VALID_LIFECYCLE_TRANSITIONS,
  type EntityLifecycleManager,
  type SpinePositionComparator,
} from './entity';

// Content module
export {
  // Repository
  createContentRepository,
  type ContentRepository,
  type StoredContent,
  type ContentQueryOptions,
  // Versions
  createContentVersionRepository,
  createContentRollback,
  type ContentVersionRepository,
  type ContentVersion,
  type ContentVersionSource,
  type ContentRollback,
  // References
  createContentReferenceRepository,
  createSimpleReferenceExtractor,
  type ContentReferenceRepository,
  type StoredReference,
  type ReferenceExtractor,
} from './content';

// Validation module
export {
  // Pipeline
  createValidatorRegistry,
  createValidationPipeline,
  type ValidationPipeline,
  type PipelineOptions,
  type PipelineResult,
  // Results
  createValidationResultsRepository,
  aggregateResults,
  filterByStatus,
  filterByLocation,
  type ValidationResultsRepository,
  type StoredValidationResult,
  type ValidationSummary,
} from './validation';

// Spine module
export {
  // Linear spine
  createLinearSpine,
  createEmptyLinearSpine,
  createLinearSpineBuilder,
  type LinearSpineConfig,
  type LinearSpineBuilder,
  // Tree spine
  createTreeSpine,
  createEmptyTreeSpine,
  createTreeSpineBuilder,
  pathToRoot,
  lowestCommonAncestor,
  getLeafNodes,
  getNodesAtDepth,
  type TreeSpineConfig,
  type TreeSpineBuilder,
  // Checkpoints
  createCheckpointRepository,
  getNodesBeforeCheckpoint,
  isBeforeOrAtCheckpoint,
  type Checkpoint,
  type CheckpointRepository,
} from './spine';

// Version constant
export const FRAMEWORK_VERSION = '0.1.0';
