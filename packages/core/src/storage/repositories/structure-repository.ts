/**
 * Structure repository for database operations
 */

import type Database from 'better-sqlite3';

import type { Beat, ChapterType, Hook, Structure, StructureType } from '@repo/types';

import { createProjectScopedRepository, generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

/**
 * Database row representation of a structure
 */
interface StructureRow {
  id: string;
  project_id: string;
  type: StructureType;
  title: string;
  summary: string;
  beats_json: string;
  tension_target: number | null;
  chapter_type: ChapterType | null;
  hook_json: string | null;
  sort_order: number;
  parent_id: string | null;
  target_word_count: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to Structure entity (without children - those are loaded separately)
 */
function rowToStructure(row: StructureRow): Structure {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    beats: parseJson<Beat[]>(row.beats_json, []),
    tensionTarget: row.tension_target ?? undefined,
    chapterType: row.chapter_type ?? undefined,
    hook: row.hook_json ? (JSON.parse(row.hook_json) as Hook) : undefined,
    order: row.sort_order,
    children: [], // Loaded separately
    parentId: row.parent_id ?? undefined,
    targetWordCount: row.target_word_count ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateStructureData = Omit<Structure, 'id' | 'createdAt' | 'updatedAt' | 'children'>;
export type UpdateStructureData = Partial<Omit<Structure, 'id' | 'createdAt' | 'updatedAt' | 'children'>>;

export interface StructureRepository extends ProjectScopedRepository<Structure, CreateStructureData> {
  findByType(projectId: string, type: StructureType): Structure[];
  findChildren(projectId: string, parentId: string | null): Structure[];
  findRoot(projectId: string): Structure | undefined;
  loadWithChildren(projectId: string, id: string): Structure | undefined;
  loadFullTree(projectId: string): Structure | undefined;
  reorder(projectId: string, parentId: string | null, orderedIds: string[]): void;
  addBeat(projectId: string, id: string, beat: Beat): Structure | undefined;
  removeBeat(projectId: string, id: string, beatId: string): Structure | undefined;
  updateBeat(projectId: string, id: string, beatId: string, updates: Partial<Beat>): Structure | undefined;
  setHook(projectId: string, id: string, hook: Hook | undefined): Structure | undefined;
  move(projectId: string, id: string, newParentId: string | null, newOrder: number): Structure | undefined;
}

export function createStructureRepository(db: Database.Database): StructureRepository {
  const base = createProjectScopedRepository<StructureRow>(db, 'structures');

  const insertStmt = db.prepare(`
    INSERT INTO structures (
      id, project_id, type, title, summary, beats_json, tension_target,
      chapter_type, hook_json, sort_order, parent_id, target_word_count,
      notes, created_at, updated_at
    ) VALUES (
      @id, @project_id, @type, @title, @summary, @beats_json, @tension_target,
      @chapter_type, @hook_json, @sort_order, @parent_id, @target_word_count,
      @notes, @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE structures SET
      type = @type,
      title = @title,
      summary = @summary,
      beats_json = @beats_json,
      tension_target = @tension_target,
      chapter_type = @chapter_type,
      hook_json = @hook_json,
      sort_order = @sort_order,
      parent_id = @parent_id,
      target_word_count = @target_word_count,
      notes = @notes,
      updated_at = @updated_at
    WHERE project_id = @project_id AND id = @id
  `);

  const findByTypeStmt = db.prepare(`SELECT * FROM structures WHERE project_id = ? AND type = ?`);
  const findChildrenStmt = db.prepare(`SELECT * FROM structures WHERE project_id = ? AND parent_id IS ? ORDER BY sort_order`);
  const findRootStmt = db.prepare(`SELECT * FROM structures WHERE project_id = ? AND parent_id IS NULL LIMIT 1`);
  const reorderStmt = db.prepare(`UPDATE structures SET sort_order = ? WHERE project_id = ? AND id = ?`);

  /**
   * Recursively load children for a structure
   */
  function loadChildren(projectId: string, structure: Structure): Structure {
    const childRows = findChildrenStmt.all(projectId, structure.id) as StructureRow[];
    structure.children = childRows.map((row) => loadChildren(projectId, rowToStructure(row)));
    return structure;
  }

  return {
    findById(projectId: string, id: string): Structure | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToStructure(row) : undefined;
    },

    findByProject(projectId: string): Structure[] {
      return base.findByProject(projectId).map(rowToStructure);
    },

    create(projectId: string, data: CreateStructureData): Structure {
      const now = nowTimestamp();
      const id = generateId();

      const row: StructureRow = {
        id,
        project_id: projectId,
        type: data.type,
        title: data.title,
        summary: data.summary,
        beats_json: JSON.stringify(data.beats),
        tension_target: data.tensionTarget ?? null,
        chapter_type: data.chapterType ?? null,
        hook_json: data.hook ? JSON.stringify(data.hook) : null,
        sort_order: data.order,
        parent_id: data.parentId ?? null,
        target_word_count: data.targetWordCount ?? null,
        notes: data.notes ?? null,
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToStructure(row);
    },

    update(projectId: string, id: string, data: UpdateStructureData): Structure | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: StructureRow = {
        id,
        project_id: projectId,
        type: data.type ?? existing.type,
        title: data.title ?? existing.title,
        summary: data.summary ?? existing.summary,
        beats_json: data.beats ? JSON.stringify(data.beats) : JSON.stringify(existing.beats),
        tension_target: data.tensionTarget !== undefined ? (data.tensionTarget ?? null) : (existing.tensionTarget ?? null),
        chapter_type: data.chapterType !== undefined ? (data.chapterType ?? null) : (existing.chapterType ?? null),
        hook_json:
          data.hook !== undefined
            ? data.hook
              ? JSON.stringify(data.hook)
              : null
            : existing.hook
              ? JSON.stringify(existing.hook)
              : null,
        sort_order: data.order ?? existing.order,
        parent_id: data.parentId !== undefined ? (data.parentId ?? null) : (existing.parentId ?? null),
        target_word_count: data.targetWordCount !== undefined ? (data.targetWordCount ?? null) : (existing.targetWordCount ?? null),
        notes: data.notes !== undefined ? (data.notes ?? null) : (existing.notes ?? null),
        created_at: existing.createdAt,
        updated_at: now,
      };

      updateStmt.run(updated);
      return rowToStructure(updated);
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByType(projectId: string, type: StructureType): Structure[] {
      const rows = findByTypeStmt.all(projectId, type) as StructureRow[];
      return rows.map(rowToStructure);
    },

    findChildren(projectId: string, parentId: string | null): Structure[] {
      const rows = findChildrenStmt.all(projectId, parentId) as StructureRow[];
      return rows.map(rowToStructure);
    },

    findRoot(projectId: string): Structure | undefined {
      const row = findRootStmt.get(projectId) as StructureRow | undefined;
      return row ? rowToStructure(row) : undefined;
    },

    loadWithChildren(projectId: string, id: string): Structure | undefined {
      const structure = this.findById(projectId, id);
      if (!structure) return undefined;
      return loadChildren(projectId, structure);
    },

    loadFullTree(projectId: string): Structure | undefined {
      const root = this.findRoot(projectId);
      if (!root) return undefined;
      return loadChildren(projectId, root);
    },

    reorder(projectId: string, _parentId: string | null, orderedIds: string[]): void {
      const reorderTx = db.transaction(() => {
        for (let i = 0; i < orderedIds.length; i++) {
          reorderStmt.run(i, projectId, orderedIds[i]);
        }
      });
      reorderTx();
    },

    addBeat(projectId: string, id: string, beat: Beat): Structure | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const beats = [...existing.beats, beat];
      return this.update(projectId, id, { beats });
    },

    removeBeat(projectId: string, id: string, beatId: string): Structure | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const beats = existing.beats.filter((b) => b.id !== beatId);
      return this.update(projectId, id, { beats });
    },

    updateBeat(projectId: string, id: string, beatId: string, updates: Partial<Beat>): Structure | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const beats = existing.beats.map((b) => (b.id === beatId ? { ...b, ...updates } : b));
      return this.update(projectId, id, { beats });
    },

    setHook(projectId: string, id: string, hook: Hook | undefined): Structure | undefined {
      return this.update(projectId, id, { hook });
    },

    move(projectId: string, id: string, newParentId: string | null, newOrder: number): Structure | undefined {
      return this.update(projectId, id, { parentId: newParentId ?? undefined, order: newOrder });
    },
  };
}
