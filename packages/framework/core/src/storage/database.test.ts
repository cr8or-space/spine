/**
 * Tests for database connection and initialization.
 */

import { describe, it, expect, afterEach } from 'vitest';

import { openDatabase, createTestDatabase, type DatabaseConnection } from './database';
import { SCHEMA_VERSION } from './schema';

describe('openDatabase', () => {
  let db: DatabaseConnection | null = null;

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
  });

  it('opens in-memory database', () => {
    db = openDatabase({ path: ':memory:' });
    expect(db).toBeDefined();
    expect(db.db).toBeDefined();
  });

  it('reports uninitialized state', () => {
    db = openDatabase({ path: ':memory:' });
    expect(db.isInitialized()).toBe(false);
    expect(db.getSchemaVersion()).toBe(0);
  });

  it('initializes schema', () => {
    db = openDatabase({ path: ':memory:' });
    db.initialize();
    expect(db.isInitialized()).toBe(true);
    expect(db.getSchemaVersion()).toBe(SCHEMA_VERSION);
  });

  it('initialize is idempotent', () => {
    db = openDatabase({ path: ':memory:' });
    db.initialize();
    db.initialize(); // Should not throw
    expect(db.getSchemaVersion()).toBe(SCHEMA_VERSION);
  });

  it('resets database', () => {
    db = openDatabase({ path: ':memory:' });
    db.initialize();
    expect(db.isInitialized()).toBe(true);

    db.reset();
    expect(db.isInitialized()).toBe(false);
  });
});

describe('createTestDatabase', () => {
  it('creates initialized in-memory database', () => {
    const db = createTestDatabase();
    expect(db.isInitialized()).toBe(true);
    expect(db.getSchemaVersion()).toBe(SCHEMA_VERSION);
    db.close();
  });
});

describe('schema tables', () => {
  let db: DatabaseConnection;

  afterEach(() => {
    db.close();
  });

  it('creates all framework tables', () => {
    db = createTestDatabase();

    // Check each table exists by querying sqlite_master
    const tables = db.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('entities');
    expect(tableNames).toContain('entity_relationships');
    expect(tableNames).toContain('spine_nodes');
    expect(tableNames).toContain('content');
    expect(tableNames).toContain('content_versions');
    expect(tableNames).toContain('content_references');
    expect(tableNames).toContain('constraints');
    expect(tableNames).toContain('validation_results');
    expect(tableNames).toContain('checkpoints');
    expect(tableNames).toContain('schema_version');
  });

  it('enables foreign keys', () => {
    db = createTestDatabase();

    const result = db.db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    expect(result.foreign_keys).toBe(1);
  });
});
