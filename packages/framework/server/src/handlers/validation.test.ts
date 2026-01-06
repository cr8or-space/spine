/**
 * Validation Handler Tests
 *
 * Tests for validation handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouter } from '../router';
import { createSessionManager } from '../session';
import { FRAMEWORK_API_METHODS } from '../protocol';
import type { BaseServices, ValidationService } from '../types';
import type { ConnectionState } from '../connection';
import { registerValidationHandlers } from './validation';

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
      saveResults: vi.fn().mockReturnValue([]),
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

// Create mock validation service
function createMockValidationService(): ValidationService {
  return {
    validate: vi.fn().mockResolvedValue([]),
    validatePhase: vi.fn().mockResolvedValue([]),
    getRegistry: vi.fn().mockReturnValue({
      register: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
      getByPhase: vi.fn().mockReturnValue([]),
    }),
  };
}

describe('Validation Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let services: BaseServices;
  let sessionManager: ReturnType<typeof createSessionManager>;
  let connection: ConnectionState;
  let validationService: ValidationService;

  beforeEach(() => {
    router = createRouter();
    services = createMockServices();
    sessionManager = createSessionManager();
    connection = createMockConnection();
    validationService = createMockValidationService();
    registerValidationHandlers(router, services, sessionManager, validationService);

    // Set up a session with a loaded project
    sessionManager.updateSession('conn-test', { currentProjectId: 'proj-1' });
  });

  it('should register all validation methods', () => {
    expect(router.hasMethod(FRAMEWORK_API_METHODS.VALIDATION_RUN)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.VALIDATION_RESULTS)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.VALIDATION_SUMMARY)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.VALIDATION_CLEAR)).toBe(true);
    expect(router.hasMethod(FRAMEWORK_API_METHODS.VALIDATION_PHASES)).toBe(true);
  });

  describe('validation.run', () => {
    it('should run all validators', async () => {
      const mockResults = [
        { status: 'pass', message: 'Test passed' },
        { status: 'fail', message: 'Test failed' },
      ];
      vi.mocked(validationService.validate).mockResolvedValue(mockResults);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_RUN,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result.passed).toBe(false);
      expect(response.result.failCount).toBe(1);
      expect(response.result.passCount).toBe(1);
      expect(response.result.results).toEqual(mockResults);
    });

    it('should run specific phases', async () => {
      const mockResults = [{ status: 'pass', message: 'Structural check passed' }];
      vi.mocked(validationService.validatePhase).mockResolvedValue(mockResults);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_RUN,
          params: { phases: ['structural'] },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result.passed).toBe(true);
      expect(validationService.validatePhase).toHaveBeenCalledWith('structural', expect.any(Object));
    });

    it('should stop on fail when requested', async () => {
      vi.mocked(validationService.validatePhase)
        .mockResolvedValueOnce([{ status: 'fail', message: 'Failed' }])
        .mockResolvedValueOnce([{ status: 'pass', message: 'Passed' }]);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_RUN,
          params: { phases: ['structural', 'automated'], stopOnFail: true },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result.failCount).toBe(1);
      expect(response.result.passCount).toBe(0);
      // Second phase should not have been called
      expect(validationService.validatePhase).toHaveBeenCalledTimes(1);
    });

    it('should error when no validation service configured', async () => {
      // Create router without validation service
      const routerNoValidation = createRouter();
      registerValidationHandlers(routerNoValidation, services, sessionManager);
      sessionManager.updateSession('conn-test', { currentProjectId: 'proj-1' });

      const responseJson = await routerNoValidation.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_RUN,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('not configured');
    });

    it('should use explicit projectId over session', async () => {
      vi.mocked(validationService.validate).mockResolvedValue([]);

      await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_RUN,
          params: { projectId: 'proj-explicit' },
        },
        connection
      );

      expect(services.entities.findByProject).toHaveBeenCalledWith('proj-explicit');
    });
  });

  describe('validation.results', () => {
    it('should get validation results', async () => {
      const mockResults = [
        { id: 'res-1', status: 'pass', message: 'OK' },
        { id: 'res-2', status: 'fail', message: 'Error' },
      ];
      vi.mocked(services.validationResults.getByProject).mockReturnValue(mockResults);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_RESULTS,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockResults);
    });

    it('should filter by status', async () => {
      const mockResults = [
        { id: 'res-1', status: 'pass', message: 'OK' },
        { id: 'res-2', status: 'fail', message: 'Error' },
      ];
      vi.mocked(services.validationResults.getByProject).mockReturnValue(mockResults);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_RESULTS,
          params: { status: 'fail' },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toHaveLength(1);
      expect(response.result[0].status).toBe('fail');
    });

    it('should apply pagination', async () => {
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        id: `res-${i}`,
        status: 'pass',
        message: `Result ${i}`,
      }));
      vi.mocked(services.validationResults.getByProject).mockReturnValue(mockResults);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_RESULTS,
          params: { limit: 5, offset: 2 },
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toHaveLength(5);
      expect(response.result[0].id).toBe('res-2');
    });
  });

  describe('validation.summary', () => {
    it('should get validation summary', async () => {
      const mockSummary = { total: 10, passed: 8, failed: 1, warned: 1 };
      vi.mocked(services.validationResults.getSummary).mockReturnValue(mockSummary);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_SUMMARY,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual(mockSummary);
    });
  });

  describe('validation.clear', () => {
    it('should clear validation results', async () => {
      vi.mocked(services.validationResults.clearByProject).mockReturnValue(5);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_CLEAR,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({ cleared: 5 });
    });
  });

  describe('validation.phases', () => {
    it('should list available phases and validators', async () => {
      const mockValidators = [
        { name: 'structure-check', phase: 'structural' },
        { name: 'continuity-check', phase: 'automated' },
      ];
      vi.mocked(validationService.getRegistry().getAll).mockReturnValue(mockValidators);

      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_PHASES,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result.phases).toEqual(['structural', 'automated', 'computed']);
      expect(response.result.validators).toEqual([
        { name: 'structure-check', phase: 'structural' },
        { name: 'continuity-check', phase: 'automated' },
      ]);
    });

    it('should return empty when no validation service', async () => {
      const routerNoValidation = createRouter();
      registerValidationHandlers(routerNoValidation, services, sessionManager);

      const responseJson = await routerNoValidation.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: FRAMEWORK_API_METHODS.VALIDATION_PHASES,
          params: {},
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toEqual({ phases: [], validators: [] });
    });
  });
});
