/**
 * Cross-reference repository for tracking entity relationships
 *
 * Tracks which entities are mentioned in content and relationships between
 * bible entities for continuity checking and context assembly.
 */

import type Database from 'libsql';

import type { CrossReference, EntityRef } from '@repo/types';


/**
 * Database row representation of a cross-reference
 */
interface CrossReferenceRow {
  id: number;
  project_id: string;
  source_id: string;
  source_type: EntityRef['type'];
  target_id: string;
  target_type: EntityRef['type'];
  context: string | null;
}

function rowToCrossReference(row: CrossReferenceRow): CrossReference {
  return {
    sourceId: row.source_id,
    sourceType: row.source_type,
    targetId: row.target_id,
    targetType: row.target_type,
    context: row.context ?? undefined,
  };
}

/**
 * Data required to create a cross-reference
 */
export interface CreateCrossReferenceData {
  sourceId: string;
  sourceType: EntityRef['type'];
  targetId: string;
  targetType: EntityRef['type'];
  context?: string;
}

/**
 * Cross-reference repository interface
 */
export interface CrossReferenceRepository {
  /**
   * Find all cross-references for a project
   */
  findByProject(projectId: string): CrossReference[];

  /**
   * Find all references from a source entity
   */
  findBySource(projectId: string, sourceId: string, sourceType: EntityRef['type']): CrossReference[];

  /**
   * Find all references to a target entity
   */
  findByTarget(projectId: string, targetId: string, targetType: EntityRef['type']): CrossReference[];

  /**
   * Find entities that reference a specific entity
   */
  findReferencingEntities(projectId: string, targetId: string, targetType: EntityRef['type']): EntityRef[];

  /**
   * Find entities referenced by a specific entity
   */
  findReferencedEntities(projectId: string, sourceId: string, sourceType: EntityRef['type']): EntityRef[];

  /**
   * Check if a specific cross-reference exists
   */
  exists(projectId: string, data: Omit<CreateCrossReferenceData, 'context'>): boolean;

  /**
   * Create a new cross-reference
   */
  create(projectId: string, data: CreateCrossReferenceData): CrossReference;

  /**
   * Create multiple cross-references in a batch
   */
  createMany(projectId: string, data: CreateCrossReferenceData[]): CrossReference[];

  /**
   * Delete a specific cross-reference
   */
  delete(
    projectId: string,
    sourceId: string,
    sourceType: EntityRef['type'],
    targetId: string,
    targetType: EntityRef['type']
  ): boolean;

  /**
   * Delete all references from a source entity
   */
  deleteBySource(projectId: string, sourceId: string, sourceType: EntityRef['type']): number;

  /**
   * Delete all references to a target entity
   */
  deleteByTarget(projectId: string, targetId: string, targetType: EntityRef['type']): number;

  /**
   * Delete all cross-references for a project
   */
  deleteByProject(projectId: string): number;

  /**
   * Replace all references from a source with new references
   */
  replaceSourceReferences(
    projectId: string,
    sourceId: string,
    sourceType: EntityRef['type'],
    references: Array<{ targetId: string; targetType: EntityRef['type']; context?: string }>
  ): CrossReference[];
}

/**
 * Create a cross-reference repository
 */
export function createCrossReferenceRepository(db: Database.Database): CrossReferenceRepository {
  const findByProjectStmt = db.prepare(`
    SELECT * FROM cross_references WHERE project_id = ?
  `);

  const findBySourceStmt = db.prepare(`
    SELECT * FROM cross_references
    WHERE project_id = ? AND source_id = ? AND source_type = ?
  `);

  const findByTargetStmt = db.prepare(`
    SELECT * FROM cross_references
    WHERE project_id = ? AND target_id = ? AND target_type = ?
  `);

  const existsStmt = db.prepare(`
    SELECT 1 FROM cross_references
    WHERE project_id = ? AND source_id = ? AND source_type = ? AND target_id = ? AND target_type = ?
    LIMIT 1
  `);

  const insertStmt = db.prepare(`
    INSERT INTO cross_references (project_id, source_id, source_type, target_id, target_type, context)
    VALUES (@project_id, @source_id, @source_type, @target_id, @target_type, @context)
  `);

  const deleteStmt = db.prepare(`
    DELETE FROM cross_references
    WHERE project_id = ? AND source_id = ? AND source_type = ? AND target_id = ? AND target_type = ?
  `);

  const deleteBySourceStmt = db.prepare(`
    DELETE FROM cross_references
    WHERE project_id = ? AND source_id = ? AND source_type = ?
  `);

  const deleteByTargetStmt = db.prepare(`
    DELETE FROM cross_references
    WHERE project_id = ? AND target_id = ? AND target_type = ?
  `);

  const deleteByProjectStmt = db.prepare(`
    DELETE FROM cross_references WHERE project_id = ?
  `);

  const insertMany = db.transaction((projectId: string, data: CreateCrossReferenceData[]) => {
    const results: CrossReference[] = [];
    for (const item of data) {
      const row = {
        project_id: projectId,
        source_id: item.sourceId,
        source_type: item.sourceType,
        target_id: item.targetId,
        target_type: item.targetType,
        context: item.context ?? null,
      };
      insertStmt.run(row);
      results.push({
        sourceId: item.sourceId,
        sourceType: item.sourceType,
        targetId: item.targetId,
        targetType: item.targetType,
        context: item.context,
      });
    }
    return results;
  });

  const replaceSourceRefs = db.transaction(
    (
      projectId: string,
      sourceId: string,
      sourceType: EntityRef['type'],
      references: Array<{ targetId: string; targetType: EntityRef['type']; context?: string }>
    ) => {
      deleteBySourceStmt.run(projectId, sourceId, sourceType);
      const results: CrossReference[] = [];
      for (const ref of references) {
        const row = {
          project_id: projectId,
          source_id: sourceId,
          source_type: sourceType,
          target_id: ref.targetId,
          target_type: ref.targetType,
          context: ref.context ?? null,
        };
        insertStmt.run(row);
        results.push({
          sourceId,
          sourceType,
          targetId: ref.targetId,
          targetType: ref.targetType,
          context: ref.context,
        });
      }
      return results;
    }
  );

  return {
    findByProject(projectId: string): CrossReference[] {
      const rows = findByProjectStmt.all(projectId) as CrossReferenceRow[];
      return rows.map(rowToCrossReference);
    },

    findBySource(projectId: string, sourceId: string, sourceType: EntityRef['type']): CrossReference[] {
      const rows = findBySourceStmt.all(projectId, sourceId, sourceType) as CrossReferenceRow[];
      return rows.map(rowToCrossReference);
    },

    findByTarget(projectId: string, targetId: string, targetType: EntityRef['type']): CrossReference[] {
      const rows = findByTargetStmt.all(projectId, targetId, targetType) as CrossReferenceRow[];
      return rows.map(rowToCrossReference);
    },

    findReferencingEntities(projectId: string, targetId: string, targetType: EntityRef['type']): EntityRef[] {
      const refs = this.findByTarget(projectId, targetId, targetType);
      const seen = new Set<string>();
      const entities: EntityRef[] = [];

      for (const ref of refs) {
        const key = `${ref.sourceType}:${ref.sourceId}`;
        if (!seen.has(key)) {
          seen.add(key);
          entities.push({ id: ref.sourceId, type: ref.sourceType });
        }
      }

      return entities;
    },

    findReferencedEntities(projectId: string, sourceId: string, sourceType: EntityRef['type']): EntityRef[] {
      const refs = this.findBySource(projectId, sourceId, sourceType);
      const seen = new Set<string>();
      const entities: EntityRef[] = [];

      for (const ref of refs) {
        const key = `${ref.targetType}:${ref.targetId}`;
        if (!seen.has(key)) {
          seen.add(key);
          entities.push({ id: ref.targetId, type: ref.targetType });
        }
      }

      return entities;
    },

    exists(projectId: string, data: Omit<CreateCrossReferenceData, 'context'>): boolean {
      const result = existsStmt.get(projectId, data.sourceId, data.sourceType, data.targetId, data.targetType);
      return result !== undefined;
    },

    create(projectId: string, data: CreateCrossReferenceData): CrossReference {
      const row = {
        project_id: projectId,
        source_id: data.sourceId,
        source_type: data.sourceType,
        target_id: data.targetId,
        target_type: data.targetType,
        context: data.context ?? null,
      };
      insertStmt.run(row);
      return {
        sourceId: data.sourceId,
        sourceType: data.sourceType,
        targetId: data.targetId,
        targetType: data.targetType,
        context: data.context,
      };
    },

    createMany(projectId: string, data: CreateCrossReferenceData[]): CrossReference[] {
      return insertMany(projectId, data);
    },

    delete(
      projectId: string,
      sourceId: string,
      sourceType: EntityRef['type'],
      targetId: string,
      targetType: EntityRef['type']
    ): boolean {
      const result = deleteStmt.run(projectId, sourceId, sourceType, targetId, targetType);
      return result.changes > 0;
    },

    deleteBySource(projectId: string, sourceId: string, sourceType: EntityRef['type']): number {
      const result = deleteBySourceStmt.run(projectId, sourceId, sourceType);
      return result.changes;
    },

    deleteByTarget(projectId: string, targetId: string, targetType: EntityRef['type']): number {
      const result = deleteByTargetStmt.run(projectId, targetId, targetType);
      return result.changes;
    },

    deleteByProject(projectId: string): number {
      const result = deleteByProjectStmt.run(projectId);
      return result.changes;
    },

    replaceSourceReferences(
      projectId: string,
      sourceId: string,
      sourceType: EntityRef['type'],
      references: Array<{ targetId: string; targetType: EntityRef['type']; context?: string }>
    ): CrossReference[] {
      return replaceSourceRefs(projectId, sourceId, sourceType, references);
    },
  };
}
