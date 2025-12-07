import { describe, it, expect } from 'vitest';

import {
  CharacterSchema,
  LocationSchema,
  WorldRuleSchema,
  BibleSchema,
  StructureSchema,
  ContentSchema,
  createEmptyBible,
  createEmptyStructure,
  createEmptyContent,
  createDefaultSettings,
} from './index';

describe('Zod schemas', () => {
  describe('CharacterSchema', () => {
    it('validates a valid character', () => {
      const character = {
        id: 'char-1',
        name: 'John Doe',
        aliases: ['Johnny', 'JD'],
        description: 'A test character',
        traits: [
          {
            category: 'personality',
            name: 'brave',
            description: 'Always ready to face danger',
          },
        ],
        relationships: [],
        voiceSamples: ['Hello there!'],
        appearances: [],
        role: 'protagonist',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = CharacterSchema.safeParse(character);
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const character = {
        id: 'char-1',
        name: 'John Doe',
        aliases: [],
        description: 'A test character',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'invalid-role',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = CharacterSchema.safeParse(character);
      expect(result.success).toBe(false);
    });
  });

  describe('LocationSchema', () => {
    it('validates a valid location', () => {
      const location = {
        id: 'loc-1',
        name: 'Test City',
        aliases: [],
        description: 'A test location',
        type: 'city',
        relations: [],
        features: [],
        associatedCharacters: [],
        status: 'accessible',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = LocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });
  });

  describe('WorldRuleSchema', () => {
    it('validates a valid world rule', () => {
      const rule = {
        id: 'rule-1',
        name: 'Magic System',
        description: 'How magic works in this world',
        category: 'magic',
        rule: 'Magic requires energy from the caster',
        exceptions: [],
        relatedRules: [],
        priority: 50,
        publicKnowledge: true,
        established: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = WorldRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });
  });
});

describe('Factory functions', () => {
  describe('createEmptyBible', () => {
    it('creates a valid empty bible', () => {
      const bible = createEmptyBible('bible-1');

      expect(bible.id).toBe('bible-1');
      expect(bible.characters).toHaveLength(0);
      expect(bible.locations).toHaveLength(0);
      expect(bible.factions).toHaveLength(0);
      expect(bible.worldRules).toHaveLength(0);
      expect(bible.plotThreads).toHaveLength(0);
      expect(bible.timelineEvents).toHaveLength(0);

      const result = BibleSchema.safeParse(bible);
      expect(result.success).toBe(true);
    });
  });

  describe('createEmptyStructure', () => {
    it('creates a valid empty structure', () => {
      const structure = createEmptyStructure('struct-1', 'book', 'My Novel');

      expect(structure.id).toBe('struct-1');
      expect(structure.type).toBe('book');
      expect(structure.title).toBe('My Novel');
      expect(structure.children).toHaveLength(0);
      expect(structure.beats).toHaveLength(0);

      const result = StructureSchema.safeParse(structure);
      expect(result.success).toBe(true);
    });
  });

  describe('createEmptyContent', () => {
    it('creates a valid empty content', () => {
      const content = createEmptyContent('content-1', 'struct-1');

      expect(content.id).toBe('content-1');
      expect(content.structureId).toBe('struct-1');
      expect(content.currentVersion).toBe(1);
      expect(content.versions).toHaveLength(1);
      expect(content.status).toBe('draft');

      const result = ContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    });
  });

  describe('createDefaultSettings', () => {
    it('creates settings for web-serial with serial config', () => {
      const settings = createDefaultSettings('web-serial');

      expect(settings.serial).toBeDefined();
      expect(settings.serial?.cycleLength).toBe(5);
      expect(settings.serial?.minimumBuffer).toBe(5);
    });

    it('creates settings for light-novel without serial config', () => {
      const settings = createDefaultSettings('light-novel');

      expect(settings.serial).toBeUndefined();
    });
  });
});
