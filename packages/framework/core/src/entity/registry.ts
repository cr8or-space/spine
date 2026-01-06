/**
 * Entity Registry - Type registration and validation for domain entities.
 *
 * Domains register their entity types here. The framework uses the registry
 * to validate entities without knowing their specific types.
 */

import type { z } from 'zod';

import type { BaseEntity, EntityType, EntityRegistry } from '@repo/framework-types';

/**
 * Create an entity registry for managing entity type definitions.
 */
export function createEntityRegistry(): EntityRegistry {
  const types = new Map<string, EntityType>();

  return {
    register<T extends BaseEntity>(entityType: EntityType<T>): void {
      if (types.has(entityType.name)) {
        throw new Error(`Entity type '${entityType.name}' is already registered`);
      }
      types.set(entityType.name, entityType as EntityType);
    },

    get(name: string): EntityType | null {
      return types.get(name) ?? null;
    },

    getAll(): EntityType[] {
      return Array.from(types.values());
    },

    has(name: string): boolean {
      return types.has(name);
    },

    validate(entity: BaseEntity): string[] {
      const entityType = types.get(entity.type);
      if (!entityType) {
        return [`Unknown entity type: ${entity.type}`];
      }

      const result = entityType.schema.safeParse(entity);
      if (result.success) {
        return [];
      }

      return formatZodErrors(result.error);
    },
  };
}

/**
 * Format Zod validation errors into human-readable strings.
 */
function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map((e: z.ZodIssue) => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  });
}

/**
 * Helper to create an entity type definition.
 * This provides better type inference than creating the object directly.
 */
export function defineEntityType<T extends BaseEntity>(definition: EntityType<T>): EntityType<T> {
  return definition;
}
