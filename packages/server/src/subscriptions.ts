import type { ConnectionManager, ConnectionState } from './connection';
import { createNotification, type Notification, SUBSCRIPTION_CHANNELS } from './protocol';

/**
 * Subscription manager for real-time event broadcasting.
 */

export interface SubscriptionKey {
  channel: string;
  projectId?: string;
  generationId?: string;
}

export interface SubscriptionManager {
  subscribe(connection: ConnectionState, key: SubscriptionKey): void;
  unsubscribe(connection: ConnectionState, key: SubscriptionKey): void;
  broadcast(key: SubscriptionKey, params: Record<string, unknown>): void;
  broadcastToConnection(connectionId: string, method: string, params: Record<string, unknown>): void;
  getSubscriptionCount(key: SubscriptionKey): number;
  cleanup(connectionId: string): void;
}

function serializeKey(key: SubscriptionKey): string {
  const parts = [key.channel];
  if (key.projectId) parts.push(`project:${key.projectId}`);
  if (key.generationId) parts.push(`generation:${key.generationId}`);
  return parts.join(':');
}

/**
 * Create a subscription manager for handling real-time updates.
 */
export function createSubscriptionManager(
  connectionManager: ConnectionManager
): SubscriptionManager {
  // Map from serialized key to set of connection IDs
  const subscriptions = new Map<string, Set<string>>();
  // Map from connection ID to set of serialized keys
  const connectionSubscriptions = new Map<string, Set<string>>();

  function sendToConnection(connection: ConnectionState, notification: Notification): void {
    if (connection.socket.readyState === 1) {
      // WebSocket.OPEN
      connection.socket.send(JSON.stringify(notification));
    }
  }

  return {
    subscribe(connection: ConnectionState, key: SubscriptionKey): void {
      const serialized = serializeKey(key);

      // Add to channel subscriptions
      let subscribers = subscriptions.get(serialized);
      if (!subscribers) {
        subscribers = new Set();
        subscriptions.set(serialized, subscribers);
      }
      subscribers.add(connection.id);

      // Track for cleanup
      let connSubs = connectionSubscriptions.get(connection.id);
      if (!connSubs) {
        connSubs = new Set();
        connectionSubscriptions.set(connection.id, connSubs);
      }
      connSubs.add(serialized);

      // Also add to connection state for simple channel queries
      connectionManager.addSubscription(connection.id, key.channel);
    },

    unsubscribe(connection: ConnectionState, key: SubscriptionKey): void {
      const serialized = serializeKey(key);

      const subscribers = subscriptions.get(serialized);
      if (subscribers) {
        subscribers.delete(connection.id);
        if (subscribers.size === 0) {
          subscriptions.delete(serialized);
        }
      }

      const connSubs = connectionSubscriptions.get(connection.id);
      if (connSubs) {
        connSubs.delete(serialized);
      }

      connectionManager.removeSubscription(connection.id, key.channel);
    },

    broadcast(key: SubscriptionKey, params: Record<string, unknown>): void {
      const serialized = serializeKey(key);
      const subscribers = subscriptions.get(serialized);

      if (!subscribers || subscribers.size === 0) {
        return;
      }

      const notification = createNotification(key.channel, params);

      for (const connectionId of subscribers) {
        const connection = connectionManager.get(connectionId);
        if (connection) {
          sendToConnection(connection, notification);
        }
      }
    },

    broadcastToConnection(
      connectionId: string,
      method: string,
      params: Record<string, unknown>
    ): void {
      const connection = connectionManager.get(connectionId);
      if (connection) {
        const notification = createNotification(method, params);
        sendToConnection(connection, notification);
      }
    },

    getSubscriptionCount(key: SubscriptionKey): number {
      const serialized = serializeKey(key);
      return subscriptions.get(serialized)?.size ?? 0;
    },

    cleanup(connectionId: string): void {
      const connSubs = connectionSubscriptions.get(connectionId);
      if (connSubs) {
        for (const serialized of connSubs) {
          const subscribers = subscriptions.get(serialized);
          if (subscribers) {
            subscribers.delete(connectionId);
            if (subscribers.size === 0) {
              subscriptions.delete(serialized);
            }
          }
        }
        connectionSubscriptions.delete(connectionId);
      }
    }
  };
}

// Helper functions for creating subscription keys
export function projectSubscription(
  channel: string,
  projectId: string
): SubscriptionKey {
  return { channel, projectId };
}

export function generationSubscription(generationId: string): SubscriptionKey {
  return { channel: SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS, generationId };
}
