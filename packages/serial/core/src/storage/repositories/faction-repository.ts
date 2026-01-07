/**
 * Faction repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries.
 */

import type Database from 'libsql';
import { and, eq } from 'drizzle-orm';

import type { Faction, FactionMember, FactionRank, FactionRelation } from '@repo/serial-types';

import type { DrizzleDB } from '../database';
import { factions } from '../drizzle-schema';
import { generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

/**
 * Convert Drizzle row to Faction entity
 */
function rowToFaction(row: typeof factions.$inferSelect): Faction {
  return {
    id: row.id,
    entityType: 'faction',
    name: row.name,
    aliases: parseJson<string[]>(row.aliasesJson, []),
    description: row.description,
    type: row.type,
    ideology: row.ideology ?? undefined,
    goals: parseJson<string[]>(row.goalsJson, []),
    ranks: parseJson<FactionRank[]>(row.ranksJson, []),
    members: parseJson<FactionMember[]>(row.membersJson, []),
    relations: parseJson<FactionRelation[]>(row.relationsJson, []),
    locations: parseJson<string[]>(row.locationsJson, []),
    status: row.status,
    influence: row.influence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type CreateFactionData = Omit<Faction, 'id' | 'entityType' | 'createdAt' | 'updatedAt'>;
export type UpdateFactionData = Partial<Omit<Faction, 'id' | 'createdAt' | 'updatedAt'>>;

export interface FactionRepository extends ProjectScopedRepository<Faction, CreateFactionData> {
  findByName(projectId: string, name: string): Faction | undefined;
  findByType(projectId: string, type: Faction['type']): Faction[];
  findByInfluence(projectId: string, influence: Faction['influence']): Faction[];
  addMember(projectId: string, id: string, member: FactionMember): Faction | undefined;
  removeMember(projectId: string, id: string, characterId: string): Faction | undefined;
  addRelation(projectId: string, id: string, relation: FactionRelation): Faction | undefined;
}

export function createFactionRepository(_db: Database.Database, drizzleDb: DrizzleDB): FactionRepository {
  return {
    findById(projectId: string, id: string): Faction | undefined {
      const row = drizzleDb
        .select()
        .from(factions)
        .where(and(eq(factions.projectId, projectId), eq(factions.id, id)))
        .get();
      return row ? rowToFaction(row) : undefined;
    },

    findByProject(projectId: string): Faction[] {
      const rows = drizzleDb.select().from(factions).where(eq(factions.projectId, projectId)).all();
      return rows.map(rowToFaction);
    },

    create(projectId: string, data: CreateFactionData): Faction {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        name: data.name,
        aliasesJson: JSON.stringify(data.aliases),
        description: data.description,
        type: data.type,
        ideology: data.ideology ?? null,
        goalsJson: JSON.stringify(data.goals),
        ranksJson: JSON.stringify(data.ranks),
        membersJson: JSON.stringify(data.members),
        relationsJson: JSON.stringify(data.relations),
        locationsJson: JSON.stringify(data.locations),
        status: data.status,
        influence: data.influence,
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(factions).values(newRow).run();

      return {
        id,
        entityType: 'faction',
        name: data.name,
        aliases: data.aliases,
        description: data.description,
        type: data.type,
        ideology: data.ideology,
        goals: data.goals,
        ranks: data.ranks,
        members: data.members,
        relations: data.relations,
        locations: data.locations,
        status: data.status,
        influence: data.influence,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(projectId: string, id: string, data: UpdateFactionData): Faction | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updateData = {
        name: data.name ?? existing.name,
        aliasesJson: data.aliases ? JSON.stringify(data.aliases) : JSON.stringify(existing.aliases),
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        ideology: data.ideology !== undefined ? (data.ideology ?? null) : (existing.ideology ?? null),
        goalsJson: data.goals ? JSON.stringify(data.goals) : JSON.stringify(existing.goals),
        ranksJson: data.ranks ? JSON.stringify(data.ranks) : JSON.stringify(existing.ranks),
        membersJson: data.members ? JSON.stringify(data.members) : JSON.stringify(existing.members),
        relationsJson: data.relations ? JSON.stringify(data.relations) : JSON.stringify(existing.relations),
        locationsJson: data.locations ? JSON.stringify(data.locations) : JSON.stringify(existing.locations),
        status: data.status ?? existing.status,
        influence: data.influence ?? existing.influence,
        updatedAt: now,
      };

      drizzleDb
        .update(factions)
        .set(updateData)
        .where(and(eq(factions.projectId, projectId), eq(factions.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(factions)
        .where(and(eq(factions.projectId, projectId), eq(factions.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(factions).where(eq(factions.projectId, projectId)).run();
      return result.changes;
    },

    findByName(projectId: string, name: string): Faction | undefined {
      const row = drizzleDb
        .select()
        .from(factions)
        .where(and(eq(factions.projectId, projectId), eq(factions.name, name)))
        .get();
      return row ? rowToFaction(row) : undefined;
    },

    findByType(projectId: string, type: Faction['type']): Faction[] {
      const rows = drizzleDb
        .select()
        .from(factions)
        .where(and(eq(factions.projectId, projectId), eq(factions.type, type)))
        .all();
      return rows.map(rowToFaction);
    },

    findByInfluence(projectId: string, influence: Faction['influence']): Faction[] {
      const rows = drizzleDb
        .select()
        .from(factions)
        .where(and(eq(factions.projectId, projectId), eq(factions.influence, influence)))
        .all();
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
