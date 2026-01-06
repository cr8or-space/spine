/**
 * Tests for entity repository.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { BaseEntity } from '@repo/framework-types';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createEntityRepository, type EntityRepository } from './repository';

interface TestEntity extends BaseEntity {
  type: 'test';
  name: string;
  value?: number;
}

describe('EntityRepository', () => {
  let db: DatabaseConnection;
  let repo: EntityRepository;
  const projectId = 'test-project';

  beforeEach(() => {
    db = createTestDatabase();
    repo = createEntityRepository(db.db);

    // Create test project
    db.db
      .prepare(
        `INSERT INTO projects (id, name, domain, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      )
      .run(projectId, 'Test Project', 'test');
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('creates entity with provided data', () => {
      const entity: TestEntity = {
        id: 'entity-1',
        type: 'test',
        name: 'Test Entity',
        value: 42,
      };

      const stored = repo.create(projectId, entity);

      expect(stored.entity.id).toBe('entity-1');
      expect(stored.entity.type).toBe('test');
      expect(stored.entity.name).toBe('Test Entity');
      expect((stored.entity as TestEntity).value).toBe(42);
      expect(stored.projectId).toBe(projectId);
      expect(stored.lifecycle).toBe('active');
    });

    it('generates ID if not provided', () => {
      const entity = {
        id: '',
        type: 'test',
        name: 'Auto ID',
      } as TestEntity;

      const stored = repo.create(projectId, entity);
      expect(stored.entity.id).toBeTruthy();
      expect(stored.entity.id).not.toBe('');
    });

    it('stores spine positions', () => {
      const entity: TestEntity = {
        id: 'entity-1',
        type: 'test',
        name: 'Positioned',
        introducedAt: { nodeId: 'chapter-1', order: 5 },
      };

      const stored = repo.create(projectId, entity);
      expect(stored.entity.introducedAt).toEqual({ nodeId: 'chapter-1', order: 5 });
    });
  });

  describe('findById', () => {
    it('returns entity by ID', () => {
      const entity: TestEntity = { id: 'find-me', type: 'test', name: 'Find Me' };
      repo.create(projectId, entity);

      const found = repo.findById<TestEntity>(projectId, 'find-me');
      expect(found).toBeDefined();
      expect(found?.entity.name).toBe('Find Me');
    });

    it('returns undefined for non-existent ID', () => {
      const found = repo.findById(projectId, 'not-found');
      expect(found).toBeUndefined();
    });

    it('returns undefined for wrong project', () => {
      const entity: TestEntity = { id: 'entity-1', type: 'test', name: 'Test' };
      repo.create(projectId, entity);

      const found = repo.findById('other-project', 'entity-1');
      expect(found).toBeUndefined();
    });
  });

  describe('findByProject', () => {
    beforeEach(() => {
      repo.create(projectId, { id: 'e1', type: 'test', name: 'Entity 1' } as TestEntity);
      repo.create(projectId, { id: 'e2', type: 'other', name: 'Entity 2' } as BaseEntity);
      repo.create(projectId, { id: 'e3', type: 'test', name: 'Entity 3' } as TestEntity);
    });

    it('returns all entities in project', () => {
      const entities = repo.findByProject(projectId);
      expect(entities).toHaveLength(3);
    });

    it('filters by type', () => {
      const entities = repo.findByProject(projectId, { type: 'test' });
      expect(entities).toHaveLength(2);
      expect(entities.every((e) => e.entity.type === 'test')).toBe(true);
    });

    it('excludes retired by default', () => {
      repo.updateLifecycle(projectId, 'e1', 'retired');
      const entities = repo.findByProject(projectId);
      expect(entities).toHaveLength(2);
    });

    it('includes retired when requested', () => {
      repo.updateLifecycle(projectId, 'e1', 'retired');
      const entities = repo.findByProject(projectId, { includeRetired: true });
      expect(entities).toHaveLength(3);
    });
  });

  describe('findByType', () => {
    it('returns entities of specific type', () => {
      repo.create(projectId, { id: 'e1', type: 'test', name: 'Test 1' } as TestEntity);
      repo.create(projectId, { id: 'e2', type: 'other', name: 'Other' } as BaseEntity);

      const entities = repo.findByType<TestEntity>(projectId, 'test');
      expect(entities).toHaveLength(1);
      expect(entities[0].entity.type).toBe('test');
    });
  });

  describe('update', () => {
    it('updates entity data', () => {
      const entity: TestEntity = { id: 'update-me', type: 'test', name: 'Original', value: 1 };
      repo.create(projectId, entity);

      const updated = repo.update<TestEntity>(projectId, 'update-me', { name: 'Updated', value: 2 });

      expect(updated?.entity.name).toBe('Updated');
      expect(updated?.entity.value).toBe(2);
    });

    it('returns undefined for non-existent entity', () => {
      const updated = repo.update<TestEntity>(projectId, 'not-found', { name: 'New' });
      expect(updated).toBeUndefined();
    });

    it('preserves updatedAt field', () => {
      const entity: TestEntity = { id: 'e1', type: 'test', name: 'Test' };
      repo.create(projectId, entity);

      const updated = repo.update<TestEntity>(projectId, 'e1', { name: 'Updated' });

      // updatedAt should be a valid timestamp string
      expect(updated?.updatedAt).toBeDefined();
      expect(new Date(updated!.updatedAt).getTime()).not.toBeNaN();
    });
  });

  describe('updateLifecycle', () => {
    it('updates lifecycle to retired with position', () => {
      const entity: TestEntity = { id: 'e1', type: 'test', name: 'Test' };
      repo.create(projectId, entity);

      const success = repo.updateLifecycle(projectId, 'e1', 'retired', {
        nodeId: 'chapter-10',
        order: 0,
      });

      expect(success).toBe(true);

      const found = repo.findById<TestEntity>(projectId, 'e1');
      expect(found?.lifecycle).toBe('retired');
      expect(found?.entity.retiredAt).toEqual({ nodeId: 'chapter-10', order: 0 });
    });

    it('updates lifecycle to archived', () => {
      const entity: TestEntity = { id: 'e1', type: 'test', name: 'Test' };
      repo.create(projectId, entity);

      repo.updateLifecycle(projectId, 'e1', 'archived');

      const found = repo.findById<TestEntity>(projectId, 'e1');
      expect(found?.lifecycle).toBe('archived');
    });

    it('returns false for non-existent entity', () => {
      const success = repo.updateLifecycle(projectId, 'not-found', 'retired');
      expect(success).toBe(false);
    });
  });

  describe('delete', () => {
    it('deletes entity', () => {
      const entity: TestEntity = { id: 'delete-me', type: 'test', name: 'Delete' };
      repo.create(projectId, entity);

      const success = repo.delete(projectId, 'delete-me');
      expect(success).toBe(true);

      const found = repo.findById(projectId, 'delete-me');
      expect(found).toBeUndefined();
    });

    it('returns false for non-existent entity', () => {
      const success = repo.delete(projectId, 'not-found');
      expect(success).toBe(false);
    });
  });

  describe('deleteByProject', () => {
    it('deletes all entities for project', () => {
      repo.create(projectId, { id: 'e1', type: 'test', name: 'E1' } as TestEntity);
      repo.create(projectId, { id: 'e2', type: 'test', name: 'E2' } as TestEntity);

      const count = repo.deleteByProject(projectId);
      expect(count).toBe(2);

      const remaining = repo.findByProject(projectId);
      expect(remaining).toHaveLength(0);
    });
  });
});
