/**
 * Cross-reference repository for tracking entity relationships
 *
 * Uses Drizzle ORM for type-safe queries.
 * Tracks which entities are mentioned in content and relationships between
 * bible entities for continuity checking and context assembly.
 */

import type Database from 'libsql';
import { and, eq } from 'drizzle-orm';

import type { CrossReference, EntityRef } from '@repo/serial-types';

import type { DrizzleDB } from '../storage/database';
import { crossReferences } from '../storage/drizzle-schema';

/**
 * Convert Drizzle row to CrossReference entity
 */
function rowToCrossReference(row: typeof crossReferences.$inferSelect): CrossReference {
  return {
    sourceId: row.sourceId,
    sourceType: row.sourceType as EntityRef['type'],
    targetId: row.targetId,
    targetType: row.targetType as EntityRef['type'],
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
export function createCrossReferenceRepository(db: Database.Database, drizzleDb: DrizzleDB): CrossReferenceRepository {
  // Transaction wrappers use raw db since Drizzle transactions require different patterns
  const insertMany = db.transaction((projectId: string, data: CreateCrossReferenceData[]) => {
    const results: CrossReference[] = [];
    for (const item of data) {
      drizzleDb
        .insert(crossReferences)
        .values({
          projectId,
          sourceId: item.sourceId,
          sourceType: item.sourceType,
          targetId: item.targetId,
          targetType: item.targetType,
          context: item.context ?? null,
        })
        .run();
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
      drizzleDb
        .delete(crossReferences)
        .where(
          and(
            eq(crossReferences.projectId, projectId),
            eq(crossReferences.sourceId, sourceId),
            eq(crossReferences.sourceType, sourceType)
          )
        )
        .run();

      const results: CrossReference[] = [];
      for (const ref of references) {
        drizzleDb
          .insert(crossReferences)
          .values({
            projectId,
            sourceId,
            sourceType,
            targetId: ref.targetId,
            targetType: ref.targetType,
            context: ref.context ?? null,
          })
          .run();
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
      const rows = drizzleDb
        .select()
        .from(crossReferences)
        .where(eq(crossReferences.projectId, projectId))
        .all();
      return rows.map(rowToCrossReference);
    },

    findBySource(projectId: string, sourceId: string, sourceType: EntityRef['type']): CrossReference[] {
      const rows = drizzleDb
        .select()
        .from(crossReferences)
        .where(
          and(
            eq(crossReferences.projectId, projectId),
            eq(crossReferences.sourceId, sourceId),
            eq(crossReferences.sourceType, sourceType)
          )
        )
        .all();
      return rows.map(rowToCrossReference);
    },

    findByTarget(projectId: string, targetId: string, targetType: EntityRef['type']): CrossReference[] {
      const rows = drizzleDb
        .select()
        .from(crossReferences)
        .where(
          and(
            eq(crossReferences.projectId, projectId),
            eq(crossReferences.targetId, targetId),
            eq(crossReferences.targetType, targetType)
          )
        )
        .all();
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
      const result = drizzleDb
        .select()
        .from(crossReferences)
        .where(
          and(
            eq(crossReferences.projectId, projectId),
            eq(crossReferences.sourceId, data.sourceId),
            eq(crossReferences.sourceType, data.sourceType),
            eq(crossReferences.targetId, data.targetId),
            eq(crossReferences.targetType, data.targetType)
          )
        )
        .limit(1)
        .get();
      return result !== undefined;
    },

    create(projectId: string, data: CreateCrossReferenceData): CrossReference {
      drizzleDb
        .insert(crossReferences)
        .values({
          projectId,
          sourceId: data.sourceId,
          sourceType: data.sourceType,
          targetId: data.targetId,
          targetType: data.targetType,
          context: data.context ?? null,
        })
        .run();

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
      const result = drizzleDb
        .delete(crossReferences)
        .where(
          and(
            eq(crossReferences.projectId, projectId),
            eq(crossReferences.sourceId, sourceId),
            eq(crossReferences.sourceType, sourceType),
            eq(crossReferences.targetId, targetId),
            eq(crossReferences.targetType, targetType)
          )
        )
        .run();
      return result.changes > 0;
    },

    deleteBySource(projectId: string, sourceId: string, sourceType: EntityRef['type']): number {
      const result = drizzleDb
        .delete(crossReferences)
        .where(
          and(
            eq(crossReferences.projectId, projectId),
            eq(crossReferences.sourceId, sourceId),
            eq(crossReferences.sourceType, sourceType)
          )
        )
        .run();
      return result.changes;
    },

    deleteByTarget(projectId: string, targetId: string, targetType: EntityRef['type']): number {
      const result = drizzleDb
        .delete(crossReferences)
        .where(
          and(
            eq(crossReferences.projectId, projectId),
            eq(crossReferences.targetId, targetId),
            eq(crossReferences.targetType, targetType)
          )
        )
        .run();
      return result.changes;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(crossReferences).where(eq(crossReferences.projectId, projectId)).run();
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
