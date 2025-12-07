/**
 * Character repository tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { Relationship } from '@repo/types';

import { createTestDatabase, type DatabaseConnection } from '../database';
import { createCharacterRepository, type CharacterRepository } from './character-repository';

describe('CharacterRepository', () => {
  let db: DatabaseConnection;
  let repo: CharacterRepository;
  const projectId = 'test-project';

  beforeEach(() => {
    db = createTestDatabase();

    // Create a test project
    db.db
      .prepare(
        `
      INSERT INTO projects (id, title, format, settings_json, metadata_json, created_at, updated_at)
      VALUES (?, 'Test Project', 'web-serial', '{}', '{"genres":[]}', datetime('now'), datetime('now'))
    `
      )
      .run(projectId);

    repo = createCharacterRepository(db.db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a character with all fields', () => {
      const character = repo.create(projectId, {
        name: 'John Doe',
        aliases: ['JD', 'Johnny'],
        description: 'A test character',
        traits: [
          { category: 'personality', name: 'brave', description: 'Never backs down' },
          { category: 'physical', name: 'tall', description: '6 feet' },
        ],
        relationships: [],
        arc: {
          type: 'positive-change',
          startingPoint: 'Coward',
          destination: 'Hero',
          progress: 0,
          milestones: [],
        },
        voiceSamples: ['"I will fight!"'],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      expect(character.id).toBeDefined();
      expect(character.name).toBe('John Doe');
      expect(character.aliases).toEqual(['JD', 'Johnny']);
      expect(character.traits).toHaveLength(2);
      expect(character.arc?.type).toBe('positive-change');
      expect(character.role).toBe('protagonist');
      expect(character.createdAt).toBeDefined();
      expect(character.updatedAt).toBeDefined();
    });

    it('should generate unique IDs', () => {
      const char1 = repo.create(projectId, {
        name: 'Character 1',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      const char2 = repo.create(projectId, {
        name: 'Character 2',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      expect(char1.id).not.toBe(char2.id);
    });
  });

  describe('findById', () => {
    it('should find existing character', () => {
      const created = repo.create(projectId, {
        name: 'Test',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      const found = repo.findById(projectId, created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test');
    });

    it('should return undefined for non-existent character', () => {
      const found = repo.findById(projectId, 'nonexistent');
      expect(found).toBeUndefined();
    });

    it('should not find character from different project', () => {
      const created = repo.create(projectId, {
        name: 'Test',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      const found = repo.findById('other-project', created.id);
      expect(found).toBeUndefined();
    });
  });

  describe('findByProject', () => {
    it('should return all characters in a project', () => {
      repo.create(projectId, {
        name: 'Char 1',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      repo.create(projectId, {
        name: 'Char 2',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'antagonist',
        status: 'active',
      });

      const characters = repo.findByProject(projectId);
      expect(characters).toHaveLength(2);
    });

    it('should return empty array for empty project', () => {
      const characters = repo.findByProject(projectId);
      expect(characters).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update character fields', () => {
      const created = repo.create(projectId, {
        name: 'Original',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      const updated = repo.update(projectId, created.id, {
        name: 'Updated',
        role: 'major',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.role).toBe('major');
      // updatedAt should be set (may be same if operation is fast enough)
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should preserve unchanged fields', () => {
      const created = repo.create(projectId, {
        name: 'Test',
        aliases: ['Alias1', 'Alias2'],
        description: 'Description',
        traits: [{ category: 'personality', name: 'trait', description: 'desc' }],
        relationships: [],
        voiceSamples: ['sample'],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      const updated = repo.update(projectId, created.id, { name: 'New Name' });

      expect(updated?.name).toBe('New Name');
      expect(updated?.aliases).toEqual(['Alias1', 'Alias2']);
      expect(updated?.traits).toHaveLength(1);
      expect(updated?.voiceSamples).toEqual(['sample']);
    });

    it('should return undefined for non-existent character', () => {
      const updated = repo.update(projectId, 'nonexistent', { name: 'New' });
      expect(updated).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete existing character', () => {
      const created = repo.create(projectId, {
        name: 'Test',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      const deleted = repo.delete(projectId, created.id);
      expect(deleted).toBe(true);

      const found = repo.findById(projectId, created.id);
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent character', () => {
      const deleted = repo.delete(projectId, 'nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('findByRole', () => {
    it('should find characters by role', () => {
      repo.create(projectId, {
        name: 'Hero',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      repo.create(projectId, {
        name: 'Villain',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'antagonist',
        status: 'active',
      });

      repo.create(projectId, {
        name: 'Hero 2',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      const protagonists = repo.findByRole(projectId, 'protagonist');
      expect(protagonists).toHaveLength(2);
      expect(protagonists.every((c) => c.role === 'protagonist')).toBe(true);
    });
  });

  describe('findByStatus', () => {
    it('should find characters by status', () => {
      repo.create(projectId, {
        name: 'Alive',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      repo.create(projectId, {
        name: 'Dead',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'deceased',
      });

      const active = repo.findByStatus(projectId, 'active');
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Alive');
    });
  });

  describe('addRelationship', () => {
    it('should add a relationship to a character', () => {
      const char1 = repo.create(projectId, {
        name: 'Character 1',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      const char2 = repo.create(projectId, {
        name: 'Character 2',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      const relationship: Relationship = {
        targetId: char2.id,
        type: 'friend',
        description: 'Best friends',
        intensity: 80,
        mutual: true,
      };

      const updated = repo.addRelationship(projectId, char1.id, relationship);
      expect(updated?.relationships).toHaveLength(1);
      expect(updated?.relationships[0].targetId).toBe(char2.id);
    });

    it('should replace existing relationship with same target', () => {
      const char1 = repo.create(projectId, {
        name: 'Character 1',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      const char2 = repo.create(projectId, {
        name: 'Character 2',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      repo.addRelationship(projectId, char1.id, {
        targetId: char2.id,
        type: 'friend',
        description: 'Friends',
        intensity: 50,
        mutual: true,
      });

      const updated = repo.addRelationship(projectId, char1.id, {
        targetId: char2.id,
        type: 'enemy',
        description: 'Now enemies',
        intensity: -80,
        mutual: true,
      });

      expect(updated?.relationships).toHaveLength(1);
      expect(updated?.relationships[0].type).toBe('enemy');
    });
  });

  describe('updateArc', () => {
    it('should update character arc', () => {
      const character = repo.create(projectId, {
        name: 'Test',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      const updated = repo.updateArc(projectId, character.id, {
        type: 'redemption',
        startingPoint: 'Villain',
        destination: 'Anti-hero',
        progress: 25,
        milestones: [],
      });

      expect(updated?.arc?.type).toBe('redemption');
      expect(updated?.arc?.progress).toBe(25);
    });

    it('should remove arc when set to undefined', () => {
      const character = repo.create(projectId, {
        name: 'Test',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        arc: {
          type: 'positive-change',
          startingPoint: 'Start',
          destination: 'End',
          progress: 0,
          milestones: [],
        },
        voiceSamples: [],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      const updated = repo.updateArc(projectId, character.id, undefined);
      expect(updated?.arc).toBeUndefined();
    });
  });

  describe('deleteByProject', () => {
    it('should delete all characters in a project', () => {
      repo.create(projectId, {
        name: 'Char 1',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      repo.create(projectId, {
        name: 'Char 2',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      const deleted = repo.deleteByProject(projectId);
      expect(deleted).toBe(2);

      const remaining = repo.findByProject(projectId);
      expect(remaining).toHaveLength(0);
    });
  });
});
