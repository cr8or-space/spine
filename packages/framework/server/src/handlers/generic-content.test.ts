/**
 * Generic Content Handler Tests
 *
 * Tests for generic content CRUD handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouter } from '../router';
import { createSessionManager } from '../session';
import { FRAMEWORK_API_METHODS } from '../protocol';
import type { BaseServices } from '../types';
import type { ConnectionState } from '../connection';
import { registerGenericContentHandlers } from './generic-content';

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

// Create mock base services
function createMockServices(): BaseServices {
  return {
    db: {} as unknown as import('libsql').Database,
    entities: {
      findById: vi.fn(),
      findByProject: vi.fn().mockReturnValue([]),
      findByType: vi.fn().mockReturnValue([]),
      create: vi.fn(),
      update: vi.fn(),
      updateLifecycle: vi.fn(),
      delete: vi.fn(),
      deleteByProject: vi.fn(),
    },
    content: {
      findById: vi.fn(),
      findBySpineNode: vi.fn().mockReturnValue([]),
      findByProject: vi.fn().mockReturnValue([]),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
      deleteBySpineNode: vi.fn(),
      deleteByProject: vi.fn(),
    },
    validationResults: {
      saveResults: vi.fn(),
      getByProject: vi.fn().mockReturnValue([]),
      getByContent: vi.fn().mockReturnValue([]),
      getFailures: vi.fn().mockReturnValue([]),
      getSummary: vi.fn().mockReturnValue({ total: 0, passed: 0, failed: 0, warned: 0 }),
      clearByProject: vi.fn().mockReturnValue(0),
      clearByContent: vi.fn().mockReturnValue(0),
      clearOlderThan: vi.fn().mockReturnValue(0),
    },
    llmClient: undefined,
    close: vi.fn(),
  };
}

describe('Generic Content Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let services: BaseServices;
  let sessionManager: ReturnType<typeof createSessionManager>;
  let connection: ConnectionState;

  beforeEach(() => {
    router = createRouter();
    services = createMockServices();
    sessionManager = createSessionManager();
    connection = createMockConnection();
    registerGenericContentHandlers(router, services, sessionManager);

    // Set up a session with a loaded project
    sessionManager.updateSession('conn-test', { currentProjectId: 'proj-1' });
  });

  it('should register all content methods', () => {
    expect(router.hasMethod(FRAMEWORK_API_METHODS.CONTENT_LIST)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.CONTENT_GET)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.CONTENT_GET_BY_ID)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.CONTENT_CREATE)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.CONTENT_UPDATE)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.CONTENT_UPDATE_STATUS)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.CONTENT_DELETE)).toBe(true);
  });

  describe('content.list', () => {
    it('should list all content in project', async () => {
      const mockContent = [
        { content: { id: 'cont-1', type: 'prose', spineNode: 'ch-1', status: 'draft', references: [] } },
        { content: { id: 'cont-2', type: 'prose', spineNode: 'ch-2', status: 'review', references: [] } },
      ];
      vi.mocked(services.content.findByProject).mockReturnValue(mockContent);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_LIST,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toHaveLength(2);
      expect(services.content.findByProject).toHaveBeenCalledWith('proj-1', {
        type: undefined,
        status: undefined,
        spineNodeId: undefined,
      });
    });

    it('should filter by type', async () => {
      vi.mocked(services.content.findByProject).mockReturnValue([]);

      await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_LIST,
          params: { type: 'prose' },
        },
        connection
      );

      expect(services.content.findByProject).toHaveBeenCalledWith('proj-1', {
        type: 'prose',
        status: undefined,
        spineNodeId: undefined,
      });
    });

    it('should filter by status', async () => {
      vi.mocked(services.content.findByProject).mockReturnValue([]);

      await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_LIST,
          params: { status: 'draft' },
        },
        connection
      );

      expect(services.content.findByProject).toHaveBeenCalledWith('proj-1', {
        type: undefined,
        status: 'draft',
        spineNodeId: undefined,
      });
    });
  });

  describe('content.get', () => {
    it('should get content by spine node', async () => {
      const mockContent = [
        { content: { id: 'cont-1', type: 'prose', spineNode: 'ch-1', status: 'draft', references: [] } },
      ];
      vi.mocked(services.content.findBySpineNode).mockReturnValue(mockContent);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_GET,
          params: { spineNodeId: 'ch-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockContent[0]);
    });

    it('should return null when no content for spine node', async () => {
      vi.mocked(services.content.findBySpineNode).mockReturnValue([]);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_GET,
          params: { spineNodeId: 'empty-node' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toBeNull();
    });
  });

  describe('content.getById', () => {
    it('should get content by ID', async () => {
      const mockContent = { content: { id: 'cont-1', type: 'prose', spineNode: 'ch-1', status: 'draft', references: [] } };
      vi.mocked(services.content.findById).mockReturnValue(mockContent);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_GET_BY_ID,
          params: { id: 'cont-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockContent);
    });

    it('should error when content not found', async () => {
      vi.mocked(services.content.findById).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_GET_BY_ID,
          params: { id: 'non-existent' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('content.create', () => {
    it('should create content', async () => {
      const mockCreated = {
        content: { id: 'cont-new', type: 'prose', spineNode: 'ch-1', status: 'draft', references: [], text: 'Hello' },
      };
      vi.mocked(services.content.create).mockReturnValue(mockCreated);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_CREATE,
          params: { type: 'prose', spineNodeId: 'ch-1', data: { text: 'Hello' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockCreated);
      expect(services.content.create).toHaveBeenCalledWith('proj-1', {
        id: '',
        type: 'prose',
        spineNode: 'ch-1',
        status: 'draft',
        references: [],
        text: 'Hello',
      });
    });
  });

  describe('content.update', () => {
    it('should update content', async () => {
      const mockUpdated = {
        content: { id: 'cont-1', type: 'prose', spineNode: 'ch-1', status: 'draft', references: [], text: 'Updated' },
      };
      vi.mocked(services.content.update).mockReturnValue(mockUpdated);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_UPDATE,
          params: { id: 'cont-1', data: { text: 'Updated' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockUpdated);
    });

    it('should error when content not found', async () => {
      vi.mocked(services.content.update).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_UPDATE,
          params: { id: 'non-existent', data: { text: 'New' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('content.updateStatus', () => {
    it('should update content status', async () => {
      vi.mocked(services.content.updateStatus).mockReturnValue(true);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_UPDATE_STATUS,
          params: { id: 'cont-1', status: 'review' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({ success: true, id: 'cont-1', status: 'review' });
    });

    it('should error when content not found', async () => {
      vi.mocked(services.content.updateStatus).mockReturnValue(false);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_UPDATE_STATUS,
          params: { id: 'non-existent', status: 'review' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('content.delete', () => {
    it('should require confirmation', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_DELETE,
          params: { id: 'cont-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('confirmation');
    });

    it('should delete content when confirmed', async () => {
      vi.mocked(services.content.delete).mockReturnValue(true);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_DELETE,
          params: { id: 'cont-1', confirm: true },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({ deleted: true, id: 'cont-1' });
    });

    it('should error when content not found', async () => {
      vi.mocked(services.content.delete).mockReturnValue(false);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.CONTENT_DELETE,
          params: { id: 'non-existent', confirm: true },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });
});
