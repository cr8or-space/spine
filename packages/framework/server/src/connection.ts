import type { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';

/**
 * Connection state management for WebSocket clients.
 */

export interface ConnectionState {
  id: string;
  socket: WebSocket;
  createdAt: Date;
  lastActivity: Date;
  subscriptions: Set<string>;
  activeGenerations: Set<string>;
}

export interface ConnectionManager {
  add(socket: WebSocket): ConnectionState;
  remove(id: string): void;
  get(id: string): ConnectionState | undefined;
  getBySocket(socket: WebSocket): ConnectionState | undefined;
  getAll(): ConnectionState[];
  updateActivity(id: string): void;
  addSubscription(id: string, channel: string): void;
  removeSubscription(id: string, channel: string): void;
  getSubscribers(channel: string): ConnectionState[];
  addGeneration(connectionId: string, generationId: string): void;
  removeGeneration(connectionId: string, generationId: string): void;
  getConnectionByGeneration(generationId: string): ConnectionState | undefined;
}

/**
 * Create a connection manager to track WebSocket clients.
 */
export function createConnectionManager(): ConnectionManager {
  const connections = new Map<string, ConnectionState>();
  const socketToId = new WeakMap<WebSocket, string>();
  const generationToConnection = new Map<string, string>();

  return {
    add(socket: WebSocket): ConnectionState {
      const id = randomUUID();
      const state: ConnectionState = {
        id,
        socket,
        createdAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(),
        activeGenerations: new Set()
      };
      connections.set(id, state);
      socketToId.set(socket, id);
      return state;
    },

    remove(id: string): void {
      const state = connections.get(id);
      if (state) {
        // Clean up generation mappings
        for (const genId of state.activeGenerations) {
          generationToConnection.delete(genId);
        }
        connections.delete(id);
      }
    },

    get(id: string): ConnectionState | undefined {
      return connections.get(id);
    },

    getBySocket(socket: WebSocket): ConnectionState | undefined {
      const id = socketToId.get(socket);
      return id ? connections.get(id) : undefined;
    },

    getAll(): ConnectionState[] {
      return Array.from(connections.values());
    },

    updateActivity(id: string): void {
      const state = connections.get(id);
      if (state) {
        state.lastActivity = new Date();
      }
    },

    addSubscription(id: string, channel: string): void {
      const state = connections.get(id);
      if (state) {
        state.subscriptions.add(channel);
      }
    },

    removeSubscription(id: string, channel: string): void {
      const state = connections.get(id);
      if (state) {
        state.subscriptions.delete(channel);
      }
    },

    getSubscribers(channel: string): ConnectionState[] {
      const subscribers: ConnectionState[] = [];
      for (const state of connections.values()) {
        if (state.subscriptions.has(channel)) {
          subscribers.push(state);
        }
      }
      return subscribers;
    },

    addGeneration(connectionId: string, generationId: string): void {
      const state = connections.get(connectionId);
      if (state) {
        state.activeGenerations.add(generationId);
        generationToConnection.set(generationId, connectionId);
      }
    },

    removeGeneration(connectionId: string, generationId: string): void {
      const state = connections.get(connectionId);
      if (state) {
        state.activeGenerations.delete(generationId);
        generationToConnection.delete(generationId);
      }
    },

    getConnectionByGeneration(generationId: string): ConnectionState | undefined {
      const connectionId = generationToConnection.get(generationId);
      return connectionId ? connections.get(connectionId) : undefined;
    }
  };
}
