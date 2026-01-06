/**
 * Tests for faction service
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createProjectService } from '../storage/project-service';
import {
  createFactionRepository,
  type CreateFactionData,
} from '../storage/repositories';
import { createFactionService, type FactionService } from './faction-service';

describe('FactionService', () => {
  let db: DatabaseConnection;
  let service: FactionService;
  let projectId: string;

  beforeEach(() => {
    db = createTestDatabase();
    const projectService = createProjectService(db.db, db.drizzle);
    const project = projectService.createProject('Test Project', 'web-serial');
    projectId = project.id;

    const repository = createFactionRepository(db.db, db.drizzle);
    service = createFactionService(projectId, repository);
  });

  afterEach(() => {
    db.close();
  });

  const createTestFaction = (overrides: Partial<CreateFactionData> = {}): CreateFactionData => ({
    name: 'Test Faction',
    aliases: [],
    description: 'A test faction for unit tests.',
    type: 'guild',
    goals: [],
    ranks: [],
    members: [],
    relations: [],
    locations: [],
    status: 'active',
    influence: 'moderate',
    ...overrides,
  });

  describe('CRUD operations', () => {
    it('should create a faction', () => {
      const faction = service.create(createTestFaction({
        name: 'The Guild',
        type: 'guild',
      }));

      expect(faction.id).toBeDefined();
      expect(faction.name).toBe('The Guild');
      expect(faction.type).toBe('guild');
    });

    it('should retrieve a faction by ID', () => {
      const created = service.create(createTestFaction({ name: 'Order' }));
      const retrieved = service.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Order');
    });

    it('should return undefined for non-existent faction', () => {
      const result = service.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should update a faction', () => {
      const created = service.create(createTestFaction({ name: 'Guild' }));
      const updated = service.update(created.id, { name: 'Grand Guild', influence: 'major' });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Grand Guild');
      expect(updated?.influence).toBe('major');
    });

    it('should delete a faction', () => {
      const created = service.create(createTestFaction({ name: 'ToDelete' }));
      const deleted = service.delete(created.id);

      expect(deleted).toBe(true);
      expect(service.get(created.id)).toBeUndefined();
    });

    it('should get all factions', () => {
      service.create(createTestFaction({ name: 'Faction1' }));
      service.create(createTestFaction({ name: 'Faction2' }));
      service.create(createTestFaction({ name: 'Faction3' }));

      const all = service.getAll();
      expect(all.length).toBe(3);
    });
  });

  describe('filtering by type', () => {
    beforeEach(() => {
      service.create(createTestFaction({ name: 'Govt', type: 'government' }));
      service.create(createTestFaction({ name: 'Army', type: 'military' }));
      service.create(createTestFaction({ name: 'Church', type: 'religious' }));
      service.create(createTestFaction({ name: 'Mob', type: 'criminal' }));
    });

    it('should get government factions', () => {
      const govts = service.getByType('government');
      expect(govts.length).toBe(1);
      expect(govts[0].name).toBe('Govt');
    });

    it('should get military factions', () => {
      const military = service.getByType('military');
      expect(military.length).toBe(1);
      expect(military[0].name).toBe('Army');
    });

    it('should get religious factions', () => {
      const religious = service.getByType('religious');
      expect(religious.length).toBe(1);
      expect(religious[0].name).toBe('Church');
    });

    it('should get criminal factions', () => {
      const criminal = service.getByType('criminal');
      expect(criminal.length).toBe(1);
      expect(criminal[0].name).toBe('Mob');
    });
  });

  describe('filtering by status', () => {
    beforeEach(() => {
      service.create(createTestFaction({ name: 'Active', status: 'active' }));
      service.create(createTestFaction({ name: 'Disbanded', status: 'disbanded' }));
      service.create(createTestFaction({ name: 'Underground', status: 'underground' }));
      service.create(createTestFaction({ name: 'Emerging', status: 'emerging' }));
    });

    it('should get active factions', () => {
      const active = service.getByStatus('active');
      expect(active.length).toBe(1);
      expect(active[0].name).toBe('Active');
    });

    it('should get disbanded factions', () => {
      const disbanded = service.getByStatus('disbanded');
      expect(disbanded.length).toBe(1);
      expect(disbanded[0].name).toBe('Disbanded');
    });

    it('should get underground factions', () => {
      const underground = service.getByStatus('underground');
      expect(underground.length).toBe(1);
      expect(underground[0].name).toBe('Underground');
    });

    it('should get emerging factions', () => {
      const emerging = service.getByStatus('emerging');
      expect(emerging.length).toBe(1);
      expect(emerging[0].name).toBe('Emerging');
    });
  });

  describe('filtering by influence', () => {
    beforeEach(() => {
      service.create(createTestFaction({ name: 'Minor', influence: 'minor' }));
      service.create(createTestFaction({ name: 'Moderate', influence: 'moderate' }));
      service.create(createTestFaction({ name: 'Major', influence: 'major' }));
      service.create(createTestFaction({ name: 'Dominant', influence: 'dominant' }));
    });

    it('should get minor influence factions', () => {
      const minor = service.getByInfluence('minor');
      expect(minor.length).toBe(1);
      expect(minor[0].name).toBe('Minor');
    });

    it('should get major influence factions', () => {
      const major = service.getByInfluence('major');
      expect(major.length).toBe(1);
      expect(major[0].name).toBe('Major');
    });

    it('should get dominant influence factions', () => {
      const dominant = service.getByInfluence('dominant');
      expect(dominant.length).toBe(1);
      expect(dominant[0].name).toBe('Dominant');
    });
  });

  describe('search and find', () => {
    beforeEach(() => {
      service.create(createTestFaction({
        name: 'The Order of Light',
        aliases: ['Lightbringers'],
        description: 'A holy order dedicated to justice',
      }));
      service.create(createTestFaction({
        name: 'Shadow Guild',
        aliases: ['The Shadows'],
        description: 'A secretive organization',
      }));
    });

    it('should find by exact name', () => {
      const result = service.findByName('The Order of Light');
      expect(result).toBeDefined();
      expect(result?.name).toBe('The Order of Light');
    });

    it('should search by name', () => {
      const results = service.search('Order');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('The Order of Light');
    });

    it('should search by alias', () => {
      const results = service.search('Lightbringers');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('The Order of Light');
    });

    it('should search by description', () => {
      const results = service.search('secretive');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Shadow Guild');
    });
  });

  describe('rank management', () => {
    it('should add a rank', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      const updated = service.addRank(faction.id, {
        name: 'Master',
        level: 3,
        description: 'Senior member',
        privileges: ['teach', 'vote'],
      });

      expect(updated?.ranks.length).toBe(1);
      expect(updated?.ranks[0].name).toBe('Master');
    });

    it('should replace rank with same name', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      service.addRank(faction.id, {
        name: 'Master',
        level: 3,
        description: 'Original',
        privileges: [],
      });
      const updated = service.addRank(faction.id, {
        name: 'Master',
        level: 5,
        description: 'Updated',
        privileges: ['all'],
      });

      expect(updated?.ranks.length).toBe(1);
      expect(updated?.ranks[0].level).toBe(5);
    });

    it('should remove a rank', () => {
      const faction = service.create(createTestFaction({
        name: 'Guild',
        ranks: [
          { name: 'Master', level: 3, description: 'Top', privileges: [] },
          { name: 'Apprentice', level: 1, description: 'Bottom', privileges: [] },
        ],
      }));
      const updated = service.removeRank(faction.id, 'Master');

      expect(updated?.ranks.length).toBe(1);
      expect(updated?.ranks[0].name).toBe('Apprentice');
    });

    it('should reorder ranks', () => {
      const faction = service.create(createTestFaction({
        name: 'Guild',
        ranks: [
          { name: 'Master', level: 3, description: 'Top', privileges: [] },
          { name: 'Journeyman', level: 2, description: 'Mid', privileges: [] },
          { name: 'Apprentice', level: 1, description: 'Bottom', privileges: [] },
        ],
      }));
      const updated = service.reorderRanks(faction.id, ['Apprentice', 'Master', 'Journeyman']);

      expect(updated?.ranks[0].name).toBe('Apprentice');
      expect(updated?.ranks[0].level).toBe(2);
    });
  });

  describe('member management', () => {
    it('should add a member', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      const updated = service.addMember(faction.id, {
        characterId: 'char-123',
        rank: 'Master',
        status: 'active',
      });

      expect(updated?.members.length).toBe(1);
      expect(updated?.members[0].characterId).toBe('char-123');
    });

    it('should update existing member', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      service.addMember(faction.id, {
        characterId: 'char-123',
        rank: 'Apprentice',
        status: 'active',
      });
      const updated = service.addMember(faction.id, {
        characterId: 'char-123',
        rank: 'Master',
        status: 'active',
      });

      expect(updated?.members.length).toBe(1);
      expect(updated?.members[0].rank).toBe('Master');
    });

    it('should update member details', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      service.addMember(faction.id, {
        characterId: 'char-123',
        rank: 'Apprentice',
        status: 'active',
      });
      const updated = service.updateMember(faction.id, 'char-123', { rank: 'Journeyman' });

      expect(updated?.members[0].rank).toBe('Journeyman');
    });

    it('should remove a member', () => {
      const faction = service.create(createTestFaction({
        name: 'Guild',
        members: [
          { characterId: 'char-123', rank: 'Master', status: 'active' },
          { characterId: 'char-456', rank: 'Apprentice', status: 'active' },
        ],
      }));
      const updated = service.removeMember(faction.id, 'char-123');

      expect(updated?.members.length).toBe(1);
      expect(updated?.members[0].characterId).toBe('char-456');
    });

    it('should get members', () => {
      const faction = service.create(createTestFaction({
        name: 'Guild',
        members: [
          { characterId: 'char-123', rank: 'Master', status: 'active' },
          { characterId: 'char-456', rank: 'Apprentice', status: 'active' },
        ],
      }));

      const members = service.getMembers(faction.id);
      expect(members.length).toBe(2);
    });

    it('should return empty array for faction with no members', () => {
      const faction = service.create(createTestFaction({ name: 'Empty' }));
      const members = service.getMembers(faction.id);
      expect(members).toEqual([]);
    });

    it('should get factions by character', () => {
      service.create(createTestFaction({
        name: 'Guild1',
        members: [{ characterId: 'char-123', rank: 'Master', status: 'active' }],
      }));
      service.create(createTestFaction({
        name: 'Guild2',
        members: [{ characterId: 'char-123', rank: 'Member', status: 'active' }],
      }));
      service.create(createTestFaction({
        name: 'Guild3',
        members: [{ characterId: 'char-456', rank: 'Leader', status: 'active' }],
      }));

      const factions = service.getByCharacter('char-123');
      expect(factions.length).toBe(2);
    });
  });

  describe('relation management', () => {
    it('should add a relation', () => {
      const faction1 = service.create(createTestFaction({ name: 'Guild1' }));
      const faction2 = service.create(createTestFaction({ name: 'Guild2' }));

      const updated = service.addRelation(faction1.id, {
        targetId: faction2.id,
        type: 'ally',
        description: 'Allied factions',
        strength: 80,
      });

      expect(updated?.relations.length).toBe(1);
      expect(updated?.relations[0].targetId).toBe(faction2.id);
    });

    it('should replace existing relation', () => {
      const faction1 = service.create(createTestFaction({ name: 'Guild1' }));
      const faction2 = service.create(createTestFaction({ name: 'Guild2' }));

      service.addRelation(faction1.id, {
        targetId: faction2.id,
        type: 'ally',
        description: 'Allies',
        strength: 80,
      });
      const updated = service.addRelation(faction1.id, {
        targetId: faction2.id,
        type: 'enemy',
        description: 'Now enemies',
        strength: 90,
      });

      expect(updated?.relations.length).toBe(1);
      expect(updated?.relations[0].type).toBe('enemy');
    });

    it('should remove a relation', () => {
      const faction1 = service.create(createTestFaction({ name: 'Guild1' }));
      const faction2 = service.create(createTestFaction({ name: 'Guild2' }));

      service.addRelation(faction1.id, {
        targetId: faction2.id,
        type: 'ally',
        description: 'Allies',
        strength: 80,
      });
      const updated = service.removeRelation(faction1.id, faction2.id);

      expect(updated?.relations.length).toBe(0);
    });

    it('should get related factions', () => {
      const faction1 = service.create(createTestFaction({ name: 'Guild1' }));
      const faction2 = service.create(createTestFaction({ name: 'Guild2' }));

      service.addRelation(faction1.id, {
        targetId: faction2.id,
        type: 'ally',
        description: 'Allies',
        strength: 80,
      });

      const related = service.getRelatedFactions(faction1.id);
      expect(related.length).toBe(1);
      expect(related[0].faction.name).toBe('Guild2');
      expect(related[0].relation.type).toBe('ally');
    });
  });

  describe('goal management', () => {
    it('should add a goal', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      const updated = service.addGoal(faction.id, 'Conquer the world');

      expect(updated?.goals).toContain('Conquer the world');
    });

    it('should not duplicate goals', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      service.addGoal(faction.id, 'Conquer the world');
      const updated = service.addGoal(faction.id, 'Conquer the world');

      expect(updated?.goals.filter(g => g === 'Conquer the world').length).toBe(1);
    });

    it('should remove a goal', () => {
      const faction = service.create(createTestFaction({
        name: 'Guild',
        goals: ['Goal 1', 'Goal 2', 'Goal 3'],
      }));
      const updated = service.removeGoal(faction.id, 1);

      expect(updated?.goals).toEqual(['Goal 1', 'Goal 3']);
    });
  });

  describe('location management', () => {
    it('should add a location', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      const updated = service.addLocation(faction.id, 'loc-123');

      expect(updated?.locations).toContain('loc-123');
    });

    it('should not duplicate locations', () => {
      const faction = service.create(createTestFaction({ name: 'Guild' }));
      service.addLocation(faction.id, 'loc-123');
      const updated = service.addLocation(faction.id, 'loc-123');

      expect(updated?.locations.filter(l => l === 'loc-123').length).toBe(1);
    });

    it('should remove a location', () => {
      const faction = service.create(createTestFaction({
        name: 'Guild',
        locations: ['loc-123', 'loc-456'],
      }));
      const updated = service.removeLocation(faction.id, 'loc-123');

      expect(updated?.locations).not.toContain('loc-123');
      expect(updated?.locations).toContain('loc-456');
    });
  });

  describe('summaries', () => {
    it('should get a faction summary', () => {
      const faction = service.create(createTestFaction({
        name: 'The Guild',
        type: 'guild',
        influence: 'major',
        description: 'A powerful merchant guild. Controls all trade.',
      }));

      const summary = service.getSummary(faction.id);

      expect(summary).toBeDefined();
      expect(summary?.id).toBe(faction.id);
      expect(summary?.name).toBe('The Guild');
      expect(summary?.type).toBe('guild');
      expect(summary?.influence).toBe('major');
      expect(summary?.brief).toBe('A powerful merchant guild');
    });

    it('should return undefined for non-existent faction summary', () => {
      const summary = service.getSummary('non-existent');
      expect(summary).toBeUndefined();
    });

    it('should get all summaries', () => {
      service.create(createTestFaction({ name: 'Faction1' }));
      service.create(createTestFaction({ name: 'Faction2' }));
      service.create(createTestFaction({ name: 'Faction3' }));

      const summaries = service.getAllSummaries();
      expect(summaries.length).toBe(3);
    });
  });
});
