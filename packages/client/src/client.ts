/**
 * WebSocket client for Spine server
 *
 * Provides:
 * - Connection management with auto-reconnect
 * - Request/response correlation
 * - Subscription management
 * - Typed API methods
 */

import {
  JSONRPC_VERSION,
  SpineApiError,
  isErrorResponse,
  type ClientConfig,
  type ClientState,
  type MessageId,
  type Notification,
  type NotificationHandler,
  type Request,
  type Response,
  type SubscriptionKey
} from './types';

// Default configuration
const DEFAULT_CONFIG: Required<Omit<ClientConfig, 'url' | 'onConnect' | 'onDisconnect' | 'onError'>> = {
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
  requestTimeout: 30000
};

// Pending request tracking
interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Spine WebSocket client
 */
export class SpineClient {
  private config: Required<Omit<ClientConfig, 'onConnect' | 'onDisconnect' | 'onError'>> & ClientConfig;
  private socket: WebSocket | null = null;
  private state: ClientState = 'disconnected';
  private reconnectAttempts = 0;
  private requestId = 0;
  private pendingRequests = new Map<MessageId, PendingRequest>();
  private subscriptions = new Map<string, Set<NotificationHandler>>();
  private activeSubscriptions = new Set<string>();

  constructor(config: ClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
  }

  /**
   * Get current connection state
   */
  getState(): ClientState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to the server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === 'connected') {
        resolve();
        return;
      }

      if (this.state === 'connecting' || this.state === 'reconnecting') {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.state = 'connecting';

      try {
        this.socket = new WebSocket(this.config.url);

        this.socket.onopen = () => {
          this.state = 'connected';
          this.reconnectAttempts = 0;
          this.config.onConnect?.();

          // Resubscribe to active subscriptions
          this.resubscribeAll();

          resolve();
        };

        this.socket.onclose = (event) => {
          const wasConnected = this.state === 'connected';
          this.state = 'disconnected';
          this.socket = null;

          // Reject all pending requests
          for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
            this.pendingRequests.delete(id);
          }

          if (wasConnected) {
            this.config.onDisconnect?.(event.reason);
          }

          // Auto-reconnect if enabled
          if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.socket.onerror = () => {
          const error = new Error('WebSocket error');
          this.config.onError?.(error);

          if (this.state === 'connecting') {
            reject(error);
          }
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        this.state = 'disconnected';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    // Disable auto-reconnect
    this.reconnectAttempts = this.config.maxReconnectAttempts;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.state = 'disconnected';
    this.activeSubscriptions.clear();
  }

  /**
   * Send a request and wait for response
   */
  async request<TResult = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<TResult> {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    const id = this.nextRequestId();
    const request: Request = {
      jsonrpc: JSONRPC_VERSION,
      id,
      method,
      params
    };

    return new Promise<TResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.requestTimeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timeout
      });

      this.socket!.send(JSON.stringify(request));
    });
  }

  /**
   * Subscribe to a channel
   */
  subscribe(
    key: SubscriptionKey,
    handler: NotificationHandler
  ): () => void {
    const serialized = this.serializeKey(key);

    // Add to local handlers
    let handlers = this.subscriptions.get(serialized);
    if (!handlers) {
      handlers = new Set();
      this.subscriptions.set(serialized, handlers);
    }
    handlers.add(handler);

    // Send subscription request if connected and not already subscribed
    if (this.isConnected() && !this.activeSubscriptions.has(serialized)) {
      this.sendSubscribe(key);
      this.activeSubscriptions.add(serialized);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(key, handler);
    };
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(key: SubscriptionKey, handler: NotificationHandler): void {
    const serialized = this.serializeKey(key);

    const handlers = this.subscriptions.get(serialized);
    if (handlers) {
      handlers.delete(handler);

      // If no more handlers, unsubscribe from server
      if (handlers.size === 0) {
        this.subscriptions.delete(serialized);
        this.activeSubscriptions.delete(serialized);

        if (this.isConnected()) {
          this.sendUnsubscribe(key);
        }
      }
    }
  }

  /**
   * Get next request ID
   */
  private nextRequestId(): MessageId {
    return `req-${++this.requestId}`;
  }

  /**
   * Serialize subscription key
   */
  private serializeKey(key: SubscriptionKey): string {
    const parts: string[] = [key.channel];
    if (key.projectId) parts.push(`project:${key.projectId}`);
    if (key.generationId) parts.push(`generation:${key.generationId}`);
    return parts.join(':');
  }

  /**
   * Parse subscription key
   */
  private parseKey(serialized: string): SubscriptionKey {
    const parts = serialized.split(':');
    const key: SubscriptionKey = {
      channel: parts[0] as SubscriptionKey['channel']
    };

    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] === 'project' && parts[i + 1]) {
        key.projectId = parts[i + 1];
      } else if (parts[i] === 'generation' && parts[i + 1]) {
        key.generationId = parts[i + 1];
      }
    }

    return key;
  }

  /**
   * Send subscribe request
   */
  private async sendSubscribe(key: SubscriptionKey): Promise<void> {
    try {
      await this.request('subscribe', {
        channel: key.channel,
        projectId: key.projectId,
        generationId: key.generationId
      });
    } catch {
      // Ignore errors - will retry on reconnect
    }
  }

  /**
   * Send unsubscribe request
   */
  private async sendUnsubscribe(key: SubscriptionKey): Promise<void> {
    try {
      await this.request('unsubscribe', {
        channel: key.channel,
        projectId: key.projectId,
        generationId: key.generationId
      });
    } catch {
      // Ignore errors
    }
  }

  /**
   * Resubscribe to all active subscriptions after reconnect
   */
  private async resubscribeAll(): Promise<void> {
    for (const serialized of this.subscriptions.keys()) {
      const key = this.parseKey(serialized);
      await this.sendSubscribe(key);
      this.activeSubscriptions.add(serialized);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.state = 'reconnecting';
    this.reconnectAttempts++;

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        // Will retry via onclose handler
      }
    }, Math.min(delay, 30000)); // Cap at 30 seconds
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Check if it's a response (has id)
      if ('id' in message && message.id !== null) {
        this.handleResponse(message as Response);
      } else if ('method' in message) {
        this.handleNotification(message as Notification);
      }
    } catch {
      // Ignore malformed messages
    }
  }

  /**
   * Handle response message
   */
  private handleResponse(response: Response): void {
    const pending = this.pendingRequests.get(response.id!);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id!);

    if (isErrorResponse(response)) {
      pending.reject(SpineApiError.fromRpcError(response.error));
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Handle notification message
   */
  private handleNotification(notification: Notification): void {
    // Find matching subscriptions
    for (const [serialized, handlers] of this.subscriptions) {
      const key = this.parseKey(serialized);

      // Check if notification matches subscription
      if (this.matchesSubscription(notification, key)) {
        for (const handler of handlers) {
          try {
            handler(notification.params);
          } catch {
            // Ignore handler errors
          }
        }
      }
    }
  }

  /**
   * Check if notification matches subscription
   */
  private matchesSubscription(
    notification: Notification,
    key: SubscriptionKey
  ): boolean {
    // Channel must match
    if (notification.method !== key.channel) {
      return false;
    }

    // If projectId specified, it must match
    if (key.projectId && notification.params.projectId !== key.projectId) {
      return false;
    }

    // If generationId specified, it must match
    if (key.generationId && notification.params.generationId !== key.generationId) {
      return false;
    }

    return true;
  }
}

/**
 * Create a Spine client
 */
export function createSpineClient(config: ClientConfig): SpineClient {
  return new SpineClient(config);
}
