/**
 * Generic Project Handler Tests
 *
 * Tests for generic project CRUD handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouter } from '../router';
import { createSessionManager } from '../session';
import { FRAMEWORK_API_METHODS } from '../protocol';
import type { ProjectService, BaseProject } from '../types';
import type { ConnectionState } from '../connection';
import { registerGenericProjectHandlers } from './generic-project';

// Create mock connection state
function createMockConnection(): ConnectionState {
  return {
    id: 'conn-test',
    socket: {
      send: vi.fn(),
      readyState: 1,
    } as unknown as import('ws').WebSocket,
    createdAt: new Date(),
    lastActivity: new Date(),
    subscriptions: new Set(),
    activeGenerations: new Set(),
  };
}

// Create mock project service
function createMockProjectService(): ProjectService<BaseProject> {
  return {
    list: vi.fn().mockReturnValue([]),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMetadata: vi.fn(),
    delete: vi.fn(),
  };
}

describe('Generic Project Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let projectService: ProjectService<BaseProject>;
  let sessionManager: ReturnType<typeof createSessionManager>;
  let connection: ConnectionState;

  beforeEach(() => {
    router = createRouter();
    projectService = createMockProjectService();
    sessionManager = createSessionManager();
    connection = createMockConnection();
    registerGenericProjectHandlers(router, projectService, sessionManager);
  });

  it('should register all project methods', () => {
    expect(router.hasMethod(FRAMEWORK_API_METHODS.PROJECT_LIST)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.PROJECT_GET)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.PROJECT_CREATE)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.PROJECT_LOAD)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.PROJECT_UPDATE)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.PROJECT_UPDATE_METADATA)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.PROJECT_DELETE)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.SESSION_STATUS)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.SESSION_CLEAR)).toBe(true);
  });

  describe('project.list', () => {
    it('should list all projects', async () => {
      const mockProjects = [
        { id: 'proj-1', title: 'Project 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'proj-2', title: 'Project 2', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
      ];
      vi.mocked(projectService.list).mockReturnValue(mockProjects);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_LIST,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockProjects);
    });
  });

  describe('project.get', () => {
    it('should get project by id', async () => {
      const mockProject = { id: 'proj-1', title: 'Project 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      vi.mocked(projectService.get).mockReturnValue(mockProject);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_GET,
          params: { id: 'proj-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockProject);
    });

    it('should error when project not found', async () => {
      vi.mocked(projectService.get).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_GET,
          params: { id: 'non-existent' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('project.create', () => {
    it('should create project', async () => {
      const mockCreated = { id: 'proj-new', title: 'New Project', createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      vi.mocked(projectService.create).mockReturnValue(mockCreated);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_CREATE,
          params: { title: 'New Project' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockCreated);
    });

    it('should create project with metadata', async () => {
      const mockCreated = {
        id: 'proj-new',
        title: 'New Project',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        metadata: { genre: 'fantasy' },
      };
      vi.mocked(projectService.create).mockReturnValue(mockCreated);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_CREATE,
          params: { title: 'New Project', metadata: { genre: 'fantasy' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockCreated);
      expect(projectService.create).toHaveBeenCalledWith({
        title: 'New Project',
        metadata: { genre: 'fantasy' },
      });
    });

    it('should error when title is empty', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_CREATE,
          params: { title: '' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
    });
  });

  describe('project.load', () => {
    it('should load project and set session', async () => {
      const mockProject = { id: 'proj-1', title: 'Project 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      vi.mocked(projectService.get).mockReturnValue(mockProject);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_LOAD,
          params: { id: 'proj-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockProject);

      // Verify session was updated
      const session = sessionManager.getSession('conn-test');
      expect(session.currentProjectId).toBe('proj-1');
    });

    it('should error when project not found', async () => {
      vi.mocked(projectService.get).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_LOAD,
          params: { id: 'non-existent' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('project.update', () => {
    it('should update project title', async () => {
      const mockUpdated = { id: 'proj-1', title: 'Updated Title', createdAt: '2024-01-01', updatedAt: '2024-01-02' };
      vi.mocked(projectService.update).mockReturnValue(mockUpdated);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_UPDATE,
          params: { id: 'proj-1', title: 'Updated Title' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockUpdated);
    });

    it('should error when project not found', async () => {
      vi.mocked(projectService.update).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_UPDATE,
          params: { id: 'non-existent', title: 'New Title' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('project.updateMetadata', () => {
    it('should update project metadata', async () => {
      const mockUpdated = {
        id: 'proj-1',
        title: 'Project 1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        metadata: { genre: 'sci-fi' },
      };
      vi.mocked(projectService.updateMetadata).mockReturnValue(mockUpdated);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_UPDATE_METADATA,
          params: { id: 'proj-1', metadata: { genre: 'sci-fi' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockUpdated);
    });

    it('should error when project not found', async () => {
      vi.mocked(projectService.updateMetadata).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_UPDATE_METADATA,
          params: { id: 'non-existent', metadata: { foo: 'bar' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('project.delete', () => {
    it('should require confirmation', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_DELETE,
          params: { id: 'proj-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('confirmation');
    });

    it('should delete project when confirmed', async () => {
      vi.mocked(projectService.delete).mockReturnValue(true);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_DELETE,
          params: { id: 'proj-1', confirm: true },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({ deleted: true, id: 'proj-1' });
    });

    it('should error when project not found', async () => {
      vi.mocked(projectService.delete).mockReturnValue(false);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.PROJECT_DELETE,
          params: { id: 'non-existent', confirm: true },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('session.status', () => {
    it('should return empty session initially', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.SESSION_STATUS,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({
        currentProjectId: undefined,
        currentStructureId: undefined,
        data: {},
      });
    });

    it('should return current session state', async () => {
      sessionManager.updateSession('conn-test', {
        currentProjectId: 'proj-1',
        currentStructureId: 'struct-1',
        data: { custom: 'value' },
      });

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.SESSION_STATUS,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({
        currentProjectId: 'proj-1',
        currentStructureId: 'struct-1',
        data: { custom: 'value' },
      });
    });
  });

  describe('session.clear', () => {
    it('should clear session state', async () => {
      sessionManager.updateSession('conn-test', {
        currentProjectId: 'proj-1',
        currentStructureId: 'struct-1',
      });

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.SESSION_CLEAR,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({ cleared: true });

      // Verify session was cleared
      const session = sessionManager.getSession('conn-test');
      expect(session.currentProjectId).toBeUndefined();
    });
  });
});
