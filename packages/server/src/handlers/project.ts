/**
 * Project API handlers
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import { API_METHODS } from '../protocol';
import type { ProjectSummary, Project } from '@repo/types';

// Simplified param types that match the actual API
interface ProjectCreateParams {
  title: string;
  format?: 'web-serial' | 'light-novel' | 'short';
}

interface ProjectIdParams {
  id: string;
}

/**
 * Register project handlers on the router.
 */
export function registerProjectHandlers(router: Router, services: Services): void {
  // project.list - List all projects
  router.register<void, ProjectSummary[]>(
    API_METHODS.PROJECT_LIST,
    () => {
      return services.project.listProjects();
    }
  );

  // project.create - Create a new project
  router.register<ProjectCreateParams, Project>(
    API_METHODS.PROJECT_CREATE,
    (params) => {
      const format = params.format ?? 'web-serial';
      const project = services.project.createProject(params.title, format);
      return project;
    }
  );

  // project.load - Load a project by ID
  router.register<ProjectIdParams, Project>(
    API_METHODS.PROJECT_LOAD,
    (params) => {
      const project = services.project.loadProject(params.id);
      if (!project) {
        throw ApiError.projectNotFound(params.id);
      }
      return project;
    }
  );

  // project.delete - Delete a project
  router.register<ProjectIdParams, { success: boolean }>(
    API_METHODS.PROJECT_DELETE,
    (params) => {
      const success = services.project.deleteProject(params.id);
      if (!success) {
        throw ApiError.projectNotFound(params.id);
      }
      return { success: true };
    }
  );
}
