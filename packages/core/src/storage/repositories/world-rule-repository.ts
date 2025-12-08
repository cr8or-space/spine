/**
 * World rule repository for database operations
 */

import type Database from 'libsql';

import type { RuleException, WorldRule } from '@repo/types';

import { createProjectScopedRepository, generateId, intToBool, boolToInt, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

/**
 * Database row representation of a world rule
 */
interface WorldRuleRow {
  id: string;
  project_id: string;
  name: string;
  description: string;
  category: WorldRule['category'];
  rule: string;
  rationale: string | null;
  exceptions_json: string;
  consequences: string | null;
  public_knowledge: number;
  related_rules_json: string;
  priority: number;
  established: number;
  created_at: string;
  updated_at: string;
}

function rowToWorldRule(row: WorldRuleRow): WorldRule {
  return {
    id: row.id,
    type: 'world-rule',
    name: row.name,
    description: row.description,
    category: row.category,
    rule: row.rule,
    rationale: row.rationale ?? undefined,
    exceptions: parseJson<RuleException[]>(row.exceptions_json, []),
    consequences: row.consequences ?? undefined,
    publicKnowledge: intToBool(row.public_knowledge),
    relatedRules: parseJson<string[]>(row.related_rules_json, []),
    priority: row.priority,
    established: intToBool(row.established),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateWorldRuleData = Omit<WorldRule, 'id' | 'createdAt' | 'updatedAt'>;
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

export function createWorldRuleRepository(db: Database.Database): WorldRuleRepository {
  const base = createProjectScopedRepository<WorldRuleRow>(db, 'world_rules');

  const insertStmt = db.prepare(`
    INSERT INTO world_rules (
      id, project_id, name, description, category, rule, rationale,
      exceptions_json, consequences, public_knowledge, related_rules_json,
      priority, established, created_at, updated_at
    ) VALUES (
      @id, @project_id, @name, @description, @category, @rule, @rationale,
      @exceptions_json, @consequences, @public_knowledge, @related_rules_json,
      @priority, @established, @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE world_rules SET
      name = @name,
      description = @description,
      category = @category,
      rule = @rule,
      rationale = @rationale,
      exceptions_json = @exceptions_json,
      consequences = @consequences,
      public_knowledge = @public_knowledge,
      related_rules_json = @related_rules_json,
      priority = @priority,
      established = @established,
      updated_at = @updated_at
    WHERE project_id = @project_id AND id = @id
  `);

  const findByNameStmt = db.prepare(`SELECT * FROM world_rules WHERE project_id = ? AND name = ?`);
  const findByCategoryStmt = db.prepare(`SELECT * FROM world_rules WHERE project_id = ? AND category = ?`);
  const findEstablishedStmt = db.prepare(`SELECT * FROM world_rules WHERE project_id = ? AND established = 1`);
  const findByPriorityStmt = db.prepare(`SELECT * FROM world_rules WHERE project_id = ? AND priority >= ? ORDER BY priority DESC`);

  return {
    findById(projectId: string, id: string): WorldRule | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToWorldRule(row) : undefined;
    },

    findByProject(projectId: string): WorldRule[] {
      return base.findByProject(projectId).map(rowToWorldRule);
    },

    create(projectId: string, data: CreateWorldRuleData): WorldRule {
      const now = nowTimestamp();
      const id = generateId();

      const row: WorldRuleRow = {
        id,
        project_id: projectId,
        name: data.name,
        description: data.description,
        category: data.category,
        rule: data.rule,
        rationale: data.rationale ?? null,
        exceptions_json: JSON.stringify(data.exceptions),
        consequences: data.consequences ?? null,
        public_knowledge: boolToInt(data.publicKnowledge),
        related_rules_json: JSON.stringify(data.relatedRules),
        priority: data.priority,
        established: boolToInt(data.established),
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToWorldRule(row);
    },

    update(projectId: string, id: string, data: UpdateWorldRuleData): WorldRule | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: WorldRuleRow = {
        id,
        project_id: projectId,
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        category: data.category ?? existing.category,
        rule: data.rule ?? existing.rule,
        rationale: data.rationale !== undefined ? (data.rationale ?? null) : (existing.rationale ?? null),
        exceptions_json: data.exceptions ? JSON.stringify(data.exceptions) : JSON.stringify(existing.exceptions),
        consequences: data.consequences !== undefined ? (data.consequences ?? null) : (existing.consequences ?? null),
        public_knowledge: data.publicKnowledge !== undefined ? boolToInt(data.publicKnowledge) : boolToInt(existing.publicKnowledge),
        related_rules_json: data.relatedRules ? JSON.stringify(data.relatedRules) : JSON.stringify(existing.relatedRules),
        priority: data.priority ?? existing.priority,
        established: data.established !== undefined ? boolToInt(data.established) : boolToInt(existing.established),
        created_at: existing.createdAt,
        updated_at: now,
      };

      updateStmt.run(updated);
      return rowToWorldRule(updated);
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByName(projectId: string, name: string): WorldRule | undefined {
      const row = findByNameStmt.get(projectId, name) as WorldRuleRow | undefined;
      return row ? rowToWorldRule(row) : undefined;
    },

    findByCategory(projectId: string, category: WorldRule['category']): WorldRule[] {
      const rows = findByCategoryStmt.all(projectId, category) as WorldRuleRow[];
      return rows.map(rowToWorldRule);
    },

    findEstablished(projectId: string): WorldRule[] {
      const rows = findEstablishedStmt.all(projectId) as WorldRuleRow[];
      return rows.map(rowToWorldRule);
    },

    findByPriority(projectId: string, minPriority: number): WorldRule[] {
      const rows = findByPriorityStmt.all(projectId, minPriority) as WorldRuleRow[];
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
