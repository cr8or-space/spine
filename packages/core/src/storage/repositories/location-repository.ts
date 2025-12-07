/**
 * Location repository for database operations
 */

import type Database from 'better-sqlite3';

import type { Location, LocationFeature, LocationRelation } from '@repo/types';

import { createProjectScopedRepository, generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';

/**
 * Database row representation of a location
 */
interface LocationRow {
  id: string;
  project_id: string;
  name: string;
  aliases_json: string;
  description: string;
  type: Location['type'];
  parent_id: string | null;
  relations_json: string;
  features_json: string;
  atmosphere: string | null;
  associated_characters_json: string;
  status: Location['status'];
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to Location entity
 */
function rowToLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    aliases: parseJson<string[]>(row.aliases_json, []),
    description: row.description,
    type: row.type,
    parentId: row.parent_id ?? undefined,
    relations: parseJson<LocationRelation[]>(row.relations_json, []),
    features: parseJson<LocationFeature[]>(row.features_json, []),
    atmosphere: row.atmosphere ?? undefined,
    associatedCharacters: parseJson<string[]>(row.associated_characters_json, []),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateLocationData = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateLocationData = Partial<Omit<Location, 'id' | 'createdAt' | 'updatedAt'>>;

export interface LocationRepository extends ProjectScopedRepository<Location, CreateLocationData> {
  findByName(projectId: string, name: string): Location | undefined;
  findByType(projectId: string, type: Location['type']): Location[];
  findByParent(projectId: string, parentId: string | null): Location[];
  findChildren(projectId: string, parentId: string): Location[];
  search(projectId: string, query: string): Location[];
  addRelation(projectId: string, id: string, relation: LocationRelation): Location | undefined;
  addFeature(projectId: string, id: string, feature: LocationFeature): Location | undefined;
  associateCharacter(projectId: string, id: string, characterId: string): Location | undefined;
}

export function createLocationRepository(db: Database.Database): LocationRepository {
  const base = createProjectScopedRepository<LocationRow>(db, 'locations');

  const insertStmt = db.prepare(`
    INSERT INTO locations (
      id, project_id, name, aliases_json, description, type, parent_id,
      relations_json, features_json, atmosphere, associated_characters_json,
      status, created_at, updated_at
    ) VALUES (
      @id, @project_id, @name, @aliases_json, @description, @type, @parent_id,
      @relations_json, @features_json, @atmosphere, @associated_characters_json,
      @status, @created_at, @updated_at
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE locations SET
      name = @name,
      aliases_json = @aliases_json,
      description = @description,
      type = @type,
      parent_id = @parent_id,
      relations_json = @relations_json,
      features_json = @features_json,
      atmosphere = @atmosphere,
      associated_characters_json = @associated_characters_json,
      status = @status,
      updated_at = @updated_at
    WHERE project_id = @project_id AND id = @id
  `);

  const findByNameStmt = db.prepare(`SELECT * FROM locations WHERE project_id = ? AND name = ?`);
  const findByTypeStmt = db.prepare(`SELECT * FROM locations WHERE project_id = ? AND type = ?`);
  const findByParentStmt = db.prepare(`SELECT * FROM locations WHERE project_id = ? AND parent_id IS ?`);
  const findChildrenStmt = db.prepare(`SELECT * FROM locations WHERE project_id = ? AND parent_id = ?`);
  const searchStmt = db.prepare(`
    SELECT l.* FROM locations l
    JOIN locations_fts fts ON l.id = fts.id
    WHERE l.project_id = ? AND locations_fts MATCH ?
  `);

  return {
    findById(projectId: string, id: string): Location | undefined {
      const row = base.findById(projectId, id);
      return row ? rowToLocation(row) : undefined;
    },

    findByProject(projectId: string): Location[] {
      return base.findByProject(projectId).map(rowToLocation);
    },

    create(projectId: string, data: CreateLocationData): Location {
      const now = nowTimestamp();
      const id = generateId();

      const row: LocationRow = {
        id,
        project_id: projectId,
        name: data.name,
        aliases_json: JSON.stringify(data.aliases),
        description: data.description,
        type: data.type,
        parent_id: data.parentId ?? null,
        relations_json: JSON.stringify(data.relations),
        features_json: JSON.stringify(data.features),
        atmosphere: data.atmosphere ?? null,
        associated_characters_json: JSON.stringify(data.associatedCharacters),
        status: data.status,
        created_at: now,
        updated_at: now,
      };

      insertStmt.run(row);
      return rowToLocation(row);
    },

    update(projectId: string, id: string, data: UpdateLocationData): Location | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updated: LocationRow = {
        id,
        project_id: projectId,
        name: data.name ?? existing.name,
        aliases_json: data.aliases ? JSON.stringify(data.aliases) : JSON.stringify(existing.aliases),
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        parent_id: data.parentId !== undefined ? (data.parentId ?? null) : (existing.parentId ?? null),
        relations_json: data.relations ? JSON.stringify(data.relations) : JSON.stringify(existing.relations),
        features_json: data.features ? JSON.stringify(data.features) : JSON.stringify(existing.features),
        atmosphere: data.atmosphere !== undefined ? (data.atmosphere ?? null) : (existing.atmosphere ?? null),
        associated_characters_json: data.associatedCharacters
          ? JSON.stringify(data.associatedCharacters)
          : JSON.stringify(existing.associatedCharacters),
        status: data.status ?? existing.status,
        created_at: existing.createdAt,
        updated_at: now,
      };

      updateStmt.run(updated);
      return rowToLocation(updated);
    },

    delete(projectId: string, id: string): boolean {
      return base.deleteById(projectId, id);
    },

    deleteByProject(projectId: string): number {
      return base.deleteByProject(projectId);
    },

    findByName(projectId: string, name: string): Location | undefined {
      const row = findByNameStmt.get(projectId, name) as LocationRow | undefined;
      return row ? rowToLocation(row) : undefined;
    },

    findByType(projectId: string, type: Location['type']): Location[] {
      const rows = findByTypeStmt.all(projectId, type) as LocationRow[];
      return rows.map(rowToLocation);
    },

    findByParent(projectId: string, parentId: string | null): Location[] {
      const rows = findByParentStmt.all(projectId, parentId) as LocationRow[];
      return rows.map(rowToLocation);
    },

    findChildren(projectId: string, parentId: string): Location[] {
      const rows = findChildrenStmt.all(projectId, parentId) as LocationRow[];
      return rows.map(rowToLocation);
    },

    search(projectId: string, query: string): Location[] {
      const escapedQuery = query.replace(/"/g, '""');
      const rows = searchStmt.all(projectId, `"${escapedQuery}"*`) as LocationRow[];
      return rows.map(rowToLocation);
    },

    addRelation(projectId: string, id: string, relation: LocationRelation): Location | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const relations = [...existing.relations.filter((r) => r.targetId !== relation.targetId), relation];
      return this.update(projectId, id, { relations });
    },

    addFeature(projectId: string, id: string, feature: LocationFeature): Location | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const features = [...existing.features, feature];
      return this.update(projectId, id, { features });
    },

    associateCharacter(projectId: string, id: string, characterId: string): Location | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      if (existing.associatedCharacters.includes(characterId)) return existing;

      const associatedCharacters = [...existing.associatedCharacters, characterId];
      return this.update(projectId, id, { associatedCharacters });
    },
  };
}
