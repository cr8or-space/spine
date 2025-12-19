/**
 * Integration tests for cascade handlers with real database
 *
 * These tests verify the cascade functionality works end-to-end
 * with a real SQLite database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRouter } from '../router';
import { createServices, type Services } from '../services';
import { API_METHODS } from '../protocol';
import type { ConnectionState } from '../connection';
import { registerCascadeHandlers } from './cascade';
import { registerReviewHandlers } from './review';
import { registerProjectHandlers } from './project';
import { registerStructureHandlers } from './structure';
import { registerContentHandlers } from './content';
import { clearHorizonConfigs } from '@repo/core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Create mock connection state
function createMockConnection(): ConnectionState {
  return {
    id: 'conn-test',
    socket: {
      send: (): void => {},
      readyState: 1
    } as unknown as import('ws').WebSocket,
    createdAt: new Date(),
    lastActivity: new Date(),
    subscriptions: new Set(),
    activeGenerations: new Set()
  };
}

describe('Cascade Integration Tests', () => {
  let router: ReturnType<typeof createRouter>;
  let services: Services;
  let connection: ConnectionState;
  let tempDir: string;
  let projectId: string;

  beforeEach(async () => {
    // Create temp directory for database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-cascade-test-'));

    // Create services with real database
    services = createServices({
      dataDir: tempDir,
      dbPath: path.join(tempDir, 'test.db')
    });

    // Create router and register handlers
    router = createRouter();
    registerProjectHandlers(router, services);
    registerStructureHandlers(router, services);
    registerContentHandlers(router, services);
    registerReviewHandlers(router, services);
    registerCascadeHandlers(router, services);
    connection = createMockConnection();

    // Clear horizon configs between tests
    clearHorizonConfigs();

    // Create a test project
    const createProjectResponse = await router.handle(
      {
        jsonrpc: '2.0',
        id: 'req-create-project',
        method: API_METHODS.PROJECT_CREATE,
        params: { title: 'Test Project', format: 'web-serial' }
      },
      connection
    );
    const projectResult = JSON.parse(createProjectResponse);
    if (projectResult.error) {
      throw new Error(`Failed to create project: ${projectResult.error.message}`);
    }
    projectId = projectResult.result.id;
  });

  afterEach(() => {
    // Close database connection
    services.close();

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Horizon Config', () => {
    it('should get default horizon config', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.CASCADE_GET_HORIZON_CONFIG,
          params: { projectId }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toBeDefined();
      expect(response.result.maxChaptersAhead).toBe(5);
      expect(response.result.autoInvalidate).toBe(false);
      expect(response.result.requireConfirmation).toBe(true);
      expect(response.result.minTriggerStatus).toBe('review');
    });

    it('should update horizon config', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.CASCADE_SET_HORIZON_CONFIG,
          params: {
            projectId,
            config: {
              maxChaptersAhead: 10,
              autoInvalidate: true
            }
          }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toBeDefined();
      expect(response.result.maxChaptersAhead).toBe(10);
      expect(response.result.autoInvalidate).toBe(true);
      expect(response.result.requireConfirmation).toBe(true);
    });

    it('should persist horizon config changes', async () => {
      // Set config
      await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.CASCADE_SET_HORIZON_CONFIG,
          params: {
            projectId,
            config: { maxChaptersAhead: 8 }
          }
        },
        connection
      );

      // Get config
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-2',
          method: API_METHODS.CASCADE_GET_HORIZON_CONFIG,
          params: { projectId }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result.maxChaptersAhead).toBe(8);
    });
  });

  describe('Cascade Analysis', () => {
    let chapterId: string;
    let contentId: string;

    beforeEach(async () => {
      // Get root book structure (auto-created)
      const treeResponse = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-tree',
          method: API_METHODS.STRUCTURE_GET_TREE,
          params: { projectId }
        },
        connection
      );
      const tree = JSON.parse(treeResponse);
      const bookId = tree.result.id;

      // Create a chapter
      const createChapterResponse = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-create-chapter',
          method: API_METHODS.STRUCTURE_CREATE,
          params: {
            projectId,
            data: {
              title: 'Chapter 1',
              type: 'chapter',
              parentId: bookId
            }
          }
        },
        connection
      );
      const chapterResult = JSON.parse(createChapterResponse);
      chapterId = chapterResult.result.id;

      // Create content for the chapter
      const saveContentResponse = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-save-content',
          method: API_METHODS.CONTENT_SAVE,
          params: {
            projectId,
            structureId: chapterId,
            text: 'This is the chapter content.'
          }
        },
        connection
      );
      const contentResult = JSON.parse(saveContentResponse);
      contentId = contentResult.result.id;
    });

    it('should analyze impact for content', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.CASCADE_ANALYZE_IMPACT,
          params: { projectId, contentId }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toBeDefined();
      expect(response.result.sourceContentId).toBe(contentId);
      expect(Array.isArray(response.result.affectedContents)).toBe(true);
      expect(typeof response.result.chaptersAnalyzed).toBe('number');
    });

    it('should check if content is protected', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.CASCADE_IS_PROTECTED,
          params: { projectId, contentId }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      if (response.error) {
        throw new Error(`API error: ${response.error.message}`);
      }
      expect(response.result).toBeDefined();
      expect(response.result.protected).toBe(false);
    });

    it('should preview cascade for content', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.REVIEW_PREVIEW_CASCADE,
          params: { projectId, contentId }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toBeDefined();
      expect(response.result.source).toBeDefined();
      expect(response.result.source.contentId).toBe(contentId);
      expect(response.result.affectedBySeverity).toBeDefined();
      expect(response.result.summary).toBeDefined();
    });

    it('should execute cascade for content', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.REVIEW_EXECUTE_CASCADE,
          params: { projectId, contentId }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toBeDefined();
      expect(response.result.success).toBe(true);
      expect(Array.isArray(response.result.invalidatedContentIds)).toBe(true);
    });

    it('should execute cascade with dry run option', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.REVIEW_EXECUTE_CASCADE,
          params: {
            projectId,
            contentId,
            options: { dryRun: true }
          }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      expect(response.result).toBeDefined();
      expect(response.result.success).toBe(true);
    });
  });

  describe('Cascade Protection', () => {
    let contentId: string;

    beforeEach(async () => {
      // Get root book structure (auto-created)
      const treeResponse = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-tree',
          method: API_METHODS.STRUCTURE_GET_TREE,
          params: { projectId }
        },
        connection
      );
      const tree = JSON.parse(treeResponse);
      const bookId = tree.result.id;

      // Create a chapter
      const createChapterResponse = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-create-chapter',
          method: API_METHODS.STRUCTURE_CREATE,
          params: {
            projectId,
            data: {
              title: 'Chapter 1',
              type: 'chapter',
              parentId: bookId
            }
          }
        },
        connection
      );
      const chapterResult = JSON.parse(createChapterResponse);
      const chapterId = chapterResult.result.id;

      // Create content for the chapter
      const saveContentResponse = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-save-content',
          method: API_METHODS.CONTENT_SAVE,
          params: {
            projectId,
            structureId: chapterId,
            text: 'This is the chapter content.'
          }
        },
        connection
      );
      const contentResult = JSON.parse(saveContentResponse);
      contentId = contentResult.result.id;
    });

    it('should create cascade protection for content', async () => {
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.CASCADE_CREATE_PROTECTION,
          params: {
            projectId,
            contentId,
            reason: 'Test protection'
          }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      if (response.error) {
        throw new Error(`API error: ${response.error.message}`);
      }
      expect(response.result).toBeDefined();
      expect(response.result.contentId).toBe(contentId);
      expect(response.result.type).toBe('cascade-protection');
      expect(response.result.reason).toBe('Test protection');
    });

    it('should show content as protected after creating protection', async () => {
      // Create protection
      const createResponse = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-1',
          method: API_METHODS.CASCADE_CREATE_PROTECTION,
          params: {
            projectId,
            contentId,
            reason: 'Test protection'
          }
        },
        connection
      );
      const createResult = JSON.parse(createResponse);
      if (createResult.error) {
        throw new Error(`API error creating protection: ${createResult.error.message}`);
      }

      // Check if protected
      const responseJson = await router.handle(
        {
          jsonrpc: '2.0',
          id: 'req-2',
          method: API_METHODS.CASCADE_IS_PROTECTED,
          params: { projectId, contentId }
        },
        connection
      );
      const response = JSON.parse(responseJson);

      if (response.error) {
        throw new Error(`API error checking protection: ${response.error.message}`);
      }
      expect(response.result.protected).toBe(true);
      expect(response.result.reason).toBe('Test protection');
    });
  });
});
