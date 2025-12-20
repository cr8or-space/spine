/**
 * Database connection and initialization
 *
 * Uses libsql, a synchronous SQLite library with ESM support.
 * This provides ESM compatibility required for SvelteKit SSR.
 *
 * Drizzle ORM is layered on top for type-safe queries while maintaining
 * compatibility with raw SQL for FTS5 and complex operations.
 *
 * Note: We use the drizzle-orm/better-sqlite3 driver because libsql provides
 * a compatible API. Both libsql and better-sqlite3 packages are required:
 * - libsql: Actual SQLite implementation with ESM support
 * - better-sqlite3: Required by drizzle-orm driver as a peer dependency
 */

import Database from 'libsql';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import { CREATE_TABLES_SQL, DROP_TABLES_SQL, SCHEMA_VERSION } from './schema';
import * as schema from './drizzle-schema';

export interface DatabaseOptions {
  /** Path to the database file, or ':memory:' for in-memory */
  path: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Whether to run in read-only mode */
  readonly?: boolean;
}

/**
 * Drizzle database type with schema
 *
 * Note: We use BetterSQLite3Database type because the libsql package provides
 * a compatible API, allowing us to use the drizzle-orm/better-sqlite3 driver.
 */
export type DrizzleDB = BetterSQLite3Database<typeof schema>;

export interface DatabaseConnection {
  /** The underlying libsql database instance */
  db: Database.Database;
  /** Drizzle ORM instance for type-safe queries */
  drizzle: DrizzleDB;
  /** Close the database connection */
  close(): void;
  /** Get the current schema version */
  getSchemaVersion(): number;
  /** Check if the database is initialized */
  isInitialized(): boolean;
  /** Initialize the database schema */
  initialize(): void;
  /** Reset the database (drop all tables) */
  reset(): void;
}

/**
 * Open a database connection
 */
export function openDatabase(options: DatabaseOptions): DatabaseConnection {
  const { path, verbose = false, readonly = false } = options;

  // Ensure directory exists for file-based databases
  if (path !== ':memory:') {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(path, {
    readonly,
    verbose: verbose ? console.log : undefined,
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrent read performance
  if (!readonly) {
    db.pragma('journal_mode = WAL');
  }

  // Create Drizzle ORM instance
  const drizzleDb = drizzle(db, { schema });

  return {
    db,
    drizzle: drizzleDb,

    close() {
      db.close();
    },

    getSchemaVersion(): number {
      try {
        const row = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as
          | { version: number }
          | undefined;
        return row?.version ?? 0;
      } catch {
        // Table doesn't exist
        return 0;
      }
    },

    isInitialized(): boolean {
      return this.getSchemaVersion() > 0;
    },

    initialize() {
      if (this.isInitialized()) {
        const currentVersion = this.getSchemaVersion();
        if (currentVersion < SCHEMA_VERSION) {
          // Run migrations
          runMigrations(db, currentVersion, SCHEMA_VERSION);
        }
        return;
      }

      // Create all tables
      db.exec(CREATE_TABLES_SQL);

      // Record schema version
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
    },

    reset() {
      db.exec(DROP_TABLES_SQL);
    },
  };
}

/**
 * Migration definitions
 */
interface Migration {
  version: number;
  up: string;
  description: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 2,
    description: 'Add version metadata and rollback source type',
    up: `
      -- Add metadata_json column to content_versions
      ALTER TABLE content_versions ADD COLUMN metadata_json TEXT;

      -- Create index on created_at for version queries
      CREATE INDEX IF NOT EXISTS idx_content_versions_created ON content_versions(created_at);
    `,
  },
  {
    version: 3,
    description: 'Add operation journal, health checks, and backup history tables',
    up: `
      -- Operation journal for recovery
      CREATE TABLE IF NOT EXISTS operation_journal (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
        state_json TEXT NOT NULL,
        context_json TEXT,
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_operation_journal_project ON operation_journal(project_id);
      CREATE INDEX IF NOT EXISTS idx_operation_journal_status ON operation_journal(status);
      CREATE INDEX IF NOT EXISTS idx_operation_journal_type ON operation_journal(operation_type);

      -- Database health checks table
      CREATE TABLE IF NOT EXISTS health_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('ok', 'warning', 'error')),
        details_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_health_checks_type ON health_checks(check_type);
      CREATE INDEX IF NOT EXISTS idx_health_checks_created ON health_checks(created_at);

      -- Backup history table
      CREATE TABLE IF NOT EXISTS backup_history (
        id TEXT PRIMARY KEY,
        backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'content-only')),
        file_path TEXT NOT NULL,
        file_size INTEGER,
        checksum TEXT,
        status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed', 'verified')),
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_backup_history_type ON backup_history(backup_type);
      CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
      CREATE INDEX IF NOT EXISTS idx_backup_history_created ON backup_history(created_at);
    `,
  },
  {
    version: 4,
    description: 'Add entity suggestions table for bible extraction',
    up: `
      -- Entity suggestions table (bible extraction)
      CREATE TABLE IF NOT EXISTS entity_suggestions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('new', 'update')),
        entity_type TEXT NOT NULL CHECK (entity_type IN ('character', 'location', 'faction', 'world-rule', 'plot-thread')),
        existing_entity_id TEXT,
        name TEXT NOT NULL,
        suggested_data_json TEXT NOT NULL,
        field_updates_json TEXT,
        evidence_json TEXT NOT NULL DEFAULT '[]',
        confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
        reasoning TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'merged')),
        review_notes TEXT,
        created_at TEXT NOT NULL,
        reviewed_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_entity_suggestions_project ON entity_suggestions(project_id);
      CREATE INDEX IF NOT EXISTS idx_entity_suggestions_status ON entity_suggestions(project_id, status);
      CREATE INDEX IF NOT EXISTS idx_entity_suggestions_type ON entity_suggestions(project_id, entity_type);
      CREATE INDEX IF NOT EXISTS idx_entity_suggestions_created ON entity_suggestions(created_at);
    `,
  },
];

/**
 * Run migrations from one version to another
 */
function runMigrations(db: Database.Database, fromVersion: number, toVersion: number): void {
  const pendingMigrations = MIGRATIONS.filter((m) => m.version > fromVersion && m.version <= toVersion).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pendingMigrations) {
    db.transaction(() => {
      db.exec(migration.up);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version);
    })();
  }
}

/**
 * Create an in-memory database for testing
 */
export function createTestDatabase(): DatabaseConnection {
  const conn = openDatabase({ path: ':memory:' });
  conn.initialize();
  return conn;
}
