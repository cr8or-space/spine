/**
 * Location repository for database operations
 *
 * Uses Drizzle ORM for type-safe queries while maintaining
 * compatibility with raw SQL for FTS5 search.
 */

import type Database from 'libsql';
import { and, eq, isNull } from 'drizzle-orm';

import type { Location, LocationFeature, LocationRelation } from '@repo/serial-types';

import type { DrizzleDB } from '../database';
import { locations } from '../drizzle-schema';
import { generateId, nowTimestamp, parseJson, type ProjectScopedRepository } from '../repository';
import { formatFts5PrefixQuery } from '../../utils/text';

/**
 * Database row representation of a location (for raw SQL FTS5 queries)
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
 * Convert Drizzle row to Location entity
 */
function rowToLocation(row: typeof locations.$inferSelect): Location {
  return {
    id: row.id,
    entityType: 'location',
    name: row.name,
    aliases: parseJson<string[]>(row.aliasesJson, []),
    description: row.description,
    type: row.type,
    parentId: row.parentId ?? undefined,
    relations: parseJson<LocationRelation[]>(row.relationsJson, []),
    features: parseJson<LocationFeature[]>(row.featuresJson, []),
    atmosphere: row.atmosphere ?? undefined,
    associatedCharacters: parseJson<string[]>(row.associatedCharactersJson, []),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Convert raw SQL row to Location entity (for FTS5 queries)
 */
function rawRowToLocation(row: LocationRow): Location {
  return {
    id: row.id,
    entityType: 'location',
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

export type CreateLocationData = Omit<Location, 'id' | 'entityType' | 'createdAt' | 'updatedAt'>;
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

export function createLocationRepository(db: Database.Database, drizzleDb: DrizzleDB): LocationRepository {
  // FTS5 search requires raw SQL (Drizzle doesn't support virtual tables)
  const searchStmt = db.prepare(`
    SELECT l.* FROM locations l
    JOIN locations_fts fts ON l.id = fts.id
    WHERE l.project_id = ? AND locations_fts MATCH ?
  `);

  return {
    findById(projectId: string, id: string): Location | undefined {
      const row = drizzleDb
        .select()
        .from(locations)
        .where(and(eq(locations.projectId, projectId), eq(locations.id, id)))
        .get();
      return row ? rowToLocation(row) : undefined;
    },

    findByProject(projectId: string): Location[] {
      const rows = drizzleDb.select().from(locations).where(eq(locations.projectId, projectId)).all();
      return rows.map(rowToLocation);
    },

    create(projectId: string, data: CreateLocationData): Location {
      const now = nowTimestamp();
      const id = generateId();

      const newRow = {
        id,
        projectId,
        name: data.name,
        aliasesJson: JSON.stringify(data.aliases),
        description: data.description,
        type: data.type,
        parentId: data.parentId ?? null,
        relationsJson: JSON.stringify(data.relations),
        featuresJson: JSON.stringify(data.features),
        atmosphere: data.atmosphere ?? null,
        associatedCharactersJson: JSON.stringify(data.associatedCharacters),
        status: data.status,
        createdAt: now,
        updatedAt: now,
      };

      drizzleDb.insert(locations).values(newRow).run();

      return {
        id,
        entityType: 'location',
        name: data.name,
        aliases: data.aliases,
        description: data.description,
        type: data.type,
        parentId: data.parentId,
        relations: data.relations,
        features: data.features,
        atmosphere: data.atmosphere,
        associatedCharacters: data.associatedCharacters,
        status: data.status,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(projectId: string, id: string, data: UpdateLocationData): Location | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) return undefined;

      const now = nowTimestamp();
      const updateData = {
        name: data.name ?? existing.name,
        aliasesJson: data.aliases ? JSON.stringify(data.aliases) : JSON.stringify(existing.aliases),
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        parentId: data.parentId !== undefined ? (data.parentId ?? null) : (existing.parentId ?? null),
        relationsJson: data.relations ? JSON.stringify(data.relations) : JSON.stringify(existing.relations),
        featuresJson: data.features ? JSON.stringify(data.features) : JSON.stringify(existing.features),
        atmosphere: data.atmosphere !== undefined ? (data.atmosphere ?? null) : (existing.atmosphere ?? null),
        associatedCharactersJson: data.associatedCharacters
          ? JSON.stringify(data.associatedCharacters)
          : JSON.stringify(existing.associatedCharacters),
        status: data.status ?? existing.status,
        updatedAt: now,
      };

      drizzleDb
        .update(locations)
        .set(updateData)
        .where(and(eq(locations.projectId, projectId), eq(locations.id, id)))
        .run();

      return this.findById(projectId, id);
    },

    delete(projectId: string, id: string): boolean {
      const result = drizzleDb
        .delete(locations)
        .where(and(eq(locations.projectId, projectId), eq(locations.id, id)))
        .run();
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = drizzleDb.delete(locations).where(eq(locations.projectId, projectId)).run();
      return result.changes;
    },

    findByName(projectId: string, name: string): Location | undefined {
      const row = drizzleDb
        .select()
        .from(locations)
        .where(and(eq(locations.projectId, projectId), eq(locations.name, name)))
        .get();
      return row ? rowToLocation(row) : undefined;
    },

    findByType(projectId: string, type: Location['type']): Location[] {
      const rows = drizzleDb
        .select()
        .from(locations)
        .where(and(eq(locations.projectId, projectId), eq(locations.type, type)))
        .all();
      return rows.map(rowToLocation);
    },

    findByParent(projectId: string, parentId: string | null): Location[] {
      const condition = parentId === null
        ? and(eq(locations.projectId, projectId), isNull(locations.parentId))
        : and(eq(locations.projectId, projectId), eq(locations.parentId, parentId));
      const rows = drizzleDb.select().from(locations).where(condition).all();
      return rows.map(rowToLocation);
    },

    findChildren(projectId: string, parentId: string): Location[] {
      const rows = drizzleDb
        .select()
        .from(locations)
        .where(and(eq(locations.projectId, projectId), eq(locations.parentId, parentId)))
        .all();
      return rows.map(rowToLocation);
    },

    search(projectId: string, query: string): Location[] {
      const rows = searchStmt.all(projectId, formatFts5PrefixQuery(query)) as LocationRow[];
      return rows.map(rawRowToLocation);
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
