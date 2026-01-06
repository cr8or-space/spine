/**
 * Entity Handler Tests
 *
 * Tests for generic entity CRUD handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouter } from '../router';
import { createSessionManager } from '../session';
import { FRAMEWORK_API_METHODS } from '../protocol';
import type { BaseServices } from '../types';
import type { ConnectionState } from '../connection';
import { registerEntityHandlers } from './entity';

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

describe('Entity Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let services: BaseServices;
  let sessionManager: ReturnType<typeof createSessionManager>;
  let connection: ConnectionState;

  beforeEach(() => {
    router = createRouter();
    services = createMockServices();
    sessionManager = createSessionManager();
    connection = createMockConnection();
    registerEntityHandlers(router, services, sessionManager);

    // Set up a session with a loaded project
    sessionManager.updateSession('conn-test', { currentProjectId: 'proj-1' });
  });

  it('should register all entity methods', () => {
    expect(router.hasMethod(FRAMEWORK_API_METHODS.ENTITY_LIST)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.ENTITY_GET)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.ENTITY_CREATE)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.ENTITY_UPDATE)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.ENTITY_DELETE)).toBe(true);
  });

  describe('entity.list', () => {
    it('should list entities by type', async () => {
      const mockEntities = [
        { entity: { id: 'char-1', type: 'character', name: 'Alice' }, lifecycle: 'active' },
        { entity: { id: 'char-2', type: 'character', name: 'Bob' }, lifecycle: 'active' },
      ];
      vi.mocked(services.entities.findByType).mockReturnValue(mockEntities);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_LIST,
          params: { type: 'character' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toHaveLength(2);
      expect(services.entities.findByType).toHaveBeenCalledWith('proj-1', 'character');
    });

    it('should filter out retired entities by default', async () => {
      const mockEntities = [
        { entity: { id: 'char-1', type: 'character' }, lifecycle: 'active' },
        { entity: { id: 'char-2', type: 'character' }, lifecycle: 'retired' },
      ];
      vi.mocked(services.entities.findByType).mockReturnValue(mockEntities);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_LIST,
          params: { type: 'character' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toHaveLength(1);
      expect(response.result[0].entity.id).toBe('char-1');
    });

    it('should include retired entities when requested', async () => {
      const mockEntities = [
        { entity: { id: 'char-1', type: 'character' }, lifecycle: 'active' },
        { entity: { id: 'char-2', type: 'character' }, lifecycle: 'retired' },
      ];
      vi.mocked(services.entities.findByType).mockReturnValue(mockEntities);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_LIST,
          params: { type: 'character', includeRetired: true },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toHaveLength(2);
    });

    it('should use explicit projectId over session', async () => {
      vi.mocked(services.entities.findByType).mockReturnValue([]);

      await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_LIST,
          params: { type: 'character', projectId: 'proj-explicit' },
        },
        connection
      );

      expect(services.entities.findByType).toHaveBeenCalledWith('proj-explicit', 'character');
    });

    it('should error when no project in session', async () => {
      sessionManager.clearSession('conn-test');

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_LIST,
          params: { type: 'character' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('No project loaded');
    });
  });

  describe('entity.get', () => {
    it('should get entity by id', async () => {
      const mockEntity = { entity: { id: 'char-1', type: 'character', name: 'Alice' }, lifecycle: 'active' };
      vi.mocked(services.entities.findById).mockReturnValue(mockEntity);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_GET,
          params: { type: 'character', id: 'char-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockEntity);
    });

    it('should error when entity not found', async () => {
      vi.mocked(services.entities.findById).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_GET,
          params: { type: 'character', id: 'non-existent' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });

    it('should error when entity type does not match', async () => {
      const mockEntity = { entity: { id: 'loc-1', type: 'location', name: 'Castle' }, lifecycle: 'active' };
      vi.mocked(services.entities.findById).mockReturnValue(mockEntity);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_GET,
          params: { type: 'character', id: 'loc-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('entity.create', () => {
    it('should create entity', async () => {
      const mockCreated = {
        entity: { id: 'char-new', type: 'character', name: 'Charlie' },
        lifecycle: 'active',
      };
      vi.mocked(services.entities.create).mockReturnValue(mockCreated);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_CREATE,
          params: { type: 'character', data: { name: 'Charlie' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockCreated);
      expect(services.entities.create).toHaveBeenCalledWith('proj-1', {
        id: '',
        type: 'character',
        name: 'Charlie',
      });
    });
  });

  describe('entity.update', () => {
    it('should update existing entity', async () => {
      const mockExisting = { entity: { id: 'char-1', type: 'character', name: 'Alice' }, lifecycle: 'active' };
      const mockUpdated = { entity: { id: 'char-1', type: 'character', name: 'Alicia' }, lifecycle: 'active' };
      vi.mocked(services.entities.findById).mockReturnValue(mockExisting);
      vi.mocked(services.entities.update).mockReturnValue(mockUpdated);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_UPDATE,
          params: { type: 'character', id: 'char-1', data: { name: 'Alicia' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockUpdated);
    });

    it('should error when entity not found', async () => {
      vi.mocked(services.entities.findById).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_UPDATE,
          params: { type: 'character', id: 'non-existent', data: { name: 'New' } },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });

  describe('entity.delete', () => {
    it('should require confirmation', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_DELETE,
          params: { type: 'character', id: 'char-1' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('confirmation');
    });

    it('should delete entity when confirmed', async () => {
      const mockExisting = { entity: { id: 'char-1', type: 'character', name: 'Alice' }, lifecycle: 'active' };
      vi.mocked(services.entities.findById).mockReturnValue(mockExisting);
      vi.mocked(services.entities.delete).mockReturnValue(true);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_DELETE,
          params: { type: 'character', id: 'char-1', confirm: true },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({ deleted: true, id: 'char-1' });
    });

    it('should error when entity not found', async () => {
      vi.mocked(services.entities.findById).mockReturnValue(undefined);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.ENTITY_DELETE,
          params: { type: 'character', id: 'non-existent', confirm: true },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not found');
    });
  });
});
