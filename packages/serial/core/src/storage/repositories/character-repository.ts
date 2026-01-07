/**
 * Character repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries while maintaining
 * compatibility with raw SQL for FTS5 search.
 */

import type Database from 'libsql';
import { and, eq } from 'drizzle-orm';

import type { AppearanceRef, Character, CharacterArc, Relationship, Trait } from '@repo/serial-types';

import type { DrizzleDB } from '../database';
import { characters } from '../drizzle-schema';
import { appendToArray, removeFromArray, upsertInArray } from '../relation-helpers';
import { generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';
import { formatFts5PrefixQuery } from '../../utils/text';

/**
 * Database row representation of a character (for raw SQL FTS5 queries)
 */
interface CharacterRow {
  id: string;
  project_id: string;
  name: string;
  aliases_json: string;
  description: string;
  traits_json: string;
  relationships_json: string;
  arc_json: string | null;
  voice_samples_json: string;
  appearances_json: string;
  role: Character['role'];
  status: Character['status'];
  created_at: string;
  updated_at: string;
}

/**
 * Convert Drizzle row to Character entity
 */
function rowToCharacter(row: typeof characters.$inferSelect): Character {
  return {
    id: row.id,
    entityType: 'character',
    name: row.name,
    aliases: parseJson<string[]>(row.aliasesJson, []),
    description: row.description,
    traits: parseJson<Trait[]>(row.traitsJson, []),
    relationships: parseJson<Relationship[]>(row.relationshipsJson, []),
    arc: row.arcJson ? (JSON.parse(row.arcJson) as CharacterArc) : undefined,
    voiceSamples: parseJson<string[]>(row.voiceSamplesJson, []),
    appearances: parseJson<AppearanceRef[]>(row.appearancesJson, []),
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Convert raw SQL row to Character entity (for FTS5 queries)
 */
function rawRowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    entityType: 'character',
    name: row.name,
    aliases: parseJson<string[]>(row.aliases_json, []),
    description: row.description,
    traits: parseJson<Trait[]>(row.traits_json, []),
    relationships: parseJson<Relationship[]>(row.relationships_json, []),
    arc: row.arc_json ? (JSON.parse(row.arc_json) as CharacterArc) : undefined,
    voiceSamples: parseJson<string[]>(row.voice_samples_json, []),
    appearances: parseJson<AppearanceRef[]>(row.appearances_json, []),
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Data required to create a character (without auto-generated fields)
 * Also omits 'entityType' since it has a default value in the schema
 */
export type CreateCharacterData = Omit<Character, 'id' | 'entityType' | 'createdAt' | 'updatedAt'>;

/**
 * Data for updating a character
 */
export type UpdateCharacterData = Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Character repository interface
 */
export interface CharacterRepository extends ProjectScopedRepository<Character, CreateCharacterData> {
  findByName(projectId: string, name: string): Character | undefined;
  findByRole(projectId: string, role: Character['role']): Character[];
  findByStatus(projectId: string, status: Character['status']): Character[];
  search(projectId: string, query: string): Character[];
  addRelationship(projectId: string, id: string, relationship: Relationship): Character | undefined;
  removeRelationship(projectId: string, id: string, targetId: string): Character | undefined;
  addAppearance(projectId: string, id: string, appearance: AppearanceRef): Character | undefined;
  updateArc(projectId: string, id: string, arc: CharacterArc | undefined): Character | undefined;
}

/**
 * Create a character repository
 */
export function createCharacterRepository(db: Database.Database, drizzleDb: DrizzleDB): CharacterRepository {
  // FTS5 search requires raw SQL (Drizzle doesn't support virtual tables)
  const searchStmt = db.prepare(`
    SELECT c.* FROM characters c
    JOIN characters_fts fts ON c.id = fts.id
    WHERE c.project_id = ? AND characters_fts MATCH ?
  `);

  return {
    findById(projectId: string, id: string): Character | undefined {
      const row = drizzleDb
        .select()
        .from(characters)
        .where(and(eq(characters.projectId, projectId), eq(characters.id, id)))
        .get();
      return row ? rowToCharacter(row) : undefined;
    },

    findByProject(projectId: string): Character[] {
      const rows = drizzleDb.select().from(characters).where(eq(characters.projectId, projectId)).all();
      return rows.map(rowToCharacter);
    },

    create(projectId: string, data: CreateCharacterData): Character {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        name: data.name,
        aliasesJson: JSON.stringify(data.aliases),
        description: data.description,
        traitsJson: JSON.stringify(data.traits),
        relationshipsJson: JSON.stringify(data.relationships),
        arcJson: data.arc ? JSON.stringify(data.arc) : null,
        voiceSamplesJson: JSON.stringify(data.voiceSamples),
        appearancesJson: JSON.stringify(data.appearances),
        role: data.role,
        status: data.status,
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(characters).values(newRow).run();

      return {
        id,
        entityType: 'character',
        name: data.name,
        aliases: data.aliases,
        description: data.description,
        traits: data.traits,
        relationships: data.relationships,
        arc: data.arc,
        voiceSamples: data.voiceSamples,
        appearances: data.appearances,
        role: data.role,
        status: data.status,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(projectId: string, id: string, data: UpdateCharacterData): Character | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updateData = {
        name: data.name ?? existing.name,
        aliasesJson: data.aliases ? JSON.stringify(data.aliases) : JSON.stringify(existing.aliases),
        description: data.description ?? existing.description,
        traitsJson: data.traits ? JSON.stringify(data.traits) : JSON.stringify(existing.traits),
        relationshipsJson: data.relationships ? JSON.stringify(data.relationships) : JSON.stringify(existing.relationships),
        arcJson: 'arc' in data ? (data.arc ? JSON.stringify(data.arc) : null) : (existing.arc ? JSON.stringify(existing.arc) : null),
        voiceSamplesJson: data.voiceSamples ? JSON.stringify(data.voiceSamples) : JSON.stringify(existing.voiceSamples),
        appearancesJson: data.appearances ? JSON.stringify(data.appearances) : JSON.stringify(existing.appearances),
        role: data.role ?? existing.role,
        status: data.status ?? existing.status,
        updatedAt: now,
      };

      drizzleDb
        .update(characters)
        .set(updateData)
        .where(and(eq(characters.projectId, projectId), eq(characters.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(characters)
        .where(and(eq(characters.projectId, projectId), eq(characters.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(characters).where(eq(characters.projectId, projectId)).run();
      return result.changes;
    },

    findByName(projectId: string, name: string): Character | undefined {
      const row = drizzleDb
        .select()
        .from(characters)
        .where(and(eq(characters.projectId, projectId), eq(characters.name, name)))
        .get();
      return row ? rowToCharacter(row) : undefined;
    },

    findByRole(projectId: string, role: Character['role']): Character[] {
      const rows = drizzleDb
        .select()
        .from(characters)
        .where(and(eq(characters.projectId, projectId), eq(characters.role, role)))
        .all();
      return rows.map(rowToCharacter);
    },

    findByStatus(projectId: string, status: Character['status']): Character[] {
      const rows = drizzleDb
        .select()
        .from(characters)
        .where(and(eq(characters.projectId, projectId), eq(characters.status, status)))
        .all();
      return rows.map(rowToCharacter);
    },

    search(projectId: string, query: string): Character[] {
      const rows = searchStmt.all(projectId, formatFts5PrefixQuery(query)) as CharacterRow[];
      return rows.map(rawRowToCharacter);
    },

    addRelationship(projectId: string, id: string, relationship: Relationship): Character | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      return upsertInArray({
        entity: existing,
        field: 'relationships',
        item: relationship,
        getKey: (r) => r.targetId,
        update: (data) => this.update(projectId, id, data),
      });
    },

    removeRelationship(projectId: string, id: string, targetId: string): Character | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      return removeFromArray({
        entity: existing,
        field: 'relationships',
        getKey: (r) => r.targetId,
        keyToRemove: targetId,
        update: (data) => this.update(projectId, id, data),
      });
    },

    addAppearance(projectId: string, id: string, appearance: AppearanceRef): Character | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      return appendToArray({
        entity: existing,
        field: 'appearances',
        item: appearance,
        update: (data) => this.update(projectId, id, data),
      });
    },

    updateArc(projectId: string, id: string, arc: CharacterArc | undefined): Character | undefined {
      return this.update(projectId, id, { arc });
    },
  };
}
