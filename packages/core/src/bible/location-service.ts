/**
 * Location service for bible management
 *
 * Provides high-level CRUD operations for locations with
 * hierarchical management and relationship tracking.
 */

import type { Location, LocationFeature, LocationRelation, LocationSummary } from '@repo/types';

import type {
  CreateLocationData,
  LocationRepository,
  UpdateLocationData,
} from '../storage/repositories';

/**
 * Location service interface
 */
export interface LocationService {
  /** Get a location by ID */
  get(id: string): Location | undefined;

  /** Get all locations */
  getAll(): Location[];

  /** Get locations by type */
  getByType(type: Location['type']): Location[];

  /** Get locations by status */
  getByStatus(status: Location['status']): Location[];

  /** Get child locations of a parent */
  getChildren(parentId: string): Location[];

  /** Get root locations (no parent) */
  getRoots(): Location[];

  /** Get location hierarchy (ancestors) */
  getAncestors(id: string): Location[];

  /** Get full subtree under a location */
  getSubtree(id: string): Location[];

  /** Search locations by name or description */
  search(query: string): Location[];

  /** Find location by exact name */
  findByName(name: string): Location | undefined;

  /** Create a new location */
  create(data: CreateLocationData): Location;

  /** Update a location */
  update(id: string, data: UpdateLocationData): Location | undefined;

  /** Delete a location */
  delete(id: string): boolean;

  /** Move a location to a new parent */
  setParent(id: string, parentId: string | undefined): Location | undefined;

  /** Add a relation to another location */
  addRelation(id: string, relation: LocationRelation): Location | undefined;

  /** Remove a relation */
  removeRelation(id: string, targetId: string): Location | undefined;

  /** Get all related locations */
  getRelatedLocations(id: string): Array<{ location: Location; relation: LocationRelation }>;

  /** Add a feature to a location */
  addFeature(id: string, feature: LocationFeature): Location | undefined;

  /** Remove a feature */
  removeFeature(id: string, featureName: string): Location | undefined;

  /** Associate a character with a location */
  associateCharacter(id: string, characterId: string): Location | undefined;

  /** Remove character association */
  disassociateCharacter(id: string, characterId: string): Location | undefined;

  /** Get locations associated with a character */
  getByCharacter(characterId: string): Location[];

  /** Get location summary for context assembly */
  getSummary(id: string): LocationSummary | undefined;

  /** Get all location summaries */
  getAllSummaries(): LocationSummary[];
}

/**
 * Create location service
 */
export function createLocationService(
  projectId: string,
  repository: LocationRepository
): LocationService {
  function toSummary(loc: Location): LocationSummary {
    const brief =
      loc.description.split('.')[0]?.trim() ||
      loc.description.substring(0, 100) + (loc.description.length > 100 ? '...' : '');

    return {
      id: loc.id,
      name: loc.name,
      type: loc.type,
      parentId: loc.parentId,
      brief,
    };
  }

  return {
    get(id: string): Location | undefined {
      return repository.findById(projectId, id);
    },

    getAll(): Location[] {
      return repository.findByProject(projectId);
    },

    getByType(type: Location['type']): Location[] {
      return repository.findByType(projectId, type);
    },

    getByStatus(status: Location['status']): Location[] {
      return this.getAll().filter((l) => l.status === status);
    },

    getChildren(parentId: string): Location[] {
      return repository.findByParent(projectId, parentId);
    },

    getRoots(): Location[] {
      return repository.findByParent(projectId, null);
    },

    getAncestors(id: string): Location[] {
      const ancestors: Location[] = [];
      let current = this.get(id);

      while (current?.parentId) {
        const parent = this.get(current.parentId);
        if (parent) {
          ancestors.push(parent);
          current = parent;
        } else {
          break;
        }
      }

      return ancestors;
    },

    getSubtree(id: string): Location[] {
      const result: Location[] = [];
      const queue = [id];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const location = this.get(currentId);
        if (location) {
          result.push(location);
          const children = this.getChildren(currentId);
          queue.push(...children.map((c) => c.id));
        }
      }

      return result;
    },

    search(query: string): Location[] {
      return repository.search(projectId, query);
    },

    findByName(name: string): Location | undefined {
      return repository.findByName(projectId, name);
    },

    create(data: CreateLocationData): Location {
      return repository.create(projectId, data);
    },

    update(id: string, data: UpdateLocationData): Location | undefined {
      return repository.update(projectId, id, data);
    },

    delete(id: string): boolean {
      return repository.delete(projectId, id);
    },

    setParent(id: string, parentId: string | undefined): Location | undefined {
      // Prevent circular references
      if (parentId) {
        const ancestors = this.getAncestors(parentId);
        if (ancestors.some((a) => a.id === id)) {
          return undefined; // Would create a cycle
        }
      }

      return this.update(id, { parentId });
    },

    addRelation(id: string, relation: LocationRelation): Location | undefined {
      const loc = this.get(id);
      if (!loc) return undefined;

      const relations = [...loc.relations.filter((r) => r.targetId !== relation.targetId), relation];
      return this.update(id, { relations });
    },

    removeRelation(id: string, targetId: string): Location | undefined {
      const loc = this.get(id);
      if (!loc) return undefined;

      const relations = loc.relations.filter((r) => r.targetId !== targetId);
      return this.update(id, { relations });
    },

    getRelatedLocations(id: string): Array<{ location: Location; relation: LocationRelation }> {
      const loc = this.get(id);
      if (!loc) return [];

      const result: Array<{ location: Location; relation: LocationRelation }> = [];
      for (const rel of loc.relations) {
        const location = this.get(rel.targetId);
        if (location) {
          result.push({ location, relation: rel });
        }
      }

      return result;
    },

    addFeature(id: string, feature: LocationFeature): Location | undefined {
      const loc = this.get(id);
      if (!loc) return undefined;

      const features = [...loc.features.filter((f) => f.name !== feature.name), feature];
      return this.update(id, { features });
    },

    removeFeature(id: string, featureName: string): Location | undefined {
      const loc = this.get(id);
      if (!loc) return undefined;

      const features = loc.features.filter((f) => f.name !== featureName);
      return this.update(id, { features });
    },

    associateCharacter(id: string, characterId: string): Location | undefined {
      const loc = this.get(id);
      if (!loc) return undefined;

      if (loc.associatedCharacters.includes(characterId)) {
        return loc; // Already associated
      }

      const associatedCharacters = [...loc.associatedCharacters, characterId];
      return this.update(id, { associatedCharacters });
    },

    disassociateCharacter(id: string, characterId: string): Location | undefined {
      const loc = this.get(id);
      if (!loc) return undefined;

      const associatedCharacters = loc.associatedCharacters.filter((c) => c !== characterId);
      return this.update(id, { associatedCharacters });
    },

    getByCharacter(characterId: string): Location[] {
      return this.getAll().filter((loc) => loc.associatedCharacters.includes(characterId));
    },

    getSummary(id: string): LocationSummary | undefined {
      const loc = this.get(id);
      return loc ? toSummary(loc) : undefined;
    },

    getAllSummaries(): LocationSummary[] {
      return this.getAll().map(toSummary);
    },
  };
}
