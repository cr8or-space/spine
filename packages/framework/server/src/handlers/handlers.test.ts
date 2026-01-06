/**
 * Handler registration tests
 *
 * Tests that verify handlers are registered correctly and handle basic cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouter } from '../router';
import { API_METHODS } from '../protocol';
import type { Services } from '../services';
import type { SubscriptionManager } from '../subscriptions';
import type { ConnectionState } from '../connection';
import { registerGenerationHandlers } from './generation';
import { registerReviewHandlers } from './review';
import { registerAnalyticsHandlers } from './analytics';
import { registerSerialHandlers } from './serial';
import { registerCascadeHandlers } from './cascade';

// Create mock connection state
function createMockConnection(): ConnectionState {
  return {
    id: 'conn-test',
    socket: {
      send: vi.fn(),
      readyState: 1
    } as unknown as import('ws').WebSocket,
    createdAt: new Date(),
    lastActivity: new Date(),
    subscriptions: new Set(),
    activeGenerations: new Set()
  };
}

// Create mock services
function createMockServices(): Services {
  const mockProject = {
    loadProject: vi.fn().mockReturnValue(null),
    listProjects: vi.fn().mockReturnValue([]),
    createProject: vi.fn(),
    deleteProject: vi.fn(),
    repos: {
      contents: {
        findByStructure: vi.fn().mockReturnValue(null),
        findById: vi.fn().mockReturnValue(null),
        create: vi.fn(),
        update: vi.fn()
      },
      lockPoints: {
        findByContent: vi.fn().mockReturnValue([])
      },
      structures: {}
    }
  };

  const mockBible = vi.fn().mockReturnValue({
    getBible: vi.fn().mockReturnValue({
      characters: [],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
      timeline: []
    })
  });

  const mockStructure = vi.fn().mockReturnValue({
    getById: vi.fn().mockReturnValue(null),
    getFullTree: vi.fn().mockReturnValue({
      id: 'root',
      type: 'book',
      title: 'Test Book',
      children: []
    }),
    getAll: vi.fn().mockReturnValue([])
  });

  const mockReview = vi.fn().mockReturnValue({
    getReviewQueue: vi.fn().mockReturnValue([]),
    addComment: vi.fn(),
    resolveComment: vi.fn(),
    applyParagraphAction: vi.fn().mockReturnValue({ success: false, error: 'Not found' }),
    transitionStatus: vi.fn().mockReturnValue({ success: false, error: 'Not found' }),
    bulkApprove: vi.fn().mockReturnValue({ succeeded: [], failed: [] }),
    createLockPoint: vi.fn(),
    removeLockPoint: vi.fn().mockReturnValue(false),
    getLockPoints: vi.fn().mockReturnValue([]),
    getLockPointsForContent: vi.fn().mockReturnValue([]),
    canModify: vi.fn().mockReturnValue({ canModify: true })
  });

  const mockCascade = {
    getHorizonConfig: vi.fn().mockReturnValue({
      maxChaptersAhead: 5,
      autoInvalidate: false,
      requireConfirmation: true,
      minTriggerStatus: 'review'
    }),
    setHorizonConfig: vi.fn().mockReturnValue({
      maxChaptersAhead: 5,
      autoInvalidate: false,
      requireConfirmation: true,
      minTriggerStatus: 'review'
    }),
    analyzeImpact: vi.fn().mockReturnValue({
      sourceContentId: 'test',
      affectedContents: [],
      protectingLockPoints: [],
      protectedContentIds: [],
      publishedContentIds: [],
      horizonConfig: { maxChaptersAhead: 5, autoInvalidate: false, requireConfirmation: true, minTriggerStatus: 'review' },
      chaptersAnalyzed: 0,
      crossesLockPoints: false,
      affectsPublished: false,
      analyzedAt: new Date().toISOString()
    }),
    isProtected: vi.fn().mockReturnValue({ protected: false }),
    createCascadeProtection: vi.fn().mockReturnValue(null),
    previewCascade: vi.fn().mockReturnValue({
      source: { contentId: 'test', title: 'Test', chapterNumber: 1 },
      affectedBySeverity: { direct: [], indirect: [] },
      protected: { byLockPoints: [], byPublished: [] },
      summary: { totalAffected: 0, totalProtected: 0, wouldInvalidate: 0, horizonChapters: 5 },
      warnings: []
    }),
    executeCascade: vi.fn().mockReturnValue({
      success: true,
      invalidatedContentIds: [],
      skippedContentIds: [],
      blockingLockPoints: [],
      blockingPublishedIds: [],
      impact: {
        sourceContentId: 'test',
        affectedContents: [],
        protectedByLocks: [],
        horizonChapters: 5,
        analyzedAt: new Date().toISOString()
      }
    }),
    getProtectingLockPoints: vi.fn().mockReturnValue([])
  };

  return {
    db: {} as unknown as import('libsql').Database,
    drizzle: {} as unknown as import('@repo/core').DrizzleDB,
    project: mockProject as unknown as import('@repo/core').ProjectService,
    bible: mockBible,
    structure: mockStructure,
    version: {} as unknown as import('@repo/core').VersionService,
    review: mockReview,
    cascade: mockCascade as unknown as import('@repo/core').RevisionCascadeService,
    generation: undefined, // LLM not configured
    analysis: undefined,
    llmClient: undefined,
    close: vi.fn()
  };
}

// Create mock subscription manager
function createMockSubscriptions(): SubscriptionManager {
  return {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    broadcast: vi.fn(),
    broadcastToConnection: vi.fn(),
    getSubscriptionCount: vi.fn().mockReturnValue(0),
    cleanup: vi.fn()
  };
}

describe('Generation Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let services: Services;
  let subscriptions: SubscriptionManager;
  let connection: ConnectionState;

  beforeEach(() => {
    router = createRouter();
    services = createMockServices();
    subscriptions = createMockSubscriptions();
    connection = createMockConnection();
    registerGenerationHandlers(router, services, subscriptions);
  });

  it('should register all generation methods', () => {
    expect(router.hasMethod(API_METHODS.GENERATION_START)).toBe(true);
    expect(router.hasMethod(API_METHODS.GENERATION_CANCEL)).toBe(true);
    expect(router.hasMethod(API_METHODS.GENERATION_STATUS)).toBe(true);
    expect(router.hasMethod(API_METHODS.GENERATION_RETRY)).toBe(true);
  });

  it('should return error when LLM not configured for generation.start', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.GENERATION_START,
        params: { projectId: 'test-project', structureId: 'test-structure' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('LLM client not configured');
  });

  it('should return error when generation not found for cancel', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.GENERATION_CANCEL,
        params: { generationId: 'non-existent' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('not found');
  });

  it('should return error when generation not found for status', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.GENERATION_STATUS,
        params: { generationId: 'non-existent' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('not found');
  });
});

describe('Review Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let services: Services;
  let connection: ConnectionState;

  beforeEach(() => {
    router = createRouter();
    services = createMockServices();
    connection = createMockConnection();
    registerReviewHandlers(router, services);
  });

  it('should register all review methods', () => {
    expect(router.hasMethod(API_METHODS.REVIEW_QUEUE)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_GET_ITEM)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_SUBMIT_ACTION)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_BULK_APPROVE)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_CREATE_LOCK_POINT)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_REMOVE_LOCK_POINT)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_GET_LOCK_POINTS)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_ADD_COMMENT)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_RESOLVE_COMMENT)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_TRANSITION_STATUS)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_PREVIEW_CASCADE)).toBe(true);
    expect(router.hasMethod(API_METHODS.REVIEW_EXECUTE_CASCADE)).toBe(true);
  });

  it('should return error when project not found for review.queue', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.REVIEW_QUEUE,
        params: { projectId: 'non-existent' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('not found');
  });

  it('should return error when content not found for review.getItem', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.REVIEW_GET_ITEM,
        params: { projectId: 'test-project', contentId: 'non-existent' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('not found');
  });

  it('should return queue when project exists', async () => {
    // Mock project to exist
    vi.mocked(services.project.loadProject).mockReturnValue({
      id: 'test-project',
      title: 'Test',
      format: 'web-serial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {}
    } as unknown as import('@repo/types').Project);

    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.REVIEW_QUEUE,
        params: { projectId: 'test-project' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.result).toEqual([]);
  });
});

describe('Analytics Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let services: Services;
  let connection: ConnectionState;

  beforeEach(() => {
    router = createRouter();
    services = createMockServices();
    connection = createMockConnection();
    registerAnalyticsHandlers(router, services);
  });

  it('should register all analytics methods', () => {
    expect(router.hasMethod(API_METHODS.ANALYTICS_TENSION_CURVE)).toBe(true);
    expect(router.hasMethod(API_METHODS.ANALYTICS_CHARACTER_PRESENCE)).toBe(true);
    expect(router.hasMethod(API_METHODS.ANALYTICS_PLOT_THREADS)).toBe(true);
    expect(router.hasMethod(API_METHODS.ANALYTICS_QUALITY)).toBe(true);
  });

  it('should return error when project not found for analytics.tensionCurve', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.ANALYTICS_TENSION_CURVE,
        params: { projectId: 'non-existent' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('not found');
  });
});

describe('Serial Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let services: Services;
  let connection: ConnectionState;

  beforeEach(() => {
    router = createRouter();
    services = createMockServices();
    connection = createMockConnection();
    registerSerialHandlers(router, services);
  });

  it('should register all serial methods', () => {
    expect(router.hasMethod(API_METHODS.SERIAL_BUFFER_STATUS)).toBe(true);
    expect(router.hasMethod(API_METHODS.SERIAL_RELEASE_SCHEDULE)).toBe(true);
    expect(router.hasMethod(API_METHODS.SERIAL_HOOK_PATTERNS)).toBe(true);
    expect(router.hasMethod(API_METHODS.SERIAL_CYCLE_STATUS)).toBe(true);
    expect(router.hasMethod(API_METHODS.SERIAL_MYSTERY_BOARD)).toBe(true);
  });

  it('should return error when project not found for serial.bufferStatus', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.SERIAL_BUFFER_STATUS,
        params: { projectId: 'non-existent' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('not found');
  });

  it('should return buffer status when project exists', async () => {
    // Mock project to exist with serial settings
    vi.mocked(services.project.loadProject).mockReturnValue({
      id: 'test-project',
      title: 'Test',
      format: 'web-serial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        serialSettings: {
          minimumBuffer: 3,
          releaseInterval: 7,
          releaseDay: 'monday'
        }
      }
    } as unknown as import('@repo/types').Project);

    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.SERIAL_BUFFER_STATUS,
        params: { projectId: 'test-project' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.result).toBeDefined();
    expect(typeof response.result.bufferSize).toBe('number');
    expect(typeof response.result.isHealthy).toBe('boolean');
  });
});

describe('Cascade Handlers', () => {
  let router: ReturnType<typeof createRouter>;
  let services: Services;
  let connection: ConnectionState;

  beforeEach(() => {
    router = createRouter();
    services = createMockServices();
    connection = createMockConnection();
    registerCascadeHandlers(router, services);
  });

  it('should register all cascade methods', () => {
    expect(router.hasMethod(API_METHODS.CASCADE_GET_HORIZON_CONFIG)).toBe(true);
    expect(router.hasMethod(API_METHODS.CASCADE_SET_HORIZON_CONFIG)).toBe(true);
    expect(router.hasMethod(API_METHODS.CASCADE_ANALYZE_IMPACT)).toBe(true);
    expect(router.hasMethod(API_METHODS.CASCADE_IS_PROTECTED)).toBe(true);
    expect(router.hasMethod(API_METHODS.CASCADE_CREATE_PROTECTION)).toBe(true);
  });

  it('should return error when project not found for cascade.getHorizonConfig', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.CASCADE_GET_HORIZON_CONFIG,
        params: { projectId: 'non-existent' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('not found');
  });

  it('should return horizon config when project exists', async () => {
    // Mock project to exist
    vi.mocked(services.project.loadProject).mockReturnValue({
      id: 'test-project',
      title: 'Test',
      format: 'web-serial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {}
    } as unknown as import('@repo/types').Project);

    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.CASCADE_GET_HORIZON_CONFIG,
        params: { projectId: 'test-project' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.result).toBeDefined();
    expect(typeof response.result.maxChaptersAhead).toBe('number');
    expect(typeof response.result.autoInvalidate).toBe('boolean');
  });

  it('should return error when content not found for cascade.analyzeImpact', async () => {
    const responseJson = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-1',
        method: API_METHODS.CASCADE_ANALYZE_IMPACT,
        params: { projectId: 'test-project', contentId: 'non-existent' }
      },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('not found');
  });
});
