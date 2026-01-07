/**
 * Structure repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries.
 */

import type Database from 'libsql';
import { and, asc, eq, isNull } from 'drizzle-orm';

import type { Beat, ChapterType, Hook, Structure, StructureType } from '@repo/serial-types';

import type { DrizzleDB } from '../database';
import { structures } from '../drizzle-schema';
import { appendToArray, removeFromArray } from '../relation-helpers';
import { generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

/**
 * Convert Drizzle row to Structure entity (without children - those are loaded separately)
 */
function rowToStructure(row: typeof structures.$inferSelect): Structure {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    beats: parseJson<Beat[]>(row.beatsJson, []),
    tensionTarget: row.tensionTarget ?? undefined,
    chapterType: row.chapterType ?? undefined,
    hook: row.hookJson ? (JSON.parse(row.hookJson) as Hook) : undefined,
    order: row.sortOrder,
    children: [], // Loaded separately
    parentId: row.parentId ?? undefined,
    targetWordCount: row.targetWordCount ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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

export function createStructureRepository(db: Database.Database, drizzleDb: DrizzleDB): StructureRepository {
  // Reorder requires a transaction so we use raw db
  const reorderStmt = db.prepare(`UPDATE structures SET sort_order = ? WHERE project_id = ? AND id = ?`);

  /**
   * Recursively load children for a structure
   */
  function loadChildren(projectId: string, structure: Structure): Structure {
    const childRows = drizzleDb
      .select()
      .from(structures)
      .where(and(eq(structures.projectId, projectId), eq(structures.parentId, structure.id)))
      .orderBy(asc(structures.sortOrder))
      .all();
    structure.children = childRows.map((row) => loadChildren(projectId, rowToStructure(row)));
    return structure;
  }

  return {
    findById(projectId: string, id: string): Structure | undefined {
      const row = drizzleDb
        .select()
        .from(structures)
        .where(and(eq(structures.projectId, projectId), eq(structures.id, id)))
        .get();
      return row ? rowToStructure(row) : undefined;
    },

    findByProject(projectId: string): Structure[] {
      const rows = drizzleDb.select().from(structures).where(eq(structures.projectId, projectId)).all();
      return rows.map(rowToStructure);
    },

    create(projectId: string, data: CreateStructureData): Structure {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        type: data.type,
        title: data.title,
        summary: data.summary,
        beatsJson: JSON.stringify(data.beats),
        tensionTarget: data.tensionTarget ?? null,
        chapterType: data.chapterType ?? null,
        hookJson: data.hook ? JSON.stringify(data.hook) : null,
        sortOrder: data.order,
        parentId: data.parentId ?? null,
        targetWordCount: data.targetWordCount ?? null,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(structures).values(newRow).run();

      return {
        id,
        type: data.type,
        title: data.title,
        summary: data.summary,
        beats: data.beats,
        tensionTarget: data.tensionTarget,
        chapterType: data.chapterType,
        hook: data.hook,
        order: data.order,
        children: [],
        parentId: data.parentId,
        targetWordCount: data.targetWordCount,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(projectId: string, id: string, data: UpdateStructureData): Structure | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();

      // Helper to handle explicit undefined (clear field) vs not provided (keep existing)
      function resolveOptional<T>(dataValue: T | undefined, existingValue: T | undefined, key: keyof UpdateStructureData): T | null {
        if (key in data) {
          // Field was explicitly provided (including undefined to clear it)
          return dataValue ?? null;
        }
        // Field was not provided, keep existing
        return existingValue ?? null;
      }

      const updateData = {
        type: data.type ?? existing.type,
        title: data.title ?? existing.title,
        summary: data.summary ?? existing.summary,
        beatsJson: 'beats' in data ? JSON.stringify(data.beats ?? []) : JSON.stringify(existing.beats),
        tensionTarget: resolveOptional(data.tensionTarget, existing.tensionTarget, 'tensionTarget'),
        chapterType: resolveOptional(data.chapterType as ChapterType | undefined, existing.chapterType, 'chapterType'),
        hookJson: 'hook' in data ? (data.hook ? JSON.stringify(data.hook) : null) : (existing.hook ? JSON.stringify(existing.hook) : null),
        sortOrder: data.order ?? existing.order,
        parentId: 'parentId' in data ? (data.parentId ?? null) : (existing.parentId ?? null),
        targetWordCount: resolveOptional(data.targetWordCount, existing.targetWordCount, 'targetWordCount'),
        notes: 'notes' in data ? (data.notes ?? null) : (existing.notes ?? null),
        updatedAt: now,
      };

      drizzleDb
        .update(structures)
        .set(updateData)
        .where(and(eq(structures.projectId, projectId), eq(structures.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(structures)
        .where(and(eq(structures.projectId, projectId), eq(structures.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(structures).where(eq(structures.projectId, projectId)).run();
      return result.changes;
    },

    findByType(projectId: string, type: StructureType): Structure[] {
      const rows = drizzleDb
        .select()
        .from(structures)
        .where(and(eq(structures.projectId, projectId), eq(structures.type, type)))
        .all();
      return rows.map(rowToStructure);
    },

    findChildren(projectId: string, parentId: string | null): Structure[] {
      const condition = parentId === null
        ? and(eq(structures.projectId, projectId), isNull(structures.parentId))
        : and(eq(structures.projectId, projectId), eq(structures.parentId, parentId));
      const rows = drizzleDb.select().from(structures).where(condition).orderBy(asc(structures.sortOrder)).all();
      return rows.map(rowToStructure);
    },

    findRoot(projectId: string): Structure | undefined {
      const row = drizzleDb
        .select()
        .from(structures)
        .where(and(eq(structures.projectId, projectId), isNull(structures.parentId)))
        .limit(1)
        .get();
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

      return appendToArray({
        entity: existing,
        field: 'beats',
        item: beat,
        update: (data) => this.update(projectId, id, data),
      });
    },

    removeBeat(projectId: string, id: string, beatId: string): Structure | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      return removeFromArray({
        entity: existing,
        field: 'beats',
        getKey: (b) => b.id,
        keyToRemove: beatId,
        update: (data) => this.update(projectId, id, data),
      });
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
