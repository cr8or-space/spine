/**
 * Tests for bible service
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createProjectService } from '../storage/project-service';
import { createBibleService, type BibleService } from './bible-service';

describe('BibleService', () => {
  let db: DatabaseConnection;
  let bibleService: BibleService;
  let projectId: string;

  beforeEach(() => {
    db = createTestDatabase();
    // Create a project first to satisfy foreign key constraints
    const projectService = createProjectService(db.db, db.drizzle);
    const project = projectService.createProject('Test Project', 'web-serial');
    projectId = project.id;
    bibleService = createBibleService(db.db, db.drizzle, projectId);
  });

  afterEach(() => {
    db.close();
  });

  describe('characters', () => {
    it('should create and retrieve a character', () => {
      const character = bibleService.characters.create({
        name: 'John Doe',
        aliases: ['Johnny', 'JD'],
        description: 'A brave hero who seeks justice.',
        traits: [{ category: 'personality', name: 'brave', description: 'Never backs down' }],
        relationships: [],
        voiceSamples: ['"I will protect the innocent!"'],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      expect(character.id).toBeDefined();
      expect(character.name).toBe('John Doe');
      expect(character.role).toBe('protagonist');

      const retrieved = bibleService.characters.get(character.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('John Doe');
    });

    it('should find characters by name', () => {
      bibleService.characters.create({
        name: 'Alice Smith',
        aliases: [],
        description: 'A mysterious stranger.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'supporting',
        status: 'active',
      });

      bibleService.characters.create({
        name: 'Bob Johnson',
        aliases: [],
        description: 'A loyal friend.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'supporting',
        status: 'active',
      });

      const result = bibleService.characters.findByName('Alice Smith');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Alice Smith');

      const byRole = bibleService.characters.getByRole('supporting');
      expect(byRole.length).toBe(2);
    });

    it('should manage character relationships', () => {
      const char1 = bibleService.characters.create({
        name: 'Hero',
        aliases: [],
        description: 'The main character.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      const char2 = bibleService.characters.create({
        name: 'Sidekick',
        aliases: [],
        description: 'The hero\'s friend.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'supporting',
        status: 'active',
      });

      bibleService.characters.addRelationship(char1.id, {
        targetId: char2.id,
        type: 'friend',
        description: 'Best friends since childhood',
        intensity: 80,
        mutual: true,
      });

      const relationships = bibleService.characters.getRelationships(char1.id);
      expect(relationships.length).toBe(1);
      expect(relationships[0].targetId).toBe(char2.id);

      const related = bibleService.characters.getRelatedCharacters(char1.id);
      expect(related.length).toBe(1);
      expect(related[0].character.name).toBe('Sidekick');
    });
  });

  describe('locations', () => {
    it('should create hierarchical locations', () => {
      const world = bibleService.locations.create({
        name: 'Fantasy World',
        aliases: [],
        description: 'A magical realm.',
        type: 'world',
        relations: [],
        features: [],
        associatedCharacters: [],
        status: 'accessible',
      });

      const city = bibleService.locations.create({
        name: 'Capital City',
        aliases: ['The Capital'],
        description: 'The main city of the realm.',
        type: 'city',
        parentId: world.id,
        relations: [],
        features: [{ name: 'Grand Palace', description: 'Royal residence', significance: 'landmark' }],
        associatedCharacters: [],
        status: 'accessible',
      });

      expect(city.parentId).toBe(world.id);

      const children = bibleService.locations.getChildren(world.id);
      expect(children.length).toBe(1);
      expect(children[0].name).toBe('Capital City');

      const ancestors = bibleService.locations.getAncestors(city.id);
      expect(ancestors.length).toBe(1);
      expect(ancestors[0].name).toBe('Fantasy World');
    });
  });

  describe('factions', () => {
    it('should manage faction members', () => {
      const faction = bibleService.factions.create({
        name: 'The Order',
        aliases: [],
        description: 'A secret society.',
        type: 'secret-society',
        goals: ['Protect ancient knowledge'],
        ranks: [
          { name: 'Grandmaster', level: 3, description: 'Leader', privileges: ['all'] },
          { name: 'Master', level: 2, description: 'Senior member', privileges: ['teach'] },
          { name: 'Initiate', level: 1, description: 'New member', privileges: [] },
        ],
        members: [],
        relations: [],
        locations: [],
        status: 'active',
        influence: 'moderate',
      });

      const character = bibleService.characters.create({
        name: 'Sage',
        aliases: [],
        description: 'A wise elder.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'supporting',
        status: 'active',
      });

      bibleService.factions.addMember(faction.id, {
        characterId: character.id,
        rank: 'Master',
        status: 'active',
      });

      const members = bibleService.factions.getMembers(faction.id);
      expect(members.length).toBe(1);
      expect(members[0].characterId).toBe(character.id);

      const characterFactions = bibleService.factions.getByCharacter(character.id);
      expect(characterFactions.length).toBe(1);
      expect(characterFactions[0].name).toBe('The Order');
    });
  });

  describe('worldRules', () => {
    it('should create and manage world rules', () => {
      const rule = bibleService.worldRules.create({
        name: 'Law of Magic',
        description: 'How magic works in this world.',
        category: 'magic',
        rule: 'Magic requires spoken words and focused intent.',
        exceptions: [],
        publicKnowledge: true,
        relatedRules: [],
        priority: 80,
        established: true,
      });

      expect(rule.category).toBe('magic');

      const magicRules = bibleService.worldRules.getByCategory('magic');
      expect(magicRules.length).toBe(1);

      const established = bibleService.worldRules.getEstablished();
      expect(established.length).toBe(1);
    });
  });

  describe('plotThreads', () => {
    it('should track narrative promises', () => {
      const thread = bibleService.plotThreads.create({
        name: 'Main Quest',
        description: 'The hero must find the artifact.',
        type: 'main-plot',
        status: 'active',
        scope: 'book',
        priority: 100,
        involvedCharacters: [],
        relatedLocations: [],
        promises: [],
        touches: [],
        childThreads: [],
      });

      bibleService.plotThreads.addPromise(thread.id, {
        description: 'Hero will confront the villain',
        madeAt: { contentId: 'chapter-1' },
        expectedPayoff: 'long-term',
        status: 'pending',
      });

      const unfulfilled = bibleService.plotThreads.getUnfulfilledPromises(thread.id);
      expect(unfulfilled.length).toBe(1);

      const allUnfulfilled = bibleService.plotThreads.getAllUnfulfilledPromises();
      expect(allUnfulfilled.length).toBe(1);
    });
  });

  describe('timeline', () => {
    it('should track causal relationships between events', () => {
      const event1 = bibleService.timeline.createEvent({
        name: 'The Discovery',
        description: 'Ancient artifact is found.',
        position: { storyTime: 'Day 1' },
        type: 'current',
        significance: 'critical',
        involvedCharacters: [],
        locations: [],
        relatedThreads: [],
        causes: [],
        effects: [],
        revealed: true,
        contentRefs: [],
      });

      const event2 = bibleService.timeline.createEvent({
        name: 'The Conflict',
        description: 'Factions fight over the artifact.',
        position: { storyTime: 'Day 5' },
        type: 'current',
        significance: 'major',
        involvedCharacters: [],
        locations: [],
        relatedThreads: [],
        causes: [],
        effects: [],
        revealed: true,
        contentRefs: [],
      });

      bibleService.timeline.addCause(event2.id, {
        causeEventId: event1.id,
        type: 'triggers',
      });

      bibleService.timeline.addEffect(event1.id, event2.id);

      const causes = bibleService.timeline.getCauses(event2.id);
      expect(causes.length).toBe(1);
      expect(causes[0].name).toBe('The Discovery');

      const effects = bibleService.timeline.getEffects(event1.id);
      expect(effects.length).toBe(1);
      expect(effects[0].name).toBe('The Conflict');
    });
  });

  describe('graph', () => {
    it('should find connections between entities', () => {
      const char = bibleService.characters.create({
        name: 'Test Character',
        aliases: [],
        description: 'For testing.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'supporting',
        status: 'active',
      });

      const loc = bibleService.locations.create({
        name: 'Test Location',
        aliases: [],
        description: 'For testing.',
        type: 'city',
        relations: [],
        features: [],
        associatedCharacters: [char.id],
        status: 'accessible',
      });

      const nodes = bibleService.graph.getAllNodes();
      expect(nodes.length).toBeGreaterThan(0);

      const charNode = bibleService.graph.getNode(char.id, 'character');
      expect(charNode).toBeDefined();
      expect(charNode?.name).toBe('Test Character');

      // Location should be connected to character
      const locConnections = bibleService.graph.getConnectedNodes(loc.id, 'location');
      const hasCharConnection = locConnections.some(n => n.id === char.id && n.type === 'character');
      expect(hasCharConnection).toBe(true);
    });
  });

  describe('getBible', () => {
    it('should return complete bible', () => {
      bibleService.characters.create({
        name: 'Test Character',
        aliases: [],
        description: 'Test.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      const bible = bibleService.getBible();
      expect(bible.id).toBe(projectId);
      expect(bible.characters.length).toBe(1);
    });
  });

  describe('searchAll', () => {
    it('should search across entity types using manual search', () => {
      // Note: FTS-based search has a bug, but searchAll uses manual implementations
      bibleService.worldRules.create({
        name: 'Magic System',
        description: 'Rules of magic.',
        category: 'magic',
        rule: 'Magic requires focus.',
        exceptions: [],
        publicKnowledge: true,
        relatedRules: [],
        priority: 50,
        established: false,
      });

      bibleService.plotThreads.create({
        name: 'The Magic Quest',
        description: 'A quest involving magic.',
        type: 'main-plot',
        status: 'active',
        scope: 'book',
        priority: 100,
        involvedCharacters: [],
        relatedLocations: [],
        promises: [],
        touches: [],
        childThreads: [],
      });

      const results = bibleService.searchAll('magic');
      expect(results.length).toBe(2);
      expect(results.some(r => r.type === 'world-rule')).toBe(true);
      expect(results.some(r => r.type === 'plot-thread')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      bibleService.characters.create({
        name: 'Char 1',
        aliases: [],
        description: 'Test.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      bibleService.characters.create({
        name: 'Char 2',
        aliases: [],
        description: 'Test.',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      bibleService.locations.create({
        name: 'Loc 1',
        aliases: [],
        description: 'Test.',
        type: 'city',
        relations: [],
        features: [],
        associatedCharacters: [],
        status: 'accessible',
      });

      const stats = bibleService.getStats();
      expect(stats.characters).toBe(2);
      expect(stats.locations).toBe(1);
      expect(stats.factions).toBe(0);
    });
  });
});
