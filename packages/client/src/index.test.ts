/**
 * Tests for index exports
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createFullClient,
  createSpineClient,
  SpineClient,
  SpineApiError,
  ErrorCode,
  JSONRPC_VERSION,
  SUBSCRIPTION_CHANNELS
} from './index';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readyState = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: (() => void) | null = null;

  constructor(_url: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
    MockWebSocket.instances.push(this);
  }

  send(): void {}
  close(): void {
    this.readyState = WebSocket.CLOSED;
  }

  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  static reset(): void {
    MockWebSocket.instances = [];
  }
}

const originalWebSocket = globalThis.WebSocket;

describe('index exports', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
  });

  describe('createSpineClient', () => {
    it('should export createSpineClient function', () => {
      expect(typeof createSpineClient).toBe('function');
    });

    it('should create SpineClient instance', () => {
      const client = createSpineClient({ url: 'ws://localhost:8080' });
      expect(client).toBeInstanceOf(SpineClient);
    });
  });

  describe('createFullClient', () => {
    it('should export createFullClient function', () => {
      expect(typeof createFullClient).toBe('function');
    });

    it('should create client with all API modules', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      // Core methods
      expect(typeof client.connect).toBe('function');
      expect(typeof client.disconnect).toBe('function');
      expect(typeof client.isConnected).toBe('function');
      expect(typeof client.getState).toBe('function');
      expect(typeof client.subscribe).toBe('function');

      // API modules
      expect(client.project).toBeDefined();
      expect(client.bible).toBeDefined();
      expect(client.structure).toBeDefined();
      expect(client.content).toBeDefined();
      expect(client.generation).toBeDefined();
      expect(client.review).toBeDefined();
      expect(client.analytics).toBeDefined();
      expect(client.serial).toBeDefined();
    });

    it('should have project API methods', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      expect(typeof client.project.list).toBe('function');
      expect(typeof client.project.create).toBe('function');
      expect(typeof client.project.load).toBe('function');
      expect(typeof client.project.delete).toBe('function');
    });

    it('should have bible API methods', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      expect(typeof client.bible.get).toBe('function');
      expect(client.bible.character).toBeDefined();
      expect(client.bible.location).toBeDefined();
      expect(client.bible.faction).toBeDefined();
    });

    it('should have structure API methods', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      expect(typeof client.structure.getTree).toBe('function');
      expect(typeof client.structure.create).toBe('function');
      expect(typeof client.structure.reorder).toBe('function');
    });

    it('should have content API methods', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      expect(typeof client.content.get).toBe('function');
      expect(typeof client.content.save).toBe('function');
      expect(typeof client.content.rollback).toBe('function');
    });

    it('should have generation API methods', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      expect(typeof client.generation.start).toBe('function');
      expect(typeof client.generation.cancel).toBe('function');
      expect(typeof client.generation.status).toBe('function');
    });

    it('should have review API methods', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      expect(typeof client.review.queue).toBe('function');
      expect(typeof client.review.submitAction).toBe('function');
      expect(typeof client.review.createLockPoint).toBe('function');
    });

    it('should have analytics API methods', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      expect(typeof client.analytics.tensionCurve).toBe('function');
      expect(typeof client.analytics.characterPresence).toBe('function');
      expect(typeof client.analytics.quality).toBe('function');
    });

    it('should have serial API methods', () => {
      const client = createFullClient({ url: 'ws://localhost:8080' });

      expect(typeof client.serial.bufferStatus).toBe('function');
      expect(typeof client.serial.releaseSchedule).toBe('function');
      expect(typeof client.serial.hookPatterns).toBe('function');
    });
  });

  describe('type exports', () => {
    it('should export SpineApiError', () => {
      const error = new SpineApiError(ErrorCode.INTERNAL_ERROR, 'Test error');
      expect(error).toBeInstanceOf(SpineApiError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should export ErrorCode', () => {
      expect(ErrorCode.PARSE_ERROR).toBe(-32700);
      expect(ErrorCode.PROJECT_NOT_FOUND).toBe(-32000);
    });

    it('should export JSONRPC_VERSION', () => {
      expect(JSONRPC_VERSION).toBe('2.0');
    });

    it('should export SUBSCRIPTION_CHANNELS', () => {
      expect(SUBSCRIPTION_CHANNELS.PROJECT_UPDATED).toBe('project.updated');
      expect(SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS).toBe('generation.progress');
    });
  });
});
