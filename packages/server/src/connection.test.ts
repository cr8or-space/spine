/**
 * Connection manager tests
 */

import { describe, it, expect, vi } from 'vitest';
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

describe('createConnectionManager', () => {
  it('should create a connection manager', () => {
    const manager = createConnectionManager();
    expect(manager).toBeDefined();
    expect(typeof manager.add).toBe('function');
    expect(typeof manager.remove).toBe('function');
    expect(typeof manager.get).toBe('function');
    expect(typeof manager.getAll).toBe('function');
    expect(typeof manager.getBySocket).toBe('function');
    expect(typeof manager.updateActivity).toBe('function');
    expect(typeof manager.addSubscription).toBe('function');
    expect(typeof manager.removeSubscription).toBe('function');
    expect(typeof manager.getSubscribers).toBe('function');
  });
});

describe('ConnectionManager.add', () => {
  it('should add a connection and return connection state', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();

    const connection = manager.add(ws);

    expect(connection).toBeDefined();
    expect(connection.id).toBeTruthy();
    expect(connection.socket).toBe(ws);
    expect(connection.createdAt).toBeInstanceOf(Date);
    expect(connection.lastActivity).toBeInstanceOf(Date);
    expect(connection.subscriptions).toBeInstanceOf(Set);
    expect(connection.activeGenerations).toBeInstanceOf(Set);
  });

  it('should generate unique ids for each connection', () => {
    const manager = createConnectionManager();

    const conn1 = manager.add(createMockWebSocket());
    const conn2 = manager.add(createMockWebSocket());

    expect(conn1.id).not.toBe(conn2.id);
  });
});

describe('ConnectionManager.remove', () => {
  it('should remove a connection by id', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    expect(manager.getAll()).toHaveLength(1);

    manager.remove(connection.id);

    expect(manager.getAll()).toHaveLength(0);
    expect(manager.get(connection.id)).toBeUndefined();
  });

  it('should do nothing if connection does not exist', () => {
    const manager = createConnectionManager();
    manager.add(createMockWebSocket());

    expect(manager.getAll()).toHaveLength(1);

    manager.remove('nonexistent-id');

    expect(manager.getAll()).toHaveLength(1);
  });
});

describe('ConnectionManager.get', () => {
  it('should get a connection by id', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    const retrieved = manager.get(connection.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(connection.id);
    expect(retrieved?.socket).toBe(ws);
  });

  it('should return undefined for unknown id', () => {
    const manager = createConnectionManager();

    const connection = manager.get('unknown-id');

    expect(connection).toBeUndefined();
  });
});

describe('ConnectionManager.getBySocket', () => {
  it('should get a connection by socket', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    const retrieved = manager.getBySocket(ws);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(connection.id);
  });

  it('should return undefined for unknown socket', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();

    const connection = manager.getBySocket(ws);

    expect(connection).toBeUndefined();
  });
});

describe('ConnectionManager.getAll', () => {
  it('should return all connections', () => {
    const manager = createConnectionManager();
    const ws1 = createMockWebSocket();
    const ws2 = createMockWebSocket();
    const ws3 = createMockWebSocket();

    manager.add(ws1);
    manager.add(ws2);
    manager.add(ws3);

    const all = manager.getAll();

    expect(all).toHaveLength(3);
  });

  it('should return empty array when no connections', () => {
    const manager = createConnectionManager();

    const all = manager.getAll();

    expect(all).toEqual([]);
  });
});

describe('ConnectionManager.updateActivity', () => {
  it('should update last activity timestamp', async () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    const originalActivity = connection.lastActivity;

    // Wait a bit to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    manager.updateActivity(connection.id);

    const updated = manager.get(connection.id);
    expect(updated?.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
  });
});

describe('ConnectionManager.subscriptions', () => {
  it('should add a subscription to a connection', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    manager.addSubscription(connection.id, 'project.123');

    const updated = manager.get(connection.id);
    expect(updated?.subscriptions.has('project.123')).toBe(true);
  });

  it('should remove a subscription from a connection', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    manager.addSubscription(connection.id, 'project.123');
    manager.removeSubscription(connection.id, 'project.123');

    const updated = manager.get(connection.id);
    expect(updated?.subscriptions.has('project.123')).toBe(false);
  });

  it('should get subscribers for a channel', () => {
    const manager = createConnectionManager();

    const conn1 = manager.add(createMockWebSocket());
    const conn2 = manager.add(createMockWebSocket());
    manager.add(createMockWebSocket()); // conn3 - not subscribed

    manager.addSubscription(conn1.id, 'project.123');
    manager.addSubscription(conn2.id, 'project.123');

    const subscribers = manager.getSubscribers('project.123');

    expect(subscribers).toHaveLength(2);
    expect(subscribers.some((s) => s.id === conn1.id)).toBe(true);
    expect(subscribers.some((s) => s.id === conn2.id)).toBe(true);
  });
});

describe('ConnectionManager.generations', () => {
  it('should add a generation to a connection', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    manager.addGeneration(connection.id, 'gen-123');

    const updated = manager.get(connection.id);
    expect(updated?.activeGenerations.has('gen-123')).toBe(true);
  });

  it('should remove a generation from a connection', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    manager.addGeneration(connection.id, 'gen-123');
    manager.removeGeneration(connection.id, 'gen-123');

    const updated = manager.get(connection.id);
    expect(updated?.activeGenerations.has('gen-123')).toBe(false);
  });

  it('should get connection by generation id', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    manager.addGeneration(connection.id, 'gen-123');

    const found = manager.getConnectionByGeneration('gen-123');
    expect(found?.id).toBe(connection.id);
  });

  it('should clean up generations when connection is removed', () => {
    const manager = createConnectionManager();
    const ws = createMockWebSocket();
    const connection = manager.add(ws);

    manager.addGeneration(connection.id, 'gen-123');
    manager.remove(connection.id);

    const found = manager.getConnectionByGeneration('gen-123');
    expect(found).toBeUndefined();
  });
});
