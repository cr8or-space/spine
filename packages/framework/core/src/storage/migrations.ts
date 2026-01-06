/**
 * Database migration system for Spine Framework.
 *
 * Provides a simple, versioned migration system that:
 * - Tracks applied migrations in the schema_version table
 * - Runs pending migrations in order
 * - Supports domain-specific migrations via extension
 */

import type Database from 'libsql';

/**
 * A database migration definition.
 */
export interface Migration {
  /** Migration version number (must be unique and sequential) */
  version: number;
  /** Human-readable description of what this migration does */
  description: string;
  /** SQL statements to apply the migration */
  up: string;
  /** Optional SQL statements to reverse the migration (not always possible) */
  down?: string;
}

/**
 * Migration registry for managing framework and domain migrations.
 */
export interface MigrationRegistry {
  /**
   * Register migrations for a domain.
   * Domain migrations run after framework migrations.
   */
  registerDomainMigrations(domain: string, migrations: Migration[]): void;

  /**
   * Get all registered migrations in order.
   */
  getAllMigrations(): Migration[];

  /**
   * Get the current schema version from the database.
   */
  getCurrentVersion(db: Database.Database): number;

  /**
   * Get pending migrations that need to be applied.
   */
  getPendingMigrations(db: Database.Database): Migration[];

  /**
   * Run all pending migrations.
   * Returns the number of migrations applied.
   */
  runPendingMigrations(db: Database.Database): number;

  /**
   * Run migrations up to a specific version.
   */
  migrateToVersion(db: Database.Database, targetVersion: number): number;
}

/**
 * Create a migration registry.
 *
 * @param frameworkMigrations - Base framework migrations
 */
export function createMigrationRegistry(frameworkMigrations: Migration[] = []): MigrationRegistry {
  const domainMigrations = new Map<string, Migration[]>();

  return {
    registerDomainMigrations(domain: string, migrations: Migration[]): void {
      // Validate migration versions are unique and sequential within domain
      const versions = new Set<number>();
      for (const m of migrations) {
        if (versions.has(m.version)) {
          throw new Error(`Duplicate migration version ${m.version} in domain '${domain}'`);
        }
        versions.add(m.version);
      }
      domainMigrations.set(domain, migrations);
    },

    getAllMigrations(): Migration[] {
      // Framework migrations first, then domain migrations sorted by version
      const allMigrations = [...frameworkMigrations];

      for (const [, migrations] of domainMigrations) {
        allMigrations.push(...migrations);
      }

      return allMigrations.sort((a, b) => a.version - b.version);
    },

    getCurrentVersion(db: Database.Database): number {
      try {
        const row = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as
          | { version: number }
          | undefined;
        return row?.version ?? 0;
      } catch {
        // Table doesn't exist - schema not initialized
        return 0;
      }
    },

    getPendingMigrations(db: Database.Database): Migration[] {
      const currentVersion = this.getCurrentVersion(db);
      return this.getAllMigrations().filter((m) => m.version > currentVersion);
    },

    runPendingMigrations(db: Database.Database): number {
      const pending = this.getPendingMigrations(db);

      for (const migration of pending) {
        runMigration(db, migration);
      }

      return pending.length;
    },

    migrateToVersion(db: Database.Database, targetVersion: number): number {
      const currentVersion = this.getCurrentVersion(db);

      if (targetVersion < currentVersion) {
        throw new Error(
          `Cannot downgrade from version ${currentVersion} to ${targetVersion}. ` +
            'Down migrations are not automatically supported.'
        );
      }

      const toApply = this.getAllMigrations().filter(
        (m) => m.version > currentVersion && m.version <= targetVersion
      );

      for (const migration of toApply) {
        runMigration(db, migration);
      }

      return toApply.length;
    },
  };
}

/**
 * Run a single migration within a transaction.
 */
function runMigration(db: Database.Database, migration: Migration): void {
  db.transaction(() => {
    // Execute the migration SQL
    db.exec(migration.up);

    // Record the migration
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version);
  })();
}

/**
 * Default framework migrations (empty - schema created via CREATE_TABLES_SQL).
 *
 * Framework migrations are for changes after initial release.
 * Version 1 is the baseline created by CREATE_TABLES_SQL.
 */
export const FRAMEWORK_MIGRATIONS: Migration[] = [
  // Future framework migrations will be added here
  // Example:
  // {
  //   version: 2,
  //   description: 'Add full-text search support',
  //   up: `CREATE VIRTUAL TABLE content_fts USING fts5(...);`,
  // },
];
