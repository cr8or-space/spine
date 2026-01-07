/**
 * World rule repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries.
 */

import type Database from 'libsql';
import { and, eq, gte } from 'drizzle-orm';

import type { RuleException, WorldRule } from '@repo/serial-types';

import type { DrizzleDB } from '../database';
import { worldRules } from '../drizzle-schema';
import { generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

/**
 * Convert Drizzle row to WorldRule entity
 */
function rowToWorldRule(row: typeof worldRules.$inferSelect): WorldRule {
  return {
    id: row.id,
    type: 'world-rule',
    name: row.name,
    description: row.description,
    category: row.category,
    rule: row.rule,
    rationale: row.rationale ?? undefined,
    exceptions: parseJson<RuleException[]>(row.exceptionsJson, []),
    consequences: row.consequences ?? undefined,
    publicKnowledge: row.publicKnowledge,
    relatedRules: parseJson<string[]>(row.relatedRulesJson, []),
    priority: row.priority,
    established: row.established,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type CreateWorldRuleData = Omit<WorldRule, 'id' | 'type' | 'createdAt' | 'updatedAt'>;
export type UpdateWorldRuleData = Partial<Omit<WorldRule, 'id' | 'createdAt' | 'updatedAt'>>;

export interface WorldRuleRepository extends ProjectScopedRepository<WorldRule, CreateWorldRuleData> {
  findByName(projectId: string, name: string): WorldRule | undefined;
  findByCategory(projectId: string, category: WorldRule['category']): WorldRule[];
  findEstablished(projectId: string): WorldRule[];
  findByPriority(projectId: string, minPriority: number): WorldRule[];
  addException(projectId: string, id: string, exception: RuleException): WorldRule | undefined;
  addRelatedRule(projectId: string, id: string, relatedRuleId: string): WorldRule | undefined;
  markEstablished(projectId: string, id: string): WorldRule | undefined;
}

export function createWorldRuleRepository(_db: Database.Database, drizzleDb: DrizzleDB): WorldRuleRepository {
  return {
    findById(projectId: string, id: string): WorldRule | undefined {
      const row = drizzleDb
        .select()
        .from(worldRules)
        .where(and(eq(worldRules.projectId, projectId), eq(worldRules.id, id)))
        .get();
      return row ? rowToWorldRule(row) : undefined;
    },

    findByProject(projectId: string): WorldRule[] {
      const rows = drizzleDb.select().from(worldRules).where(eq(worldRules.projectId, projectId)).all();
      return rows.map(rowToWorldRule);
    },

    create(projectId: string, data: CreateWorldRuleData): WorldRule {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        name: data.name,
        description: data.description,
        category: data.category,
        rule: data.rule,
        rationale: data.rationale ?? null,
        exceptionsJson: JSON.stringify(data.exceptions),
        consequences: data.consequences ?? null,
        publicKnowledge: data.publicKnowledge,
        relatedRulesJson: JSON.stringify(data.relatedRules),
        priority: data.priority,
        established: data.established,
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(worldRules).values(newRow).run();

      return {
        id,
        type: 'world-rule',
        name: data.name,
        description: data.description,
        category: data.category,
        rule: data.rule,
        rationale: data.rationale,
        exceptions: data.exceptions,
        consequences: data.consequences,
        publicKnowledge: data.publicKnowledge,
        relatedRules: data.relatedRules,
        priority: data.priority,
        established: data.established,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(projectId: string, id: string, data: UpdateWorldRuleData): WorldRule | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updateData = {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        category: data.category ?? existing.category,
        rule: data.rule ?? existing.rule,
        rationale: data.rationale !== undefined ? (data.rationale ?? null) : (existing.rationale ?? null),
        exceptionsJson: data.exceptions ? JSON.stringify(data.exceptions) : JSON.stringify(existing.exceptions),
        consequences: data.consequences !== undefined ? (data.consequences ?? null) : (existing.consequences ?? null),
        publicKnowledge: data.publicKnowledge !== undefined ? data.publicKnowledge : existing.publicKnowledge,
        relatedRulesJson: data.relatedRules ? JSON.stringify(data.relatedRules) : JSON.stringify(existing.relatedRules),
        priority: data.priority ?? existing.priority,
        established: data.established !== undefined ? data.established : existing.established,
        updatedAt: now,
      };

      drizzleDb
        .update(worldRules)
        .set(updateData)
        .where(and(eq(worldRules.projectId, projectId), eq(worldRules.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(worldRules)
        .where(and(eq(worldRules.projectId, projectId), eq(worldRules.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(worldRules).where(eq(worldRules.projectId, projectId)).run();
      return result.changes;
    },

    findByName(projectId: string, name: string): WorldRule | undefined {
      const row = drizzleDb
        .select()
        .from(worldRules)
        .where(and(eq(worldRules.projectId, projectId), eq(worldRules.name, name)))
        .get();
      return row ? rowToWorldRule(row) : undefined;
    },

    findByCategory(projectId: string, category: WorldRule['category']): WorldRule[] {
      const rows = drizzleDb
        .select()
        .from(worldRules)
        .where(and(eq(worldRules.projectId, projectId), eq(worldRules.category, category)))
        .all();
      return rows.map(rowToWorldRule);
    },

    findEstablished(projectId: string): WorldRule[] {
      const rows = drizzleDb
        .select()
        .from(worldRules)
        .where(and(eq(worldRules.projectId, projectId), eq(worldRules.established, true)))
        .all();
      return rows.map(rowToWorldRule);
    },

    findByPriority(projectId: string, minPriority: number): WorldRule[] {
      const rows = drizzleDb
        .select()
        .from(worldRules)
        .where(and(eq(worldRules.projectId, projectId), gte(worldRules.priority, minPriority)))
        .all();
      return rows.map(rowToWorldRule);
    },

    addException(projectId: string, id: string, exception: RuleException): WorldRule | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const exceptions = [...existing.exceptions, exception];
      return this.update(projectId, id, { exceptions });
    },

    addRelatedRule(projectId: string, id: string, relatedRuleId: string): WorldRule | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      if (existing.relatedRules.includes(relatedRuleId)) return existing;

      const relatedRules = [...existing.relatedRules, relatedRuleId];
      return this.update(projectId, id, { relatedRules });
    },

    markEstablished(projectId: string, id: string): WorldRule | undefined {
      return this.update(projectId, id, { established: true });
    },
  };
}
