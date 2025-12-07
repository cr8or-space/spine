/**
 * Database connection and initialization
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import { CREATE_TABLES_SQL, DROP_TABLES_SQL, SCHEMA_VERSION } from './schema';

export interface DatabaseOptions {
  /** Path to the database file, or ':memory:' for in-memory */
  path: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Whether to run in read-only mode */
  readonly?: boolean;
}

export interface DatabaseConnection {
  /** The underlying better-sqlite3 database instance */
  db: Database.Database;
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

  return {
    db,

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
  // Future migrations will be added here
  // {
  //   version: 2,
  //   description: 'Add new column',
  //   up: 'ALTER TABLE projects ADD COLUMN new_column TEXT',
  // },
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
