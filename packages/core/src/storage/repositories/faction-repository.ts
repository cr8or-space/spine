/**
 * Faction repository for database operations
 */

import type Database from 'libsql';

import type { Faction, FactionMember, FactionRank, FactionRelation } from '@repo/types';

import { createProjectScopedRepository, generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

/**
 * Database row representation of a faction
 */
interface FactionRow {
  id: string;
  project_id: string;
  name: string;
  aliases_json: string;
  description: string;
  type: Faction['type'];
  ideology: string | null;
  goals_json: string;
  ranks_json: string;
  members_json: string;
  relations_json: string;
  locations_json: string;
  status: Faction['status'];
  influence: Faction['influence'];
  created_at: string;
  updated_at: string;
}

function rowToFaction(row: FactionRow): Faction {
  return {
    id: row.id,
    entityType: 'faction',
    name: row.name,
    aliases: parseJson<string[]>(row.aliases_json, []),
    description: row.description,
    type: row.type,
    ideology: row.ideology ?? undefined,
    goals: parseJson<string[]>(row.goals_json, []),
    ranks: parseJson<FactionRank[]>(row.ranks_json, []),
    members: parseJson<FactionMember[]>(row.members_json, []),
    relations: parseJson<FactionRelation[]>(row.relations_json, []),
    locations: parseJson<string[]>(row.locations_json, []),
    status: row.status,
    influence: row.influence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateFactionData = Omit<Faction, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateFactionData = Partial<Omit<Faction, 'id' | 'createdAt' | 'updatedAt'>>;

export interface FactionRepository extends ProjectScopedRepository<Faction, CreateFactionData> {
  findByName(projectId: string, name: string): Faction | undefined;
  findByType(projectId: string, type: Faction['type']): Faction[];
  findByInfluence(projectId: string, influence: Faction['influence']): Faction[];
  addMember(projectId: string, id: string, member: FactionMember): Faction | undefined;
  removeMember(projectId: string, id: string, characterId: string): Faction | undefined;
  addRelation(projectId: string, id: string, relation: FactionRelation): Faction | undefined;
}

export function createFactionRepository(db: Database.Database): FactionRepository {
  const base = createProjectScopedRepository<FactionRow>(db, 'factions');

  const insertStmt = db.prepare(`
    INSERT INTO factions (
      id, project_id, name, aliases_json, description, type, ideology,
      goals_json, ranks_json, members_json, relations_json, locations_json,
      status, influence, created_at, updated_at
    ) VALUES (
      @id, @project_id, @name, @aliases_json, @description, @type, @ideology,
      @goals_json, @ranks_json, @members_json, @relations_json, @locations_json,
      @status, @influence, @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE factions SET
      name = @name,
      aliases_json = @aliases_json,
      description = @description,
      type = @type,
      ideology = @ideology,
      goals_json = @goals_json,
      ranks_json = @ranks_json,
      members_json = @members_json,
      relations_json = @relations_json,
      locations_json = @locations_json,
      status = @status,
      influence = @influence,
      updated_at = @updated_at
    WHERE project_id = @project_id AND id = @id
  `);

  const findByNameStmt = db.prepare(`SELECT * FROM factions WHERE project_id = ? AND name = ?`);
  const findByTypeStmt = db.prepare(`SELECT * FROM factions WHERE project_id = ? AND type = ?`);
  const findByInfluenceStmt = db.prepare(`SELECT * FROM factions WHERE project_id = ? AND influence = ?`);

  return {
    findById(projectId: string, id: string): Faction | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToFaction(row) : undefined;
    },

    findByProject(projectId: string): Faction[] {
      return base.findByProject(projectId).map(rowToFaction);
    },

    create(projectId: string, data: CreateFactionData): Faction {
      const now = nowTimestamp();
      const id = generateId();

      const row: FactionRow = {
        id,
        project_id: projectId,
        name: data.name,
        aliases_json: JSON.stringify(data.aliases),
        description: data.description,
        type: data.type,
        ideology: data.ideology ?? null,
        goals_json: JSON.stringify(data.goals),
        ranks_json: JSON.stringify(data.ranks),
        members_json: JSON.stringify(data.members),
        relations_json: JSON.stringify(data.relations),
        locations_json: JSON.stringify(data.locations),
        status: data.status,
        influence: data.influence,
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToFaction(row);
    },

    update(projectId: string, id: string, data: UpdateFactionData): Faction | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: FactionRow = {
        id,
        project_id: projectId,
        name: data.name ?? existing.name,
        aliases_json: data.aliases ? JSON.stringify(data.aliases) : JSON.stringify(existing.aliases),
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        ideology: data.ideology !== undefined ? (data.ideology ?? null) : (existing.ideology ?? null),
        goals_json: data.goals ? JSON.stringify(data.goals) : JSON.stringify(existing.goals),
        ranks_json: data.ranks ? JSON.stringify(data.ranks) : JSON.stringify(existing.ranks),
        members_json: data.members ? JSON.stringify(data.members) : JSON.stringify(existing.members),
        relations_json: data.relations ? JSON.stringify(data.relations) : JSON.stringify(existing.relations),
        locations_json: data.locations ? JSON.stringify(data.locations) : JSON.stringify(existing.locations),
        status: data.status ?? existing.status,
        influence: data.influence ?? existing.influence,
        created_at: existing.createdAt,
        updated_at: now,
      };

      updateStmt.run(updated);
      return rowToFaction(updated);
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByName(projectId: string, name: string): Faction | undefined {
      const row = findByNameStmt.get(projectId, name) as FactionRow | undefined;
      return row ? rowToFaction(row) : undefined;
    },

    findByType(projectId: string, type: Faction['type']): Faction[] {
      const rows = findByTypeStmt.all(projectId, type) as FactionRow[];
      return rows.map(rowToFaction);
    },

    findByInfluence(projectId: string, influence: Faction['influence']): Faction[] {
      const rows = findByInfluenceStmt.all(projectId, influence) as FactionRow[];
      return rows.map(rowToFaction);
    },

    addMember(projectId: string, id: string, member: FactionMember): Faction | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const members = [...existing.members.filter((m) => m.characterId !== member.characterId), member];
      return this.update(projectId, id, { members });
    },

    removeMember(projectId: string, id: string, characterId: string): Faction | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const members = existing.members.filter((m) => m.characterId !== characterId);
      return this.update(projectId, id, { members });
    },

    addRelation(projectId: string, id: string, relation: FactionRelation): Faction | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const relations = [...existing.relations.filter((r) => r.targetId !== relation.targetId), relation];
      return this.update(projectId, id, { relations });
    },
  };
}
