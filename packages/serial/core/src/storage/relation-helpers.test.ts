/**
 * Unit tests for relation-helpers.ts
 */

import { describe, expect, it } from 'vitest';

import {
  addIfNotPresent,
  addObjectIfNotPresent,
  appendToArray,
  removeFromArray,
  removePrimitive,
  upsertInArray,
} from './relation-helpers';

// Test entity types
interface TestEntity {
  id: string;
  tags: string[];
  items: Array<{ id: string; value: number }>;
  relations: Array<{ targetId: string; type: string }>;
}

function createTestEntity(overrides: Partial<TestEntity> = {}): TestEntity {
  return {
    id: 'entity-1',
    tags: [],
    items: [],
    relations: [],
    ...overrides,
  };
}

describe('relation-helpers', () => {
  describe('appendToArray', () => {
    it('should append item to empty array', () => {
      const entity = createTestEntity();
      let updatedData: Partial<TestEntity> | undefined;

      const result = appendToArray({
        entity,
        field: 'items',
        item: { id: 'item-1', value: 100 },
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(result).toBeDefined();
      expect(updatedData).toEqual({ items: [{ id: 'item-1', value: 100 }] });
    });

    it('should append item to existing array', () => {
      const entity = createTestEntity({
        items: [{ id: 'item-1', value: 50 }],
      });
      let updatedData: Partial<TestEntity> | undefined;

      appendToArray({
        entity,
        field: 'items',
        item: { id: 'item-2', value: 100 },
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({
        items: [
          { id: 'item-1', value: 50 },
          { id: 'item-2', value: 100 },
        ],
      });
    });

    it('should allow duplicates', () => {
      const entity = createTestEntity({
        items: [{ id: 'item-1', value: 50 }],
      });
      let updatedData: Partial<TestEntity> | undefined;

      appendToArray({
        entity,
        field: 'items',
        item: { id: 'item-1', value: 50 },
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({
        items: [
          { id: 'item-1', value: 50 },
          { id: 'item-1', value: 50 },
        ],
      });
    });
  });

  describe('upsertInArray', () => {
    it('should add item to empty array', () => {
      const entity = createTestEntity();
      let updatedData: Partial<TestEntity> | undefined;

      upsertInArray({
        entity,
        field: 'relations',
        item: { targetId: 'target-1', type: 'friend' },
        getKey: (r) => r.targetId,
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({
        relations: [{ targetId: 'target-1', type: 'friend' }],
      });
    });

    it('should append item when key not found', () => {
      const entity = createTestEntity({
        relations: [{ targetId: 'target-1', type: 'friend' }],
      });
      let updatedData: Partial<TestEntity> | undefined;

      upsertInArray({
        entity,
        field: 'relations',
        item: { targetId: 'target-2', type: 'enemy' },
        getKey: (r) => r.targetId,
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({
        relations: [
          { targetId: 'target-1', type: 'friend' },
          { targetId: 'target-2', type: 'enemy' },
        ],
      });
    });

    it('should replace item when key matches', () => {
      const entity = createTestEntity({
        relations: [
          { targetId: 'target-1', type: 'friend' },
          { targetId: 'target-2', type: 'neutral' },
        ],
      });
      let updatedData: Partial<TestEntity> | undefined;

      upsertInArray({
        entity,
        field: 'relations',
        item: { targetId: 'target-1', type: 'enemy' },
        getKey: (r) => r.targetId,
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({
        relations: [
          { targetId: 'target-2', type: 'neutral' },
          { targetId: 'target-1', type: 'enemy' },
        ],
      });
    });
  });

  describe('addIfNotPresent', () => {
    it('should add item to empty array', () => {
      const entity = createTestEntity();
      let updatedData: Partial<TestEntity> | undefined;
      let updateCalled = false;

      addIfNotPresent({
        entity,
        field: 'tags',
        item: 'new-tag',
        update: (data) => {
          updateCalled = true;
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updateCalled).toBe(true);
      expect(updatedData).toEqual({ tags: ['new-tag'] });
    });

    it('should add item when not present', () => {
      const entity = createTestEntity({
        tags: ['existing-tag'],
      });
      let updatedData: Partial<TestEntity> | undefined;

      addIfNotPresent({
        entity,
        field: 'tags',
        item: 'new-tag',
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({ tags: ['existing-tag', 'new-tag'] });
    });

    it('should return entity unchanged when item already present', () => {
      const entity = createTestEntity({
        tags: ['existing-tag'],
      });
      let updateCalled = false;

      const result = addIfNotPresent({
        entity,
        field: 'tags',
        item: 'existing-tag',
        update: () => {
          updateCalled = true;
          return entity;
        },
      });

      expect(updateCalled).toBe(false);
      expect(result).toBe(entity);
    });
  });

  describe('addObjectIfNotPresent', () => {
    it('should add object to empty array', () => {
      const entity = createTestEntity();
      let updatedData: Partial<TestEntity> | undefined;

      addObjectIfNotPresent({
        entity,
        field: 'items',
        item: { id: 'item-1', value: 100 },
        getKey: (i) => i.id,
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({ items: [{ id: 'item-1', value: 100 }] });
    });

    it('should add object when key not found', () => {
      const entity = createTestEntity({
        items: [{ id: 'item-1', value: 50 }],
      });
      let updatedData: Partial<TestEntity> | undefined;

      addObjectIfNotPresent({
        entity,
        field: 'items',
        item: { id: 'item-2', value: 100 },
        getKey: (i) => i.id,
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({
        items: [
          { id: 'item-1', value: 50 },
          { id: 'item-2', value: 100 },
        ],
      });
    });

    it('should return entity unchanged when key already exists', () => {
      const entity = createTestEntity({
        items: [{ id: 'item-1', value: 50 }],
      });
      let updateCalled = false;

      const result = addObjectIfNotPresent({
        entity,
        field: 'items',
        item: { id: 'item-1', value: 100 },
        getKey: (i) => i.id,
        update: () => {
          updateCalled = true;
          return entity;
        },
      });

      expect(updateCalled).toBe(false);
      expect(result).toBe(entity);
    });
  });

  describe('removeFromArray', () => {
    it('should remove item by key', () => {
      const entity = createTestEntity({
        relations: [
          { targetId: 'target-1', type: 'friend' },
          { targetId: 'target-2', type: 'enemy' },
        ],
      });
      let updatedData: Partial<TestEntity> | undefined;

      removeFromArray({
        entity,
        field: 'relations',
        getKey: (r) => r.targetId,
        keyToRemove: 'target-1',
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({
        relations: [{ targetId: 'target-2', type: 'enemy' }],
      });
    });

    it('should return empty array when removing last item', () => {
      const entity = createTestEntity({
        relations: [{ targetId: 'target-1', type: 'friend' }],
      });
      let updatedData: Partial<TestEntity> | undefined;

      removeFromArray({
        entity,
        field: 'relations',
        getKey: (r) => r.targetId,
        keyToRemove: 'target-1',
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({ relations: [] });
    });

    it('should leave array unchanged when key not found', () => {
      const entity = createTestEntity({
        relations: [{ targetId: 'target-1', type: 'friend' }],
      });
      let updatedData: Partial<TestEntity> | undefined;

      removeFromArray({
        entity,
        field: 'relations',
        getKey: (r) => r.targetId,
        keyToRemove: 'nonexistent',
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({
        relations: [{ targetId: 'target-1', type: 'friend' }],
      });
    });
  });

  describe('removePrimitive', () => {
    it('should remove string from array', () => {
      const entity = createTestEntity({
        tags: ['tag-1', 'tag-2', 'tag-3'],
      });
      let updatedData: Partial<TestEntity> | undefined;

      removePrimitive({
        entity,
        field: 'tags',
        item: 'tag-2',
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({ tags: ['tag-1', 'tag-3'] });
    });

    it('should leave array unchanged when item not found', () => {
      const entity = createTestEntity({
        tags: ['tag-1', 'tag-2'],
      });
      let updatedData: Partial<TestEntity> | undefined;

      removePrimitive({
        entity,
        field: 'tags',
        item: 'nonexistent',
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({ tags: ['tag-1', 'tag-2'] });
    });

    it('should return empty array when removing last item', () => {
      const entity = createTestEntity({
        tags: ['only-tag'],
      });
      let updatedData: Partial<TestEntity> | undefined;

      removePrimitive({
        entity,
        field: 'tags',
        item: 'only-tag',
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      expect(updatedData).toEqual({ tags: [] });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined return from update callback', () => {
      const entity = createTestEntity();

      const result = appendToArray({
        entity,
        field: 'tags',
        item: 'new-tag',
        update: () => undefined,
      });

      expect(result).toBeUndefined();
    });

    it('should preserve other entity fields', () => {
      const entity = createTestEntity({
        id: 'custom-id',
        tags: ['existing'],
        items: [{ id: 'item-1', value: 50 }],
      });
      let updatedData: Partial<TestEntity> | undefined;

      appendToArray({
        entity,
        field: 'tags',
        item: 'new-tag',
        update: (data) => {
          updatedData = data;
          return { ...entity, ...data } as TestEntity;
        },
      });

      // Only the tags field should be in the update data
      expect(updatedData).toEqual({ tags: ['existing', 'new-tag'] });
      expect(updatedData).not.toHaveProperty('id');
      expect(updatedData).not.toHaveProperty('items');
    });
  });
});
