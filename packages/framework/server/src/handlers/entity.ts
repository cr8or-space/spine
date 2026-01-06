/**
 * Generic Entity Handlers
 *
 * Framework-level handlers for entity CRUD operations.
 * Works with any domain entity type through the generic entity repository.
 */

import { z } from 'zod';

import type { Router } from '../router';
import { ApiError } from '../router';
import type { BaseServices } from '../types';
import type { SessionManager } from '../session';
import { createSessionContext } from '../session';

// ============================================================================
// Parameter Schemas
// ============================================================================

const EntityListParamsSchema = z.object({
  projectId: z.string().optional(),
  type: z.string(),
  includeRetired: z.boolean().optional().default(false),
  includeArchived: z.boolean().optional().default(false),
});

const EntityGetParamsSchema = z.object({
  projectId: z.string().optional(),
  type: z.string(),
  id: z.string(),
});

const EntityCreateParamsSchema = z.object({
  projectId: z.string().optional(),
  type: z.string(),
  data: z.record(z.unknown()),
});

const EntityUpdateParamsSchema = z.object({
  projectId: z.string().optional(),
  type: z.string(),
  id: z.string(),
  data: z.record(z.unknown()),
});

const EntityDeleteParamsSchema = z.object({
  projectId: z.string().optional(),
  type: z.string(),
  id: z.string(),
  confirm: z.boolean().optional().default(false),
});

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register generic entity handlers.
 *
 * These handlers provide CRUD operations for any entity type.
 * Domains can use these directly or create type-specific wrappers.
 */
export function registerEntityHandlers(
  router: Router,
  services: BaseServices,
  sessionManager: SessionManager
): void {
  // entity.list - List entities by type
  router.register(
    'entity.list',
    (params, context) => {
      const validated = EntityListParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      const entities = services.entities.findByType(projectId, validated.type);

      // Filter by lifecycle
      return entities.filter((stored) => {
        if (!validated.includeRetired && stored.lifecycle === 'retired') {
          return false;
        }
        if (!validated.includeArchived && stored.lifecycle === 'archived') {
          return false;
        }
        return true;
      });
    },
    EntityListParamsSchema
  );

  // entity.get - Get a single entity
  router.register(
    'entity.get',
    (params, context) => {
      const validated = EntityGetParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      const stored = services.entities.findById(projectId, validated.id);
      if (!stored) {
        throw ApiError.entityNotFound(validated.type, validated.id);
      }

      // Verify type matches
      if (stored.entity.type !== validated.type) {
        throw ApiError.entityNotFound(validated.type, validated.id);
      }

      return stored;
    },
    EntityGetParamsSchema
  );

  // entity.create - Create a new entity
  router.register(
    'entity.create',
    (params, context) => {
      const validated = EntityCreateParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      // Construct entity with required fields
      const entity = {
        id: '', // Will be generated
        type: validated.type,
        ...validated.data,
      };

      const stored = services.entities.create(projectId, entity);
      return stored;
    },
    EntityCreateParamsSchema
  );

  // entity.update - Update an existing entity
  router.register(
    'entity.update',
    (params, context) => {
      const validated = EntityUpdateParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      // Verify entity exists and is correct type
      const existing = services.entities.findById(projectId, validated.id);
      if (!existing) {
        throw ApiError.entityNotFound(validated.type, validated.id);
      }
      if (existing.entity.type !== validated.type) {
        throw ApiError.entityNotFound(validated.type, validated.id);
      }

      const updated = services.entities.update(projectId, validated.id, validated.data);
      if (!updated) {
        throw ApiError.databaseError('Failed to update entity');
      }

      return updated;
    },
    EntityUpdateParamsSchema
  );

  // entity.delete - Delete an entity
  router.register(
    'entity.delete',
    (params, context) => {
      const validated = EntityDeleteParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      // Require confirmation for deletions
      if (!validated.confirm) {
        throw ApiError.validationError(
          'Deletion requires confirmation. Set confirm: true to proceed.',
          { requiresConfirmation: true }
        );
      }

      // Verify entity exists
      const existing = services.entities.findById(projectId, validated.id);
      if (!existing) {
        throw ApiError.entityNotFound(validated.type, validated.id);
      }
      if (existing.entity.type !== validated.type) {
        throw ApiError.entityNotFound(validated.type, validated.id);
      }

      const deleted = services.entities.delete(projectId, validated.id);
      if (!deleted) {
        throw ApiError.databaseError('Failed to delete entity');
      }

      return { deleted: true, id: validated.id };
    },
    EntityDeleteParamsSchema
  );
}
