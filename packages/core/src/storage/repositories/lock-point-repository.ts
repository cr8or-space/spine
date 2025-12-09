/**
 * Lock point repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries.
 */

import type Database from 'libsql';
import { and, eq } from 'drizzle-orm';

import type { LockPoint } from '@repo/types';

import type { DrizzleDB } from '../database';
import { lockPoints } from '../drizzle-schema';
import { generateId, nowTimestamp, type ProjectScopedRepository } from '../repository';

/**
 * Convert Drizzle row to LockPoint entity
 */
function rowToLockPoint(row: typeof lockPoints.$inferSelect): LockPoint {
  return {
    id: row.id,
    contentId: row.contentId,
    reason: row.reason,
    type: row.type,
    createdAt: row.createdAt,
  };
}

export type CreateLockPointData = Omit<LockPoint, 'id' | 'createdAt'>;

export interface LockPointRepository extends ProjectScopedRepository<LockPoint, CreateLockPointData> {
  findByContent(projectId: string, contentId: string): LockPoint[];
  deleteByContent(projectId: string, contentId: string): number;
}

export function createLockPointRepository(_db: Database.Database, drizzleDb: DrizzleDB): LockPointRepository {
  return {
    findById(projectId: string, id: string): LockPoint | undefined {
      const row = drizzleDb
        .select()
        .from(lockPoints)
        .where(and(eq(lockPoints.projectId, projectId), eq(lockPoints.id, id)))
        .get();
      return row ? rowToLockPoint(row) : undefined;
    },

    findByProject(projectId: string): LockPoint[] {
      const rows = drizzleDb.select().from(lockPoints).where(eq(lockPoints.projectId, projectId)).all();
      return rows.map(rowToLockPoint);
    },

    create(projectId: string, data: CreateLockPointData): LockPoint {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        contentId: data.contentId,
        reason: data.reason,
        type: data.type,
        createdAt: now,
      };

      drizzleDb.insert(lockPoints).values(newRow).run();

      return {
        id,
        contentId: data.contentId,
        reason: data.reason,
        type: data.type,
        createdAt: now,
      };
    },

    update(): undefined {
      // Lock points are immutable once created
      return undefined;
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(lockPoints)
        .where(and(eq(lockPoints.projectId, projectId), eq(lockPoints.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(lockPoints).where(eq(lockPoints.projectId, projectId)).run();
      return result.changes;
    },

    findByContent(projectId: string, contentId: string): LockPoint[] {
      const rows = drizzleDb
        .select()
        .from(lockPoints)
        .where(and(eq(lockPoints.projectId, projectId), eq(lockPoints.contentId, contentId)))
        .all();
      return rows.map(rowToLockPoint);
    },

    deleteByContent(projectId: string, contentId: string): number {
      const result = drizzleDb
        .delete(lockPoints)
        .where(and(eq(lockPoints.projectId, projectId), eq(lockPoints.contentId, contentId)))
        .run();
      return result.changes;
    },
  };
}
