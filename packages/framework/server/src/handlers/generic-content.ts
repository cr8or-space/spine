/**
 * Generic Content Handlers
 *
 * Framework-level handlers for content CRUD operations.
 * Works with any domain content type through the generic content repository.
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

const ContentGetParamsSchema = z.object({
  projectId: z.string().optional(),
  spineNodeId: z.string(),
});

const ContentListParamsSchema = z.object({
  projectId: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(['draft', 'review', 'approved', 'published']).optional(),
  spineNodeId: z.string().optional(),
});

const ContentCreateParamsSchema = z.object({
  projectId: z.string().optional(),
  type: z.string(),
  spineNodeId: z.string(),
  data: z.record(z.unknown()),
});

const ContentUpdateParamsSchema = z.object({
  projectId: z.string().optional(),
  id: z.string(),
  data: z.record(z.unknown()),
});

const ContentUpdateStatusParamsSchema = z.object({
  projectId: z.string().optional(),
  id: z.string(),
  status: z.enum(['draft', 'review', 'approved', 'published']),
});

const ContentGetByIdParamsSchema = z.object({
  projectId: z.string().optional(),
  id: z.string(),
});

const ContentDeleteParamsSchema = z.object({
  projectId: z.string().optional(),
  id: z.string(),
  confirm: z.boolean().optional().default(false),
});

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register generic content handlers.
 *
 * These handlers provide CRUD operations for any content type.
 * Domains can use these directly or create type-specific wrappers.
 */
export function registerGenericContentHandlers(
  router: Router,
  services: BaseServices,
  sessionManager: SessionManager
): void {
  // content.list - List content with optional filters
  router.register(
    'content.list',
    (params, context) => {
      const validated = ContentListParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      return services.content.findByProject(projectId, {
        type: validated.type,
        status: validated.status,
        spineNodeId: validated.spineNodeId,
      });
    },
    ContentListParamsSchema
  );

  // content.get - Get content for a spine node
  router.register(
    'content.get',
    (params, context) => {
      const validated = ContentGetParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      const contents = services.content.findBySpineNode(projectId, validated.spineNodeId);
      return contents.length > 0 ? contents[0] : null;
    },
    ContentGetParamsSchema
  );

  // content.getById - Get content by ID
  router.register(
    'content.getById',
    (params, context) => {
      const validated = ContentGetByIdParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      const stored = services.content.findById(projectId, validated.id);
      if (!stored) {
        throw ApiError.entityNotFound('Content', validated.id);
      }

      return stored;
    },
    ContentGetByIdParamsSchema
  );

  // content.create - Create new content
  router.register(
    'content.create',
    (params, context) => {
      const validated = ContentCreateParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      // Construct content with required fields
      const content = {
        id: '', // Will be generated
        type: validated.type,
        spineNode: validated.spineNodeId,
        status: 'draft' as const,
        references: [],
        ...validated.data,
      };

      return services.content.create(projectId, content);
    },
    ContentCreateParamsSchema
  );

  // content.update - Update existing content
  router.register(
    'content.update',
    (params, context) => {
      const validated = ContentUpdateParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      const updated = services.content.update(projectId, validated.id, validated.data);
      if (!updated) {
        throw ApiError.entityNotFound('Content', validated.id);
      }

      return updated;
    },
    ContentUpdateParamsSchema
  );

  // content.updateStatus - Update content status
  router.register(
    'content.updateStatus',
    (params, context) => {
      const validated = ContentUpdateStatusParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      const success = services.content.updateStatus(projectId, validated.id, validated.status);
      if (!success) {
        throw ApiError.entityNotFound('Content', validated.id);
      }

      return { success: true, id: validated.id, status: validated.status };
    },
    ContentUpdateStatusParamsSchema
  );

  // content.delete - Delete content
  router.register(
    'content.delete',
    (params, context) => {
      const validated = ContentDeleteParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);
      const projectId = validated.projectId ?? session.requireProject();

      // Require confirmation
      if (!validated.confirm) {
        throw ApiError.validationError(
          'Deletion requires confirmation. Set confirm: true to proceed.',
          { requiresConfirmation: true }
        );
      }

      const deleted = services.content.delete(projectId, validated.id);
      if (!deleted) {
        throw ApiError.entityNotFound('Content', validated.id);
      }

      return { deleted: true, id: validated.id };
    },
    ContentDeleteParamsSchema
  );
}
