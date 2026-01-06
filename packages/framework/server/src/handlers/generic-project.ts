/**
 * Generic Project Handlers
 *
 * Framework-level handlers for project operations.
 * Works with any domain's project service through the ProjectService interface.
 */

import { z } from 'zod';

import type { Router } from '../router';
import { ApiError } from '../router';
import type { ProjectService, BaseProject } from '../types';
import type { SessionManager } from '../session';
import { createSessionContext } from '../session';

// ============================================================================
// Parameter Schemas
// ============================================================================

const ProjectCreateParamsSchema = z.object({
  title: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const ProjectIdParamsSchema = z.object({
  id: z.string(),
});

const ProjectUpdateParamsSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ProjectDeleteParamsSchema = z.object({
  id: z.string(),
  confirm: z.boolean().optional().default(false),
});

const ProjectUpdateMetadataParamsSchema = z.object({
  id: z.string(),
  metadata: z.record(z.unknown()),
});

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register generic project handlers.
 *
 * These handlers work with any domain's project service.
 * The domain must provide a ProjectService that implements the interface.
 *
 * @param router - Router to register handlers on
 * @param projectService - Domain-provided project service
 * @param sessionManager - Session manager
 */
export function registerGenericProjectHandlers<TProject extends BaseProject>(
  router: Router,
  projectService: ProjectService<TProject>,
  sessionManager: SessionManager
): void {
  // project.list - List all projects
  router.register('project.list', () => {
    return projectService.list();
  });

  // project.get - Get a project by ID
  router.register(
    'project.get',
    (params) => {
      const validated = ProjectIdParamsSchema.parse(params);
      const project = projectService.get(validated.id);
      if (!project) {
        throw ApiError.projectNotFound(validated.id);
      }
      return project;
    },
    ProjectIdParamsSchema
  );

  // project.create - Create a new project
  router.register(
    'project.create',
    (params) => {
      const validated = ProjectCreateParamsSchema.parse(params);
      const project = projectService.create({
        title: validated.title,
        metadata: validated.metadata,
      } as Omit<TProject, 'id' | 'createdAt' | 'updatedAt'>);
      return project;
    },
    ProjectCreateParamsSchema
  );

  // project.load - Load a project (sets session context)
  router.register(
    'project.load',
    (params, context) => {
      const validated = ProjectIdParamsSchema.parse(params);
      const session = createSessionContext(sessionManager, context.connection.id);

      const project = projectService.get(validated.id);
      if (!project) {
        throw ApiError.projectNotFound(validated.id);
      }

      // Set as current project in session
      session.setCurrentProject(project.id);

      return project;
    },
    ProjectIdParamsSchema
  );

  // project.update - Update a project
  router.register(
    'project.update',
    (params) => {
      const validated = ProjectUpdateParamsSchema.parse(params);
      const updates: Partial<TProject> = {};

      if (validated.title) {
        (updates as { title?: string }).title = validated.title;
      }
      if (validated.metadata) {
        (updates as { metadata?: Record<string, unknown> }).metadata = validated.metadata;
      }

      const project = projectService.update(validated.id, updates);
      if (!project) {
        throw ApiError.projectNotFound(validated.id);
      }

      return project;
    },
    ProjectUpdateParamsSchema
  );

  // project.updateMetadata - Update project metadata only
  router.register(
    'project.updateMetadata',
    (params) => {
      const validated = ProjectUpdateMetadataParamsSchema.parse(params);
      const project = projectService.updateMetadata(validated.id, validated.metadata);
      if (!project) {
        throw ApiError.projectNotFound(validated.id);
      }
      return project;
    },
    ProjectUpdateMetadataParamsSchema
  );

  // project.delete - Delete a project
  router.register(
    'project.delete',
    (params) => {
      const validated = ProjectDeleteParamsSchema.parse(params);

      // Require confirmation
      if (!validated.confirm) {
        throw ApiError.validationError(
          'Deletion requires confirmation. Set confirm: true to proceed.',
          { requiresConfirmation: true }
        );
      }

      const success = projectService.delete(validated.id);
      if (!success) {
        throw ApiError.projectNotFound(validated.id);
      }

      return { deleted: true, id: validated.id };
    },
    ProjectDeleteParamsSchema
  );

  // session.status - Get current session state
  router.register('session.status', (_params, context) => {
    const session = createSessionContext(sessionManager, context.connection.id);
    return {
      currentProjectId: session.session.currentProjectId,
      currentStructureId: session.session.currentStructureId,
      data: session.session.data,
    };
  });

  // session.clear - Clear session state
  router.register('session.clear', (_params, context) => {
    sessionManager.clearSession(context.connection.id);
    return { cleared: true };
  });
}
