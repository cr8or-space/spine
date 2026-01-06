/**
 * Tests for entity registry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import { BaseEntitySchema, type EntityType, type BaseEntity } from '@repo/framework-types';

import { createEntityRegistry, defineEntityType } from './registry';

// Test entity type
const TestEntitySchema = BaseEntitySchema.extend({
  type: z.literal('test'),
  name: z.string().min(1),
  value: z.number().optional(),
});

type TestEntity = z.infer<typeof TestEntitySchema>;

const TestEntityType: EntityType<TestEntity> = {
  name: 'test',
  schema: TestEntitySchema,
  plural: 'tests',
  description: 'A test entity',
};

describe('createEntityRegistry', () => {
  let registry: ReturnType<typeof createEntityRegistry>;

  beforeEach(() => {
    registry = createEntityRegistry();
  });

  describe('register', () => {
    it('registers an entity type', () => {
      registry.register(TestEntityType);
      expect(registry.has('test')).toBe(true);
    });

    it('throws on duplicate registration', () => {
      registry.register(TestEntityType);
      expect(() => registry.register(TestEntityType)).toThrow(
        "Entity type 'test' is already registered"
      );
    });
  });

  describe('get', () => {
    it('returns registered type', () => {
      registry.register(TestEntityType);
      const type = registry.get('test');
      expect(type).toBe(TestEntityType);
    });

    it('returns null for unknown type', () => {
      const type = registry.get('unknown');
      expect(type).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns empty array initially', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('returns all registered types', () => {
      const OtherType: EntityType<BaseEntity> = {
        name: 'other',
        schema: BaseEntitySchema.extend({ type: z.literal('other') }),
        plural: 'others',
        description: 'Another type',
      };

      registry.register(TestEntityType);
      registry.register(OtherType);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(TestEntityType);
      expect(all).toContain(OtherType);
    });
  });

  describe('has', () => {
    it('returns false for unregistered type', () => {
      expect(registry.has('test')).toBe(false);
    });

    it('returns true for registered type', () => {
      registry.register(TestEntityType);
      expect(registry.has('test')).toBe(true);
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      registry.register(TestEntityType);
    });

    it('returns empty array for valid entity', () => {
      const entity: TestEntity = {
        id: '123',
        type: 'test',
        name: 'Test Entity',
      };

      const errors = registry.validate(entity);
      expect(errors).toEqual([]);
    });

    it('returns errors for invalid entity', () => {
      const entity = {
        id: '123',
        type: 'test',
        name: '', // Too short
      };

      const errors = registry.validate(entity as TestEntity);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('returns error for unknown type', () => {
      const entity = {
        id: '123',
        type: 'unknown',
        name: 'test',
      };

      const errors = registry.validate(entity);
      expect(errors).toContain('Unknown entity type: unknown');
    });
  });
});

describe('defineEntityType', () => {
  it('returns the same definition', () => {
    const def = defineEntityType(TestEntityType);
    expect(def).toBe(TestEntityType);
  });
});
