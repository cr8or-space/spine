/**
 * Subscription manager tests
 */

import { describe, it, expect, vi } from 'vitest';
import { createSubscriptionManager, projectSubscription, generationSubscription } from './subscriptions';
import { createConnectionManager } from './connection';

// Mock WebSocket
function createMockWebSocket() {
  return {
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    readyState: 1 // OPEN
  } as unknown as import('ws').WebSocket;
}

describe('createSubscriptionManager', () => {
  it('should create a subscription manager', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);

    expect(subManager).toBeDefined();
    expect(typeof subManager.subscribe).toBe('function');
    expect(typeof subManager.unsubscribe).toBe('function');
    expect(typeof subManager.broadcast).toBe('function');
    expect(typeof subManager.broadcastToConnection).toBe('function');
    expect(typeof subManager.getSubscriptionCount).toBe('function');
    expect(typeof subManager.cleanup).toBe('function');
  });
});

describe('SubscriptionManager.subscribe', () => {
  it('should add a subscription', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);
    const ws = createMockWebSocket();
    const connection = connManager.add(ws);

    const key = projectSubscription('project.updated', 'proj-123');
    subManager.subscribe(connection, key);

    expect(subManager.getSubscriptionCount(key)).toBe(1);
  });

  it('should allow multiple connections to subscribe to same channel', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);

    const conn1 = connManager.add(createMockWebSocket());
    const conn2 = connManager.add(createMockWebSocket());

    const key = projectSubscription('project.updated', 'proj-123');
    subManager.subscribe(conn1, key);
    subManager.subscribe(conn2, key);

    expect(subManager.getSubscriptionCount(key)).toBe(2);
  });

  it('should not add duplicate subscriptions', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);
    const ws = createMockWebSocket();
    const connection = connManager.add(ws);

    const key = projectSubscription('project.updated', 'proj-123');
    subManager.subscribe(connection, key);
    subManager.subscribe(connection, key);

    expect(subManager.getSubscriptionCount(key)).toBe(1);
  });
});

describe('SubscriptionManager.unsubscribe', () => {
  it('should remove a subscription', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);
    const ws = createMockWebSocket();
    const connection = connManager.add(ws);

    const key = projectSubscription('project.updated', 'proj-123');
    subManager.subscribe(connection, key);
    expect(subManager.getSubscriptionCount(key)).toBe(1);

    subManager.unsubscribe(connection, key);
    expect(subManager.getSubscriptionCount(key)).toBe(0);
  });

  it('should do nothing if subscription does not exist', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);
    const ws = createMockWebSocket();
    const connection = connManager.add(ws);

    const key = projectSubscription('project.updated', 'proj-123');

    // Should not throw
    subManager.unsubscribe(connection, key);
    expect(subManager.getSubscriptionCount(key)).toBe(0);
  });
});

describe('SubscriptionManager.broadcast', () => {
  it('should send event to subscribed connections', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);

    const ws1 = createMockWebSocket();
    const ws2 = createMockWebSocket();
    const conn1 = connManager.add(ws1);
    connManager.add(ws2); // conn2 not subscribed

    const key = projectSubscription('project.updated', 'proj-123');
    subManager.subscribe(conn1, key);

    subManager.broadcast(key, { id: 'proj-123' });

    expect(ws1.send).toHaveBeenCalledOnce();
    expect(ws2.send).not.toHaveBeenCalled();
  });

  it('should send to multiple subscribed connections', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);

    const ws1 = createMockWebSocket();
    const ws2 = createMockWebSocket();
    const conn1 = connManager.add(ws1);
    const conn2 = connManager.add(ws2);

    const key = projectSubscription('project.updated', 'proj-123');
    subManager.subscribe(conn1, key);
    subManager.subscribe(conn2, key);

    subManager.broadcast(key, { id: 'proj-123' });

    expect(ws1.send).toHaveBeenCalledOnce();
    expect(ws2.send).toHaveBeenCalledOnce();
  });

  it('should not fail when no subscribers', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);

    const key = projectSubscription('project.updated', 'proj-123');

    // Should not throw
    subManager.broadcast(key, { id: 'proj-123' });
  });
});

describe('SubscriptionManager.broadcastToConnection', () => {
  it('should send directly to a specific connection', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);

    const ws = createMockWebSocket();
    const connection = connManager.add(ws);

    subManager.broadcastToConnection(connection.id, 'custom.event', { data: 'test' });

    expect(ws.send).toHaveBeenCalledOnce();
  });

  it('should do nothing for unknown connection', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);

    // Should not throw
    subManager.broadcastToConnection('unknown-id', 'custom.event', { data: 'test' });
  });
});

describe('SubscriptionManager.cleanup', () => {
  it('should remove all subscriptions for a connection', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);
    const ws = createMockWebSocket();
    const connection = connManager.add(ws);

    const key1 = projectSubscription('project.updated', 'proj-1');
    const key2 = projectSubscription('content.updated', 'proj-1');

    subManager.subscribe(connection, key1);
    subManager.subscribe(connection, key2);

    expect(subManager.getSubscriptionCount(key1)).toBe(1);
    expect(subManager.getSubscriptionCount(key2)).toBe(1);

    subManager.cleanup(connection.id);

    expect(subManager.getSubscriptionCount(key1)).toBe(0);
    expect(subManager.getSubscriptionCount(key2)).toBe(0);
  });

  it('should not affect other connections', () => {
    const connManager = createConnectionManager();
    const subManager = createSubscriptionManager(connManager);

    const conn1 = connManager.add(createMockWebSocket());
    const conn2 = connManager.add(createMockWebSocket());

    const key = projectSubscription('project.updated', 'proj-123');
    subManager.subscribe(conn1, key);
    subManager.subscribe(conn2, key);

    subManager.cleanup(conn1.id);

    expect(subManager.getSubscriptionCount(key)).toBe(1);
  });
});

describe('Subscription helpers', () => {
  it('projectSubscription creates correct key', () => {
    const key = projectSubscription('project.updated', 'proj-123');
    expect(key.channel).toBe('project.updated');
    expect(key.projectId).toBe('proj-123');
  });

  it('generationSubscription creates correct key', () => {
    const key = generationSubscription('gen-123');
    expect(key.channel).toBe('generation.progress');
    expect(key.generationId).toBe('gen-123');
  });
});
