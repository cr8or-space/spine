/**
 * Plot thread repository for database operations
 */

import type Database from 'libsql';

import type { NarrativePromise, PlotThread, ThreadTouch } from '@repo/types';

import { createProjectScopedRepository, generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

interface ContentRef {
  contentId: string;
  chapterNumber?: number;
}

/**
 * Database row representation of a plot thread
 */
interface PlotThreadRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  type: PlotThread['type'];
  status: PlotThread['status'];
  scope: PlotThread['scope'];
  priority: number;
  involved_characters_json: string;
  related_locations_json: string;
  promises_json: string;
  touches_json: string;
  parent_thread_id: string | null;
  child_threads_json: string;
  introduced_at_json: string | null;
  resolved_at_json: string | null;
  created_at: string;
  updated_at: string;
}

function rowToPlotThread(row: PlotThreadRow): PlotThread {
  return {
    id: row.id,
    entityType: 'plot-thread',
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    scope: row.scope,
    priority: row.priority,
    involvedCharacters: parseJson<string[]>(row.involved_characters_json, []),
    relatedLocations: parseJson<string[]>(row.related_locations_json, []),
    promises: parseJson<NarrativePromise[]>(row.promises_json, []),
    touches: parseJson<ThreadTouch[]>(row.touches_json, []),
    parentThreadId: row.parent_thread_id ?? undefined,
    childThreads: parseJson<string[]>(row.child_threads_json, []),
    introducedAt: row.introduced_at_json ? (JSON.parse(row.introduced_at_json) as ContentRef) : undefined,
    resolvedAt: row.resolved_at_json ? (JSON.parse(row.resolved_at_json) as ContentRef) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreatePlotThreadData = Omit<PlotThread, 'id' | 'createdAt' | 'updatedAt'>;
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

export function createPlotThreadRepository(db: Database.Database): PlotThreadRepository {
  const base = createProjectScopedRepository<PlotThreadRow>(db, 'plot_threads');

  const insertStmt = db.prepare(`
    INSERT INTO plot_threads (
      id, project_id, name, description, type, status, scope, priority,
      involved_characters_json, related_locations_json, promises_json, touches_json,
      parent_thread_id, child_threads_json, introduced_at_json, resolved_at_json,
      created_at, updated_at
    ) VALUES (
      @id, @project_id, @name, @description, @type, @status, @scope, @priority,
      @involved_characters_json, @related_locations_json, @promises_json, @touches_json,
      @parent_thread_id, @child_threads_json, @introduced_at_json, @resolved_at_json,
      @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE plot_threads SET
      name = @name,
      description = @description,
      type = @type,
      status = @status,
      scope = @scope,
      priority = @priority,
      involved_characters_json = @involved_characters_json,
      related_locations_json = @related_locations_json,
      promises_json = @promises_json,
      touches_json = @touches_json,
      parent_thread_id = @parent_thread_id,
      child_threads_json = @child_threads_json,
      introduced_at_json = @introduced_at_json,
      resolved_at_json = @resolved_at_json,
      updated_at = @updated_at
    WHERE project_id = @project_id AND id = @id
  `);

  const findByNameStmt = db.prepare(`SELECT * FROM plot_threads WHERE project_id = ? AND name = ?`);
  const findByTypeStmt = db.prepare(`SELECT * FROM plot_threads WHERE project_id = ? AND type = ?`);
  const findByStatusStmt = db.prepare(`SELECT * FROM plot_threads WHERE project_id = ? AND status = ?`);
  const findActiveStmt = db.prepare(`SELECT * FROM plot_threads WHERE project_id = ? AND status IN ('planned', 'active')`);
  const findChildrenStmt = db.prepare(`SELECT * FROM plot_threads WHERE project_id = ? AND parent_thread_id = ?`);

  return {
    findById(projectId: string, id: string): PlotThread | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToPlotThread(row) : undefined;
    },

    findByProject(projectId: string): PlotThread[] {
      return base.findByProject(projectId).map(rowToPlotThread);
    },

    create(projectId: string, data: CreatePlotThreadData): PlotThread {
      const now = nowTimestamp();
      const id = generateId();

      const row: PlotThreadRow = {
        id,
        project_id: projectId,
        name: data.name,
        description: data.description,
        type: data.type,
        status: data.status,
        scope: data.scope,
        priority: data.priority,
        involved_characters_json: JSON.stringify(data.involvedCharacters),
        related_locations_json: JSON.stringify(data.relatedLocations),
        promises_json: JSON.stringify(data.promises),
        touches_json: JSON.stringify(data.touches),
        parent_thread_id: data.parentThreadId ?? null,
        child_threads_json: JSON.stringify(data.childThreads),
        introduced_at_json: data.introducedAt ? JSON.stringify(data.introducedAt) : null,
        resolved_at_json: data.resolvedAt ? JSON.stringify(data.resolvedAt) : null,
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToPlotThread(row);
    },

    update(projectId: string, id: string, data: UpdatePlotThreadData): PlotThread | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: PlotThreadRow = {
        id,
        project_id: projectId,
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        status: data.status ?? existing.status,
        scope: data.scope ?? existing.scope,
        priority: data.priority ?? existing.priority,
        involved_characters_json: data.involvedCharacters
          ? JSON.stringify(data.involvedCharacters)
          : JSON.stringify(existing.involvedCharacters),
        related_locations_json: data.relatedLocations
          ? JSON.stringify(data.relatedLocations)
          : JSON.stringify(existing.relatedLocations),
        promises_json: data.promises ? JSON.stringify(data.promises) : JSON.stringify(existing.promises),
        touches_json: data.touches ? JSON.stringify(data.touches) : JSON.stringify(existing.touches),
        parent_thread_id: data.parentThreadId !== undefined ? (data.parentThreadId ?? null) : (existing.parentThreadId ?? null),
        child_threads_json: data.childThreads ? JSON.stringify(data.childThreads) : JSON.stringify(existing.childThreads),
        introduced_at_json:
          data.introducedAt !== undefined
            ? data.introducedAt
              ? JSON.stringify(data.introducedAt)
              : null
            : existing.introducedAt
              ? JSON.stringify(existing.introducedAt)
              : null,
        resolved_at_json:
          data.resolvedAt !== undefined
            ? data.resolvedAt
              ? JSON.stringify(data.resolvedAt)
              : null
            : existing.resolvedAt
              ? JSON.stringify(existing.resolvedAt)
              : null,
        created_at: existing.createdAt,
        updated_at: now,
      };

      updateStmt.run(updated);
      return rowToPlotThread(updated);
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByName(projectId: string, name: string): PlotThread | undefined {
      const row = findByNameStmt.get(projectId, name) as PlotThreadRow | undefined;
      return row ? rowToPlotThread(row) : undefined;
    },

    findByType(projectId: string, type: PlotThread['type']): PlotThread[] {
      const rows = findByTypeStmt.all(projectId, type) as PlotThreadRow[];
      return rows.map(rowToPlotThread);
    },

    findByStatus(projectId: string, status: PlotThread['status']): PlotThread[] {
      const rows = findByStatusStmt.all(projectId, status) as PlotThreadRow[];
      return rows.map(rowToPlotThread);
    },

    findActive(projectId: string): PlotThread[] {
      const rows = findActiveStmt.all(projectId) as PlotThreadRow[];
      return rows.map(rowToPlotThread);
    },

    findByCharacter(projectId: string, characterId: string): PlotThread[] {
      // Filter in JavaScript since involved_characters is JSON
      return this.findByProject(projectId).filter((t) => t.involvedCharacters.includes(characterId));
    },

    findChildren(projectId: string, parentId: string): PlotThread[] {
      const rows = findChildrenStmt.all(projectId, parentId) as PlotThreadRow[];
      return rows.map(rowToPlotThread);
    },

    addTouch(projectId: string, id: string, touch: ThreadTouch): PlotThread | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const touches = [...existing.touches, touch];
      return this.update(projectId, id, { touches, status: 'active' });
    },

    addPromise(projectId: string, id: string, promise: NarrativePromise): PlotThread | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const promises = [...existing.promises, promise];
      return this.update(projectId, id, { promises });
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
