/**
 * Plot thread repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries.
 */

import type Database from 'libsql';
import { and, eq, inArray } from 'drizzle-orm';

import {
  ContentLocationSchema,
  type NarrativePromise,
  NarrativePromiseSchema,
  type PlotThread,
  type ThreadTouch,
  ThreadTouchSchema,
} from '@repo/serial-types';
import { z } from 'zod';

import type { DrizzleDB } from '../database';
import { plotThreads } from '../drizzle-schema';
import { appendToArray } from '../relation-helpers';
import {
  generateId,
  nowTimestamp,
  parseJsonWithSchema,
  updateOptionalJson,
  updateOptionalValue,
  updateRequiredJson,
  type ProjectScopedRepository,
} from '../repository';

// Schemas for JSON array fields
const StringArraySchema = z.array(z.string());
const NarrativePromisesArraySchema = z.array(NarrativePromiseSchema);
const ThreadTouchesArraySchema = z.array(ThreadTouchSchema);
const OptionalContentLocationSchema = ContentLocationSchema.optional();

interface ContentRef {
  contentId: string;
  chapterNumber?: number;
}

/**
 * Convert Drizzle row to PlotThread entity
 */
function rowToPlotThread(row: typeof plotThreads.$inferSelect): PlotThread {
  return {
    id: row.id,
    entityType: 'plot-thread',
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    scope: row.scope,
    priority: row.priority,
    involvedCharacters: parseJsonWithSchema(row.involvedCharactersJson, StringArraySchema, [], 'plotThread.involvedCharacters'),
    relatedLocations: parseJsonWithSchema(row.relatedLocationsJson, StringArraySchema, [], 'plotThread.relatedLocations'),
    promises: parseJsonWithSchema(row.promisesJson, NarrativePromisesArraySchema, [], 'plotThread.promises'),
    touches: parseJsonWithSchema(row.touchesJson, ThreadTouchesArraySchema, [], 'plotThread.touches'),
    parentThreadId: row.parentThreadId ?? undefined,
    childThreads: parseJsonWithSchema(row.childThreadsJson, StringArraySchema, [], 'plotThread.childThreads'),
    introducedAt: parseJsonWithSchema(row.introducedAtJson, OptionalContentLocationSchema, undefined, 'plotThread.introducedAt'),
    resolvedAt: parseJsonWithSchema(row.resolvedAtJson, OptionalContentLocationSchema, undefined, 'plotThread.resolvedAt'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type CreatePlotThreadData = Omit<PlotThread, 'id' | 'entityType' | 'createdAt' | 'updatedAt'>;
export type UpdatePlotThreadData = Partial<Omit<PlotThread, 'id' | 'createdAt' | 'updatedAt'>>;

export interface PlotThreadRepository extends ProjectScopedRepository<PlotThread, CreatePlotThreadData> {
  findByName(projectId: string, name: string): PlotThread | undefined;
  findByType(projectId: string, type: PlotThread['type']): PlotThread[];
  findByStatus(projectId: string, status: PlotThread['status']): PlotThread[];
  findActive(projectId: string): PlotThread[];
  findByCharacter(projectId: string, characterId: string): PlotThread[];
  findChildren(projectId: string, parentId: string): PlotThread[];
  addTouch(projectId: string, id: string, touch: ThreadTouch): PlotThread | undefined;
  addPromise(projectId: string, id: string, promise: NarrativePromise): PlotThread | undefined;
  fulfillPromise(projectId: string, id: string, promiseId: string, fulfilledAt: ContentRef): PlotThread | undefined;
  resolve(projectId: string, id: string, resolvedAt: ContentRef): PlotThread | undefined;
}

export function createPlotThreadRepository(_db: Database.Database, drizzleDb: DrizzleDB): PlotThreadRepository {
  return {
    findById(projectId: string, id: string): PlotThread | undefined {
      const row = drizzleDb
        .select()
        .from(plotThreads)
        .where(and(eq(plotThreads.projectId, projectId), eq(plotThreads.id, id)))
        .get();
      return row ? rowToPlotThread(row) : undefined;
    },

    findByProject(projectId: string): PlotThread[] {
      const rows = drizzleDb.select().from(plotThreads).where(eq(plotThreads.projectId, projectId)).all();
      return rows.map(rowToPlotThread);
    },

    create(projectId: string, data: CreatePlotThreadData): PlotThread {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        name: data.name,
        description: data.description,
        type: data.type,
        status: data.status,
        scope: data.scope,
        priority: data.priority,
        involvedCharactersJson: JSON.stringify(data.involvedCharacters),
        relatedLocationsJson: JSON.stringify(data.relatedLocations),
        promisesJson: JSON.stringify(data.promises),
        touchesJson: JSON.stringify(data.touches),
        parentThreadId: data.parentThreadId ?? null,
        childThreadsJson: JSON.stringify(data.childThreads),
        introducedAtJson: data.introducedAt ? JSON.stringify(data.introducedAt) : null,
        resolvedAtJson: data.resolvedAt ? JSON.stringify(data.resolvedAt) : null,
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(plotThreads).values(newRow).run();

      return {
        id,
        entityType: 'plot-thread',
        name: data.name,
        description: data.description,
        type: data.type,
        status: data.status,
        scope: data.scope,
        priority: data.priority,
        involvedCharacters: data.involvedCharacters,
        relatedLocations: data.relatedLocations,
        promises: data.promises,
        touches: data.touches,
        parentThreadId: data.parentThreadId,
        childThreads: data.childThreads,
        introducedAt: data.introducedAt,
        resolvedAt: data.resolvedAt,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(projectId: string, id: string, data: UpdatePlotThreadData): PlotThread | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updateData = {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        status: data.status ?? existing.status,
        scope: data.scope ?? existing.scope,
        priority: data.priority ?? existing.priority,
        involvedCharactersJson: updateRequiredJson(data.involvedCharacters, existing.involvedCharacters),
        relatedLocationsJson: updateRequiredJson(data.relatedLocations, existing.relatedLocations),
        promisesJson: updateRequiredJson(data.promises, existing.promises),
        touchesJson: updateRequiredJson(data.touches, existing.touches),
        parentThreadId: updateOptionalValue(data.parentThreadId, existing.parentThreadId),
        childThreadsJson: updateRequiredJson(data.childThreads, existing.childThreads),
        introducedAtJson: updateOptionalJson(data.introducedAt, existing.introducedAt),
        resolvedAtJson: updateOptionalJson(data.resolvedAt, existing.resolvedAt),
        updatedAt: now,
      };

      drizzleDb
        .update(plotThreads)
        .set(updateData)
        .where(and(eq(plotThreads.projectId, projectId), eq(plotThreads.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(plotThreads)
        .where(and(eq(plotThreads.projectId, projectId), eq(plotThreads.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(plotThreads).where(eq(plotThreads.projectId, projectId)).run();
      return result.changes;
    },

    findByName(projectId: string, name: string): PlotThread | undefined {
      const row = drizzleDb
        .select()
        .from(plotThreads)
        .where(and(eq(plotThreads.projectId, projectId), eq(plotThreads.name, name)))
        .get();
      return row ? rowToPlotThread(row) : undefined;
    },

    findByType(projectId: string, type: PlotThread['type']): PlotThread[] {
      const rows = drizzleDb
        .select()
        .from(plotThreads)
        .where(and(eq(plotThreads.projectId, projectId), eq(plotThreads.type, type)))
        .all();
      return rows.map(rowToPlotThread);
    },

    findByStatus(projectId: string, status: PlotThread['status']): PlotThread[] {
      const rows = drizzleDb
        .select()
        .from(plotThreads)
        .where(and(eq(plotThreads.projectId, projectId), eq(plotThreads.status, status)))
        .all();
      return rows.map(rowToPlotThread);
    },

    findActive(projectId: string): PlotThread[] {
      const rows = drizzleDb
        .select()
        .from(plotThreads)
        .where(and(eq(plotThreads.projectId, projectId), inArray(plotThreads.status, ['planned', 'active'])))
        .all();
      return rows.map(rowToPlotThread);
    },

    findByCharacter(projectId: string, characterId: string): PlotThread[] {
      // Filter in JavaScript since involved_characters is JSON
      return this.findByProject(projectId).filter((t) => t.involvedCharacters.includes(characterId));
    },

    findChildren(projectId: string, parentId: string): PlotThread[] {
      const rows = drizzleDb
        .select()
        .from(plotThreads)
        .where(and(eq(plotThreads.projectId, projectId), eq(plotThreads.parentThreadId, parentId)))
        .all();
      return rows.map(rowToPlotThread);
    },

    addTouch(projectId: string, id: string, touch: ThreadTouch): PlotThread | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      return appendToArray({
        entity: existing,
        field: 'touches',
        item: touch,
        update: (data) => this.update(projectId, id, { ...data, status: 'active' }),
      });
    },

    addPromise(projectId: string, id: string, promise: NarrativePromise): PlotThread | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      return appendToArray({
        entity: existing,
        field: 'promises',
        item: promise,
        update: (data) => this.update(projectId, id, data),
      });
    },

    fulfillPromise(projectId: string, id: string, promiseId: string, fulfilledAt: ContentRef): PlotThread | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const promises = existing.promises.map((p) =>
        p.id === promiseId ? { ...p, fulfilledAt, status: 'fulfilled' as const } : p
      );
      return this.update(projectId, id, { promises });
    },

    resolve(projectId: string, id: string, resolvedAt: ContentRef): PlotThread | undefined {
      return this.update(projectId, id, { resolvedAt, status: 'resolved' });
    },
  };
}
