/**
 * Tests for location service
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createProjectService } from '../storage/project-service';
import {
  createLocationRepository,
  type CreateLocationData,
} from '../storage/repositories';
import { createLocationService, type LocationService } from './location-service';

describe('LocationService', () => {
  let db: DatabaseConnection;
  let service: LocationService;
  let projectId: string;

  beforeEach(() => {
    db = createTestDatabase();
    const projectService = createProjectService(db.db, db.drizzle);
    const project = projectService.createProject('Test Project', 'web-serial');
    projectId = project.id;

    const repository = createLocationRepository(db.db, db.drizzle);
    service = createLocationService(projectId, repository);
  });

  afterEach(() => {
    db.close();
  });

  const createTestLocation = (overrides: Partial<CreateLocationData> = {}): CreateLocationData => ({
    name: 'Test Location',
    aliases: [],
    description: 'A test location for unit tests.',
    type: 'city',
    relations: [],
    features: [],
    associatedCharacters: [],
    status: 'accessible',
    ...overrides,
  });

  describe('CRUD operations', () => {
    it('should create a location', () => {
      const location = service.create(createTestLocation({
        name: 'Capital City',
        type: 'city',
      }));

      expect(location.id).toBeDefined();
      expect(location.name).toBe('Capital City');
      expect(location.type).toBe('city');
    });

    it('should retrieve a location by ID', () => {
      const created = service.create(createTestLocation({ name: 'Forest' }));
      const retrieved = service.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Forest');
    });

    it('should return undefined for non-existent location', () => {
      const result = service.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should update a location', () => {
      const created = service.create(createTestLocation({ name: 'Town' }));
      const updated = service.update(created.id, { name: 'Big Town', status: 'destroyed' });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Big Town');
      expect(updated?.status).toBe('destroyed');
    });

    it('should delete a location', () => {
      const created = service.create(createTestLocation({ name: 'ToDelete' }));
      const deleted = service.delete(created.id);

      expect(deleted).toBe(true);
      expect(service.get(created.id)).toBeUndefined();
    });

    it('should get all locations', () => {
      service.create(createTestLocation({ name: 'Loc1' }));
      service.create(createTestLocation({ name: 'Loc2' }));
      service.create(createTestLocation({ name: 'Loc3' }));

      const all = service.getAll();
      expect(all.length).toBe(3);
    });
  });

  describe('filtering by type', () => {
    beforeEach(() => {
      service.create(createTestLocation({ name: 'World', type: 'world' }));
      service.create(createTestLocation({ name: 'City', type: 'city' }));
      service.create(createTestLocation({ name: 'Building', type: 'building' }));
      service.create(createTestLocation({ name: 'Room', type: 'room' }));
    });

    it('should get world locations', () => {
      const worlds = service.getByType('world');
      expect(worlds.length).toBe(1);
      expect(worlds[0].name).toBe('World');
    });

    it('should get city locations', () => {
      const cities = service.getByType('city');
      expect(cities.length).toBe(1);
      expect(cities[0].name).toBe('City');
    });

    it('should get building locations', () => {
      const buildings = service.getByType('building');
      expect(buildings.length).toBe(1);
      expect(buildings[0].name).toBe('Building');
    });
  });

  describe('filtering by status', () => {
    beforeEach(() => {
      service.create(createTestLocation({ name: 'Open', status: 'accessible' }));
      service.create(createTestLocation({ name: 'Restricted', status: 'restricted' }));
      service.create(createTestLocation({ name: 'Ruined', status: 'destroyed' }));
      service.create(createTestLocation({ name: 'Lost', status: 'unknown' }));
    });

    it('should get accessible locations', () => {
      const accessible = service.getByStatus('accessible');
      expect(accessible.length).toBe(1);
      expect(accessible[0].name).toBe('Open');
    });

    it('should get restricted locations', () => {
      const restricted = service.getByStatus('restricted');
      expect(restricted.length).toBe(1);
      expect(restricted[0].name).toBe('Restricted');
    });

    it('should get destroyed locations', () => {
      const destroyed = service.getByStatus('destroyed');
      expect(destroyed.length).toBe(1);
      expect(destroyed[0].name).toBe('Ruined');
    });
  });

  describe('hierarchy management', () => {
    it('should create location with parent', () => {
      const world = service.create(createTestLocation({ name: 'World', type: 'world' }));
      const city = service.create(createTestLocation({
        name: 'City',
        type: 'city',
        parentId: world.id,
      }));

      expect(city.parentId).toBe(world.id);
    });

    it('should get children of a location', () => {
      const world = service.create(createTestLocation({ name: 'World', type: 'world' }));
      service.create(createTestLocation({ name: 'City1', type: 'city', parentId: world.id }));
      service.create(createTestLocation({ name: 'City2', type: 'city', parentId: world.id }));

      const children = service.getChildren(world.id);
      expect(children.length).toBe(2);
    });

    it('should get root locations', () => {
      const world = service.create(createTestLocation({ name: 'World', type: 'world' }));
      service.create(createTestLocation({ name: 'City', type: 'city', parentId: world.id }));

      const roots = service.getRoots();
      expect(roots.length).toBe(1);
      expect(roots[0].name).toBe('World');
    });

    it('should get ancestors', () => {
      const world = service.create(createTestLocation({ name: 'World', type: 'world' }));
      const country = service.create(createTestLocation({
        name: 'Country',
        type: 'country',
        parentId: world.id,
      }));
      const city = service.create(createTestLocation({
        name: 'City',
        type: 'city',
        parentId: country.id,
      }));

      const ancestors = service.getAncestors(city.id);
      expect(ancestors.length).toBe(2);
      expect(ancestors[0].name).toBe('Country');
      expect(ancestors[1].name).toBe('World');
    });

    it('should get subtree', () => {
      const world = service.create(createTestLocation({ name: 'World', type: 'world' }));
      const country = service.create(createTestLocation({
        name: 'Country',
        type: 'country',
        parentId: world.id,
      }));
      service.create(createTestLocation({
        name: 'City',
        type: 'city',
        parentId: country.id,
      }));

      const subtree = service.getSubtree(world.id);
      expect(subtree.length).toBe(3);
    });

    it('should set parent', () => {
      const world = service.create(createTestLocation({ name: 'World', type: 'world' }));
      const city = service.create(createTestLocation({ name: 'City', type: 'city' }));

      const updated = service.setParent(city.id, world.id);
      expect(updated?.parentId).toBe(world.id);
    });

    it('should prevent circular references when setting parent', () => {
      const parent = service.create(createTestLocation({ name: 'Parent', type: 'city' }));
      const child = service.create(createTestLocation({
        name: 'Child',
        type: 'building',
        parentId: parent.id,
      }));

      const result = service.setParent(parent.id, child.id);
      expect(result).toBeUndefined();
    });
  });

  describe('search and find', () => {
    beforeEach(() => {
      service.create(createTestLocation({
        name: 'Dragon Mountain',
        aliases: ['The Peak'],
        description: 'A volcanic mountain',
      }));
      service.create(createTestLocation({
        name: 'Crystal Lake',
        aliases: ['Mirror Lake'],
        description: 'A clear lake',
      }));
    });

    it('should find by exact name', () => {
      const result = service.findByName('Dragon Mountain');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Dragon Mountain');
    });

    // Note: FTS5-based search has limitations in test environment.
    // The service.search() method uses FTS5 which requires specific schema setup.
    // Manual search tests are covered in bible-service.test.ts via searchAll().
    // Here we verify findByName which doesn't use FTS5.

    it('should return undefined for non-existent name', () => {
      const result = service.findByName('Nonexistent Location');
      expect(result).toBeUndefined();
    });
  });

  describe('relation management', () => {
    it('should add a relation', () => {
      const loc1 = service.create(createTestLocation({ name: 'City' }));
      const loc2 = service.create(createTestLocation({ name: 'Town' }));

      const updated = service.addRelation(loc1.id, {
        targetId: loc2.id,
        type: 'trade-route',
        description: 'Main trade route',
      });

      expect(updated?.relations.length).toBe(1);
      expect(updated?.relations[0].targetId).toBe(loc2.id);
    });

    it('should replace existing relation with same target', () => {
      const loc1 = service.create(createTestLocation({ name: 'City' }));
      const loc2 = service.create(createTestLocation({ name: 'Town' }));

      service.addRelation(loc1.id, {
        targetId: loc2.id,
        type: 'trade-route',
        description: 'Original description',
      });
      const updated = service.addRelation(loc1.id, {
        targetId: loc2.id,
        type: 'road',
        description: 'Updated description',
      });

      expect(updated?.relations.length).toBe(1);
      expect(updated?.relations[0].type).toBe('road');
    });

    it('should remove a relation', () => {
      const loc1 = service.create(createTestLocation({ name: 'City' }));
      const loc2 = service.create(createTestLocation({ name: 'Town' }));

      service.addRelation(loc1.id, {
        targetId: loc2.id,
        type: 'trade-route',
        description: 'Main trade route',
      });
      const updated = service.removeRelation(loc1.id, loc2.id);

      expect(updated?.relations.length).toBe(0);
    });

    it('should get related locations', () => {
      const loc1 = service.create(createTestLocation({ name: 'City' }));
      const loc2 = service.create(createTestLocation({ name: 'Town' }));

      service.addRelation(loc1.id, {
        targetId: loc2.id,
        type: 'trade-route',
        description: 'Main trade route',
      });

      const related = service.getRelatedLocations(loc1.id);
      expect(related.length).toBe(1);
      expect(related[0].location.name).toBe('Town');
      expect(related[0].relation.type).toBe('trade-route');
    });
  });

  describe('feature management', () => {
    it('should add a feature', () => {
      const loc = service.create(createTestLocation({ name: 'Castle' }));
      const updated = service.addFeature(loc.id, {
        name: 'Great Hall',
        description: 'The main gathering hall',
        significance: 'landmark',
      });

      expect(updated?.features.length).toBe(1);
      expect(updated?.features[0].name).toBe('Great Hall');
    });

    it('should replace feature with same name', () => {
      const loc = service.create(createTestLocation({ name: 'Castle' }));
      service.addFeature(loc.id, {
        name: 'Great Hall',
        description: 'Original description',
        significance: 'landmark',
      });
      const updated = service.addFeature(loc.id, {
        name: 'Great Hall',
        description: 'Updated description',
        significance: 'plot-critical',
      });

      expect(updated?.features.length).toBe(1);
      expect(updated?.features[0].description).toBe('Updated description');
    });

    it('should remove a feature', () => {
      const loc = service.create(createTestLocation({ name: 'Castle' }));
      service.addFeature(loc.id, {
        name: 'Great Hall',
        description: 'The main hall',
        significance: 'landmark',
      });
      const updated = service.removeFeature(loc.id, 'Great Hall');

      expect(updated?.features.length).toBe(0);
    });
  });

  describe('character association', () => {
    it('should associate a character', () => {
      const loc = service.create(createTestLocation({ name: 'Castle' }));
      const updated = service.associateCharacter(loc.id, 'char-123');

      expect(updated?.associatedCharacters).toContain('char-123');
    });

    it('should not duplicate character association', () => {
      const loc = service.create(createTestLocation({ name: 'Castle' }));
      service.associateCharacter(loc.id, 'char-123');
      const updated = service.associateCharacter(loc.id, 'char-123');

      expect(updated?.associatedCharacters.filter(c => c === 'char-123').length).toBe(1);
    });

    it('should disassociate a character', () => {
      const loc = service.create(createTestLocation({
        name: 'Castle',
        associatedCharacters: ['char-123', 'char-456'],
      }));
      const updated = service.disassociateCharacter(loc.id, 'char-123');

      expect(updated?.associatedCharacters).not.toContain('char-123');
      expect(updated?.associatedCharacters).toContain('char-456');
    });

    it('should get locations by character', () => {
      service.create(createTestLocation({
        name: 'Castle',
        associatedCharacters: ['char-123'],
      }));
      service.create(createTestLocation({
        name: 'Town',
        associatedCharacters: ['char-123'],
      }));
      service.create(createTestLocation({
        name: 'Forest',
        associatedCharacters: ['char-456'],
      }));

      const locations = service.getByCharacter('char-123');
      expect(locations.length).toBe(2);
    });
  });

  describe('summaries', () => {
    it('should get a location summary', () => {
      const loc = service.create(createTestLocation({
        name: 'Dragon Mountain',
        type: 'natural',
        description: 'A volcanic mountain home to ancient dragons. Very dangerous.',
      }));

      const summary = service.getSummary(loc.id);

      expect(summary).toBeDefined();
      expect(summary?.id).toBe(loc.id);
      expect(summary?.name).toBe('Dragon Mountain');
      expect(summary?.type).toBe('natural');
      expect(summary?.brief).toBe('A volcanic mountain home to ancient dragons');
    });

    it('should return undefined for non-existent location summary', () => {
      const summary = service.getSummary('non-existent');
      expect(summary).toBeUndefined();
    });

    it('should get all summaries', () => {
      service.create(createTestLocation({ name: 'Loc1' }));
      service.create(createTestLocation({ name: 'Loc2' }));
      service.create(createTestLocation({ name: 'Loc3' }));

      const summaries = service.getAllSummaries();
      expect(summaries.length).toBe(3);
    });
  });
});
