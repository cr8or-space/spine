/**
 * Base repository pattern for database operations.
 *
 * Provides common CRUD operations and utilities for working with SQLite.
 * Domain-specific repositories should extend or compose these base patterns.
 */

import type Database from 'libsql';
import { nanoid } from 'nanoid';

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Base repository interface for entities with id fields.
 */
export interface Repository<T, TCreate = Omit<T, 'id' | 'createdAt' | 'updatedAt'>> {
  findById(id: string): T | undefined;
  findAll(): T[];
  create(data: TCreate): T;
  update(id: string, data: Partial<T>): T | undefined;
  delete(id: string): boolean;
}

/**
 * Project-scoped repository interface.
 * Most spine data is project-scoped.
 */
export interface ProjectScopedRepository<T, TCreate = Omit<T, 'id' | 'createdAt' | 'updatedAt'>> {
  findById(projectId: string, id: string): T | undefined;
  findByProject(projectId: string): T[];
  create(projectId: string, data: TCreate): T;
  update(projectId: string, id: string, data: Partial<T>): T | undefined;
  delete(projectId: string, id: string): boolean;
  deleteByProject(projectId: string): number;
}

/**
 * Generate a new unique ID using nanoid.
 */
export function generateId(): string {
  return nanoid();
}

/**
 * Get current ISO timestamp.
 */
export function nowTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse JSON safely, returning default value on error.
 */
export function parseJson<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Convert boolean to SQLite integer (0 or 1).
 */
export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Convert SQLite integer to boolean.
 */
export function intToBool(value: number | null | undefined): boolean {
  return value === 1;
}

/**
 * Wrap a database operation in a Result type.
 */
export function wrapResult<T>(operation: () => T): Result<T> {
  try {
    return { success: true, data: operation() };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Create base repository operations for a table.
 *
 * @param db - Database connection
 * @param tableName - Name of the table
 */
export function createBaseRepository<TRow extends { id: string }>(
  db: Database.Database,
  tableName: string
): {
  findById: (id: string) => TRow | undefined;
  findAll: () => TRow[];
  deleteById: (id: string) => boolean;
} {
  const findByIdStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
  const findAllStmt = db.prepare(`SELECT * FROM ${tableName}`);
  const deleteByIdStmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);

  return {
    findById(id: string): TRow | undefined {
      return findByIdStmt.get(id) as TRow | undefined;
    },

    findAll(): TRow[] {
      return findAllStmt.all() as TRow[];
    },

    deleteById(id: string): boolean {
      const result = deleteByIdStmt.run(id);
      return result.changes > 0;
    },
  };
}

/**
 * Create project-scoped base repository operations.
 *
 * @param db - Database connection
 * @param tableName - Name of the table (must have project_id column)
 */
export function createProjectScopedRepository<TRow extends { id: string; project_id: string }>(
  db: Database.Database,
  tableName: string
): {
  findById: (projectId: string, id: string) => TRow | undefined;
  findByProject: (projectId: string) => TRow[];
  deleteById: (projectId: string, id: string) => boolean;
  deleteByProject: (projectId: string) => number;
} {
  const findByIdStmt = db.prepare(`SELECT * FROM ${tableName} WHERE project_id = ? AND id = ?`);
  const findByProjectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE project_id = ?`);
  const deleteByIdStmt = db.prepare(`DELETE FROM ${tableName} WHERE project_id = ? AND id = ?`);
  const deleteByProjectStmt = db.prepare(`DELETE FROM ${tableName} WHERE project_id = ?`);

  return {
    findById(projectId: string, id: string): TRow | undefined {
      return findByIdStmt.get(projectId, id) as TRow | undefined;
    },

    findByProject(projectId: string): TRow[] {
      return findByProjectStmt.all(projectId) as TRow[];
    },

    deleteById(projectId: string, id: string): boolean {
      const result = deleteByIdStmt.run(projectId, id);
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = deleteByProjectStmt.run(projectId);
      return result.changes;
    },
  };
}

/**
 * Row mapper helper for converting database rows to domain types.
 *
 * @param row - Raw database row
 * @param mapper - Function to transform the row
 */
export function mapRow<TRow, T>(row: TRow | undefined, mapper: (row: TRow) => T): T | undefined {
  return row ? mapper(row) : undefined;
}

/**
 * Map multiple rows.
 */
export function mapRows<TRow, T>(rows: TRow[], mapper: (row: TRow) => T): T[] {
  return rows.map(mapper);
}
