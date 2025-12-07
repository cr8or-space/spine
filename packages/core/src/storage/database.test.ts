/**
 * Database connection and initialization tests
 */

import { describe, it, expect, afterEach } from 'vitest';

import { createTestDatabase, openDatabase, type DatabaseConnection } from './database';
import { SCHEMA_VERSION } from './schema';

describe('Database', () => {
  let db: DatabaseConnection | null = null;

  afterEach(() => {
    db?.close();
    db = null;
  });

  describe('openDatabase', () => {
    it('should open an in-memory database', () => {
      db = openDatabase({ path: ':memory:' });
      expect(db).toBeDefined();
      expect(db.db).toBeDefined();
    });

    it('should report uninitialized for fresh database', () => {
      db = openDatabase({ path: ':memory:' });
      expect(db.isInitialized()).toBe(false);
      expect(db.getSchemaVersion()).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should initialize the database schema', () => {
      db = openDatabase({ path: ':memory:' });
      db.initialize();

      expect(db.isInitialized()).toBe(true);
      expect(db.getSchemaVersion()).toBe(SCHEMA_VERSION);
    });

    it('should create all required tables', () => {
      db = openDatabase({ path: ':memory:' });
      db.initialize();

      // Check that core tables exist
      const tables = db.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];

      const tableNames = tables.map((t) => t.name);

      expect(tableNames).toContain('projects');
      expect(tableNames).toContain('characters');
      expect(tableNames).toContain('locations');
      expect(tableNames).toContain('factions');
      expect(tableNames).toContain('world_rules');
      expect(tableNames).toContain('plot_threads');
      expect(tableNames).toContain('timeline_events');
      expect(tableNames).toContain('timeline_spans');
      expect(tableNames).toContain('structures');
      expect(tableNames).toContain('contents');
      expect(tableNames).toContain('content_versions');
      expect(tableNames).toContain('lock_points');
      expect(tableNames).toContain('cross_references');
    });

    it('should be idempotent', () => {
      db = openDatabase({ path: ':memory:' });
      db.initialize();
      db.initialize();
      db.initialize();

      expect(db.isInitialized()).toBe(true);
      expect(db.getSchemaVersion()).toBe(SCHEMA_VERSION);
    });
  });

  describe('reset', () => {
    it('should drop all tables', () => {
      db = openDatabase({ path: ':memory:' });
      db.initialize();
      db.reset();

      expect(db.isInitialized()).toBe(false);
      expect(db.getSchemaVersion()).toBe(0);
    });

    it('should allow reinitializing after reset', () => {
      db = openDatabase({ path: ':memory:' });
      db.initialize();
      db.reset();
      db.initialize();

      expect(db.isInitialized()).toBe(true);
    });
  });

  describe('createTestDatabase', () => {
    it('should create an initialized in-memory database', () => {
      db = createTestDatabase();

      expect(db.isInitialized()).toBe(true);
      expect(db.getSchemaVersion()).toBe(SCHEMA_VERSION);
    });
  });

  describe('foreign keys', () => {
    it('should enforce foreign key constraints', () => {
      db = createTestDatabase();

      // Try to insert a character without a valid project
      expect(() => {
        db!.db
          .prepare(
            `
          INSERT INTO characters (id, project_id, name, role, status, created_at, updated_at)
          VALUES ('char1', 'nonexistent', 'Test', 'major', 'active', datetime('now'), datetime('now'))
        `
          )
          .run();
      }).toThrow();
    });

    it('should cascade deletes for project children', () => {
      db = createTestDatabase();

      // Insert a project and character
      db.db
        .prepare(
          `
        INSERT INTO projects (id, title, format, settings_json, metadata_json, created_at, updated_at)
        VALUES ('proj1', 'Test Project', 'web-serial', '{}', '{"genres":[]}', datetime('now'), datetime('now'))
      `
        )
        .run();

      db.db
        .prepare(
          `
        INSERT INTO characters (id, project_id, name, role, status, created_at, updated_at)
        VALUES ('char1', 'proj1', 'Test Character', 'major', 'active', datetime('now'), datetime('now'))
      `
        )
        .run();

      // Verify character exists
      const before = db.db.prepare('SELECT COUNT(*) as count FROM characters WHERE project_id = ?').get('proj1') as {
        count: number;
      };
      expect(before.count).toBe(1);

      // Delete project
      db.db.prepare('DELETE FROM projects WHERE id = ?').run('proj1');

      // Character should be gone
      const after = db.db.prepare('SELECT COUNT(*) as count FROM characters WHERE project_id = ?').get('proj1') as {
        count: number;
      };
      expect(after.count).toBe(0);
    });
  });
});
