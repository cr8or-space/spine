/**
 * Lock point repository for database operations
 */

import type Database from 'libsql';

import type { LockPoint } from '@repo/types';

import {
  createProjectScopedRepository,
  generateId,
  nowTimestamp,
  type ProjectScopedRepository,
} from '../repository';

/**
 * Database row representation of lock point
 */
interface LockPointRow {
  id: string;
  project_id: string;
  content_id: string;
  reason: string;
  type: 'cascade-protection' | 'full-lock';
  created_at: string;
}

function rowToLockPoint(row: LockPointRow): LockPoint {
  return {
    id: row.id,
    contentId: row.content_id,
    reason: row.reason,
    type: row.type,
    createdAt: row.created_at,
  };
}

export type CreateLockPointData = Omit<LockPoint, 'id' | 'createdAt'>;

export interface LockPointRepository extends ProjectScopedRepository<LockPoint, CreateLockPointData> {
  findByContent(projectId: string, contentId: string): LockPoint[];
  deleteByContent(projectId: string, contentId: string): number;
}

export function createLockPointRepository(db: Database.Database): LockPointRepository {
  const base = createProjectScopedRepository<LockPointRow>(db, 'lock_points');

  const insertStmt = db.prepare(`
    INSERT INTO lock_points (id, project_id, content_id, reason, type, created_at)
    VALUES (@id, @project_id, @content_id, @reason, @type, @created_at)
  `);

  const findByContentStmt = db.prepare(
    `SELECT * FROM lock_points WHERE project_id = ? AND content_id = ?`
  );

  const deleteByContentStmt = db.prepare(
    `DELETE FROM lock_points WHERE project_id = ? AND content_id = ?`
  );

  return {
    findById(projectId: string, id: string): LockPoint | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToLockPoint(row) : undefined;
    },

    findByProject(projectId: string): LockPoint[] {
      return base.findByProject(projectId).map(rowToLockPoint);
    },

    create(projectId: string, data: CreateLockPointData): LockPoint {
      const now = nowTimestamp();
      const id = generateId();

      const row: LockPointRow = {
        id,
        project_id: projectId,
        content_id: data.contentId,
        reason: data.reason,
        type: data.type,
        created_at: now,
      };

      insertStmt.run(row);
      return rowToLockPoint(row);
    },

    update(): undefined {
      // Lock points are immutable once created
      return undefined;
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByContent(projectId: string, contentId: string): LockPoint[] {
      const rows = findByContentStmt.all(projectId, contentId) as LockPointRow[];
      return rows.map(rowToLockPoint);
    },

    deleteByContent(projectId: string, contentId: string): number {
      const result = deleteByContentStmt.run(projectId, contentId);
      return result.changes;
    },
  };
}
