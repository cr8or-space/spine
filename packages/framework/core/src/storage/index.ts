/**
 * Storage module - Database, schema, and repository infrastructure.
 */

// Schema
export { SCHEMA_VERSION, CREATE_TABLES_SQL, DROP_TABLES_SQL } from './schema';

// Database
export {
  openDatabase,
  createTestDatabase,
  type DatabaseOptions,
  type DatabaseConnection,
} from './database';

// Migrations
export {
  createMigrationRegistry,
  FRAMEWORK_MIGRATIONS,
  type Migration,
  type MigrationRegistry,
} from './migrations';

// Repository utilities
export {
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
} from './repository';
