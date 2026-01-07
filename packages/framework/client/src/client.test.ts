/**
 * Tests for SpineClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpineClient, createSpineClient } from './client';
import { JSONRPC_VERSION, SpineApiError, ErrorCode } from './types';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readyState = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { reason: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  private sentMessages: string[] = [];

  constructor(_url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ reason: 'closed' });
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }

  simulateClose(reason = ''): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ reason });
  }

  getSentMessages(): string[] {
    return this.sentMessages;
  }

  getLastSentMessage(): unknown {
    const last = this.sentMessages[this.sentMessages.length - 1];
    return last ? JSON.parse(last) : null;
  }

  static reset(): void {
    MockWebSocket.instances = [];
  }
}

// Install mock
const originalWebSocket = globalThis.WebSocket;

describe('SpineClient', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
  });

  describe('constructor', () => {
    it('should create client with config', () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      expect(client.getState()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should connect to server', async () => {
      const onConnect = vi.fn();
      const client = new SpineClient({
        url: 'ws://localhost:8080',
        onConnect
      });

      const connectPromise = client.connect();

      expect(client.getState()).toBe('connecting');

      // Simulate successful connection
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();

      await connectPromise;

      expect(client.getState()).toBe('connected');
      expect(client.isConnected()).toBe(true);
      expect(onConnect).toHaveBeenCalled();
    });

    it('should reject if already connecting', async () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      const connectPromise = client.connect();

      await expect(client.connect()).rejects.toThrow('Connection already in progress');

      // Cleanup
      MockWebSocket.instances[0].simulateOpen();
      await connectPromise;
    });

    it('should resolve immediately if already connected', async () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      const connectPromise = client.connect();
      MockWebSocket.instances[0].simulateOpen();
      await connectPromise;

      // Should resolve immediately
      await client.connect();
      expect(client.isConnected()).toBe(true);
    });

    it('should call onError on connection error', async () => {
      const onError = vi.fn();
      const client = new SpineClient({
        url: 'ws://localhost:8080',
        onError
      });

      const connectPromise = client.connect();

      // Simulate error
      MockWebSocket.instances[0].simulateError();

      await expect(connectPromise).rejects.toThrow('WebSocket error');
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from server', async () => {
      const onDisconnect = vi.fn();
      const client = new SpineClient({
        url: 'ws://localhost:8080',
        onDisconnect
      });

      const connectPromise = client.connect();
      MockWebSocket.instances[0].simulateOpen();
      await connectPromise;

      client.disconnect();

      expect(client.getState()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('request', () => {
    it('should send request and receive response', async () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      const connectPromise = client.connect();
      MockWebSocket.instances[0].simulateOpen();
      await connectPromise;

      const ws = MockWebSocket.instances[0];

      // Make request
      const requestPromise = client.request<{ data: string }>('test.method', { param: 'value' });

      // Check sent message
      const sent = ws.getLastSentMessage() as { jsonrpc: string; id: string; method: string; params: unknown };
      expect(sent.jsonrpc).toBe(JSONRPC_VERSION);
      expect(sent.method).toBe('test.method');
      expect(sent.params).toEqual({ param: 'value' });

      // Simulate response
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        id: sent.id,
        result: { data: 'response' }
      });

      const result = await requestPromise;
      expect(result).toEqual({ data: 'response' });
    });

    it('should reject on error response', async () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      const connectPromise = client.connect();
      MockWebSocket.instances[0].simulateOpen();
      await connectPromise;

      const ws = MockWebSocket.instances[0];

      // Make request
      const requestPromise = client.request('test.method');

      // Get request ID
      const sent = ws.getLastSentMessage() as { id: string };

      // Simulate error response
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        id: sent.id,
        error: {
          code: ErrorCode.ENTITY_NOT_FOUND,
          message: 'Not found'
        }
      });

      await expect(requestPromise).rejects.toThrow(SpineApiError);
      await expect(requestPromise).rejects.toMatchObject({
        code: ErrorCode.ENTITY_NOT_FOUND,
        message: 'Not found'
      });
    });

    it('should reject if not connected', async () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      await expect(client.request('test.method')).rejects.toThrow('Not connected');
    });

    it('should timeout on no response', async () => {
      const client = new SpineClient({
        url: 'ws://localhost:8080',
        requestTimeout: 100
      });

      const connectPromise = client.connect();
      MockWebSocket.instances[0].simulateOpen();
      await connectPromise;

      await expect(client.request('test.method')).rejects.toThrow('Request timeout');
    });
  });

  describe('subscribe', () => {
    it('should subscribe to channel', async () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      const connectPromise = client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();
      await connectPromise;

      const handler = vi.fn();

      // Subscribe
      const unsubscribe = client.subscribe(
        { channel: 'project.updated', projectId: 'proj-1' },
        handler
      );

      // Respond to subscription request
      const sent = ws.getLastSentMessage() as { id: string };
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        id: sent.id,
        result: { subscribed: true }
      });

      // Simulate notification
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        method: 'project.updated',
        params: { projectId: 'proj-1', data: 'test' }
      });

      expect(handler).toHaveBeenCalledWith({ projectId: 'proj-1', data: 'test' });

      expect(typeof unsubscribe).toBe('function');
    });

    it('should filter notifications by subscription key', async () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      const connectPromise = client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();
      await connectPromise;

      const handler = vi.fn();

      // Subscribe to specific project
      client.subscribe(
        { channel: 'project.updated', projectId: 'proj-1' },
        handler
      );

      // Respond to subscription
      const sent = ws.getLastSentMessage() as { id: string };
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        id: sent.id,
        result: { subscribed: true }
      });

      // Notification for different project - should not call handler
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        method: 'project.updated',
        params: { projectId: 'proj-2', data: 'other' }
      });

      expect(handler).not.toHaveBeenCalled();

      // Notification for subscribed project - should call handler
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        method: 'project.updated',
        params: { projectId: 'proj-1', data: 'test' }
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe', async () => {
      const client = new SpineClient({ url: 'ws://localhost:8080' });

      const connectPromise = client.connect();
      const ws = MockWebSocket.instances[0];
      ws.simulateOpen();
      await connectPromise;

      const handler = vi.fn();

      const unsubscribe = client.subscribe(
        { channel: 'project.updated' },
        handler
      );

      // Respond to subscription
      let sent = ws.getLastSentMessage() as { id: string };
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        id: sent.id,
        result: { subscribed: true }
      });

      // Unsubscribe
      unsubscribe();

      // Respond to unsubscription
      sent = ws.getLastSentMessage() as { id: string };
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        id: sent.id,
        result: { unsubscribed: true }
      });

      // Notification should not call handler
      ws.simulateMessage({
        jsonrpc: JSONRPC_VERSION,
        method: 'project.updated',
        params: { data: 'test' }
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('createSpineClient', () => {
    it('should create client instance', () => {
      const client = createSpineClient({ url: 'ws://localhost:8080' });

      expect(client).toBeInstanceOf(SpineClient);
    });
  });
});
