/**
 * Database connection and initialization for Spine Framework.
 *
 * Uses libsql, a synchronous SQLite library with ESM support.
 * Drizzle ORM can be layered on top for type-safe queries while maintaining
 * compatibility with raw SQL for FTS5 and complex operations.
 *
 * Note: We use the drizzle-orm/better-sqlite3 driver because libsql provides
 * a compatible API.
 */

import Database from 'libsql';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import { CREATE_TABLES_SQL, DROP_TABLES_SQL, SCHEMA_VERSION } from './schema';
import { createMigrationRegistry, FRAMEWORK_MIGRATIONS, type Migration } from './migrations';

/**
 * Database connection options.
 */
export interface DatabaseOptions {
  /** Path to the database file, or ':memory:' for in-memory */
  path: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Whether to run in read-only mode */
  readonly?: boolean;
}

/**
 * Database connection wrapper.
 */
export interface DatabaseConnection {
  /** The underlying libsql database instance */
  db: Database.Database;
  /** Close the database connection */
  close(): void;
  /** Get the current schema version */
  getSchemaVersion(): number;
  /** Check if the database is initialized */
  isInitialized(): boolean;
  /** Initialize the database schema */
  initialize(): void;
  /** Reset the database (drop all tables) - USE WITH CAUTION */
  reset(): void;
  /** Register domain migrations */
  registerMigrations(domain: string, migrations: Migration[]): void;
  /** Run any pending migrations */
  runMigrations(): number;
}

/**
 * Open a database connection.
 *
 * @param options - Database connection options
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

  const migrationRegistry = createMigrationRegistry(FRAMEWORK_MIGRATIONS);

  return {
    db,

    close(): void {
      db.close();
    },

    getSchemaVersion(): number {
      return migrationRegistry.getCurrentVersion(db);
    },

    isInitialized(): boolean {
      return this.getSchemaVersion() > 0;
    },

    initialize(): void {
      if (this.isInitialized()) {
        // Run any pending migrations
        this.runMigrations();
        return;
      }

      // Create all tables
      db.exec(CREATE_TABLES_SQL);

      // Record schema version
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
    },

    reset(): void {
      db.exec(DROP_TABLES_SQL);
    },

    registerMigrations(domain: string, migrations: Migration[]): void {
      migrationRegistry.registerDomainMigrations(domain, migrations);
    },

    runMigrations(): number {
      return migrationRegistry.runPendingMigrations(db);
    },
  };
}

/**
 * Create an in-memory database for testing.
 * The database is automatically initialized.
 */
export function createTestDatabase(): DatabaseConnection {
  const conn = openDatabase({ path: ':memory:' });
  conn.initialize();
  return conn;
}
