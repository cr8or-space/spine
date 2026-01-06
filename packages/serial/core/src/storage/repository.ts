/**
 * Base repository pattern for database operations
 */

import type Database from 'libsql';
import { nanoid } from 'nanoid';

import type { Result } from '@repo/serial-types';

export interface Repository<T, TCreate = Omit<T, 'id' | 'createdAt' | 'updatedAt'>> {
  findById(id: string): T | undefined;
  findAll(): T[];
  create(data: TCreate): T;
  update(id: string, data: Partial<T>): T | undefined;
  delete(id: string): boolean;
}

export interface ProjectScopedRepository<T, TCreate = Omit<T, 'id' | 'createdAt' | 'updatedAt'>> {
  findById(projectId: string, id: string): T | undefined;
  findByProject(projectId: string): T[];
  create(projectId: string, data: TCreate): T;
  update(projectId: string, id: string, data: Partial<T>): T | undefined;
  delete(projectId: string, id: string): boolean;
  deleteByProject(projectId: string): number;
}

/**
 * Generate a new unique ID
 */
export function generateId(): string {
  return nanoid();
}

/**
 * Get current ISO timestamp
 */
export function nowTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse JSON safely, returning default value on error
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
 * Convert boolean to SQLite integer
 */
export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Convert SQLite integer to boolean
 */
export function intToBool(value: number | null | undefined): boolean {
  return value === 1;
}

/**
 * Wrap a database operation in a Result type
 */
export function wrapResult<T>(operation: () => T): Result<T> {
  try {
    return { success: true, data: operation() };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Create a base repository with common operations
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
 * Create a project-scoped base repository
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
