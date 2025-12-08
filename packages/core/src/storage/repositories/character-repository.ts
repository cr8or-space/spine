/**
 * Character repository for database operations
 */

import type Database from 'libsql';

import type { AppearanceRef, Character, CharacterArc, Relationship, Trait } from '@repo/types';

import {
  createProjectScopedRepository,
  generateId,
  nowTimestamp,
  parseJson,
  type ProjectScopedRepository,
} from '../repository';

/**
 * Database row representation of a character
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
 * Convert database row to Character entity
 */
function rowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    type: 'character',
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
 */
export type CreateCharacterData = Omit<Character, 'id' | 'createdAt' | 'updatedAt'>;

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
export function createCharacterRepository(db: Database.Database): CharacterRepository {
  const base = createProjectScopedRepository<CharacterRow>(db, 'characters');

  // Prepared statements
  const insertStmt = db.prepare(`
    INSERT INTO characters (
      id, project_id, name, aliases_json, description, traits_json,
      relationships_json, arc_json, voice_samples_json, appearances_json,
      role, status, created_at, updated_at
    ) VALUES (
      @id, @project_id, @name, @aliases_json, @description, @traits_json,
      @relationships_json, @arc_json, @voice_samples_json, @appearances_json,
      @role, @status, @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE characters SET
      name = @name,
      aliases_json = @aliases_json,
      description = @description,
      traits_json = @traits_json,
      relationships_json = @relationships_json,
      arc_json = @arc_json,
      voice_samples_json = @voice_samples_json,
      appearances_json = @appearances_json,
      role = @role,
      status = @status,
      updated_at = @updated_at
    WHERE project_id = @project_id AND id = @id
  `);

  const findByNameStmt = db.prepare(`
    SELECT * FROM characters WHERE project_id = ? AND name = ?
  `);

  const findByRoleStmt = db.prepare(`
    SELECT * FROM characters WHERE project_id = ? AND role = ?
  `);

  const findByStatusStmt = db.prepare(`
    SELECT * FROM characters WHERE project_id = ? AND status = ?
  `);

  const searchStmt = db.prepare(`
    SELECT c.* FROM characters c
    JOIN characters_fts fts ON c.id = fts.id
    WHERE c.project_id = ? AND characters_fts MATCH ?
  `);

  return {
    findById(projectId: string, id: string): Character | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToCharacter(row) : undefined;
    },

    findByProject(projectId: string): Character[] {
      return base.findByProject(projectId).map(rowToCharacter);
    },

    create(projectId: string, data: CreateCharacterData): Character {
      const now = nowTimestamp();
      const id = generateId();

      const row: CharacterRow = {
        id,
        project_id: projectId,
        name: data.name,
        aliases_json: JSON.stringify(data.aliases),
        description: data.description,
        traits_json: JSON.stringify(data.traits),
        relationships_json: JSON.stringify(data.relationships),
        arc_json: data.arc ? JSON.stringify(data.arc) : null,
        voice_samples_json: JSON.stringify(data.voiceSamples),
        appearances_json: JSON.stringify(data.appearances),
        role: data.role,
        status: data.status,
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToCharacter(row);
    },

    update(projectId: string, id: string, data: UpdateCharacterData): Character | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: CharacterRow = {
        id,
        project_id: projectId,
        name: data.name ?? existing.name,
        aliases_json: data.aliases ? JSON.stringify(data.aliases) : JSON.stringify(existing.aliases),
        description: data.description ?? existing.description,
        traits_json: data.traits ? JSON.stringify(data.traits) : JSON.stringify(existing.traits),
        relationships_json: data.relationships
          ? JSON.stringify(data.relationships)
          : JSON.stringify(existing.relationships),
        arc_json: 'arc' in data ? (data.arc ? JSON.stringify(data.arc) : null) : (existing.arc ? JSON.stringify(existing.arc) : null),
        voice_samples_json: data.voiceSamples ? JSON.stringify(data.voiceSamples) : JSON.stringify(existing.voiceSamples),
        appearances_json: data.appearances ? JSON.stringify(data.appearances) : JSON.stringify(existing.appearances),
        role: data.role ?? existing.role,
        status: data.status ?? existing.status,
        created_at: existing.createdAt,
        updated_at: now,
      };

      updateStmt.run(updated);
      return rowToCharacter(updated);
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByName(projectId: string, name: string): Character | undefined {
      const row = findByNameStmt.get(projectId, name) as CharacterRow | undefined;
      return row ? rowToCharacter(row) : undefined;
    },

    findByRole(projectId: string, role: Character['role']): Character[] {
      const rows = findByRoleStmt.all(projectId, role) as CharacterRow[];
      return rows.map(rowToCharacter);
    },

    findByStatus(projectId: string, status: Character['status']): Character[] {
      const rows = findByStatusStmt.all(projectId, status) as CharacterRow[];
      return rows.map(rowToCharacter);
    },

    search(projectId: string, query: string): Character[] {
      // FTS5 requires proper quoting for special characters
      const escapedQuery = query.replace(/"/g, '""');
      const rows = searchStmt.all(projectId, `"${escapedQuery}"*`) as CharacterRow[];
      return rows.map(rowToCharacter);
    },

    addRelationship(projectId: string, id: string, relationship: Relationship): Character | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const relationships = [...existing.relationships.filter((r) => r.targetId !== relationship.targetId), relationship];
      return this.update(projectId, id, { relationships });
    },

    removeRelationship(projectId: string, id: string, targetId: string): Character | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const relationships = existing.relationships.filter((r) => r.targetId !== targetId);
      return this.update(projectId, id, { relationships });
    },

    addAppearance(projectId: string, id: string, appearance: AppearanceRef): Character | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const appearances = [...existing.appearances, appearance];
      return this.update(projectId, id, { appearances });
    },

    updateArc(projectId: string, id: string, arc: CharacterArc | undefined): Character | undefined {
      return this.update(projectId, id, { arc });
    },
  };
}
