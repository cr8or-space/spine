import { WebSocketServer, type WebSocket, type RawData } from 'ws';
import type { Server as HttpServer } from 'node:http';
import { createConnectionManager, type ConnectionManager } from './connection';
import { createRouter, type Router } from './router';
import { createSubscriptionManager, type SubscriptionManager } from './subscriptions';
import { validateRequest, createErrorResponse, ErrorCode } from './protocol';

/**
 * WebSocket server for Spine API.
 */

export interface ServerConfig {
  port?: number;
  host?: string;
  httpServer?: HttpServer;
  pingInterval?: number;
  maxPayloadSize?: number;
}

export interface SpineServer {
  router: Router;
  connections: ConnectionManager;
  subscriptions: SubscriptionManager;
  start(): Promise<void>;
  stop(): Promise<void>;
  broadcast(channel: string, params: Record<string, unknown>): void;
}

const DEFAULT_CONFIG: Required<Omit<ServerConfig, 'httpServer'>> = {
  port: 3001,
  host: '0.0.0.0',
  pingInterval: 30000,
  maxPayloadSize: 10 * 1024 * 1024 // 10MB
};

/**
 * Create a Spine WebSocket server.
 */
export function createServer(config: ServerConfig = {}): SpineServer {
  const { port, host, pingInterval, maxPayloadSize } = {
    ...DEFAULT_CONFIG,
    ...config
  };

  const connections = createConnectionManager();
  const router = createRouter();
  const subscriptions = createSubscriptionManager(connections);

  let wss: WebSocketServer | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  function handleMessage(ws: WebSocket, data: RawData): void {
    const connection = connections.getBySocket(ws);
    if (!connection) {
      return;
    }

    connections.updateActivity(connection.id);

    let message: string;
    if (Buffer.isBuffer(data)) {
      message = data.toString('utf-8');
    } else if (Array.isArray(data)) {
      message = Buffer.concat(data).toString('utf-8');
    } else {
      message = data.toString();
    }

    // Parse and validate request
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      const response = createErrorResponse(null, {
        code: ErrorCode.PARSE_ERROR,
        message: 'Invalid JSON'
      });
      ws.send(JSON.stringify(response));
      return;
    }

    // Validate JSON-RPC structure
    let request;
    try {
      request = validateRequest(parsed);
    } catch {
      const response = createErrorResponse(null, {
        code: ErrorCode.INVALID_REQUEST,
        message: 'Invalid request format'
      });
      ws.send(JSON.stringify(response));
      return;
    }

    // Route the request
    router
      .handle(request, connection)
      .then((response) => {
        ws.send(response);
      })
      .catch((error) => {
        console.error('Unhandled router error:', error);
        const response = createErrorResponse(request.id, {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Internal server error'
        });
        ws.send(JSON.stringify(response));
      });
  }

  function handleConnection(ws: WebSocket): void {
    const connection = connections.add(ws);
    console.log(`Client connected: ${connection.id}`);

    ws.on('message', (data) => handleMessage(ws, data));

    ws.on('close', () => {
      console.log(`Client disconnected: ${connection.id}`);
      subscriptions.cleanup(connection.id);
      connections.remove(connection.id);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${connection.id}:`, error);
    });

    ws.on('pong', () => {
      connections.updateActivity(connection.id);
    });
  }

  function startPingInterval(): void {
    pingTimer = setInterval(() => {
      const now = Date.now();
      for (const conn of connections.getAll()) {
        // Terminate stale connections (no activity for 2x ping interval)
        if (now - conn.lastActivity.getTime() > pingInterval * 2) {
          console.log(`Terminating stale connection: ${conn.id}`);
          conn.socket.terminate();
          continue;
        }

        // Send ping
        if (conn.socket.readyState === 1) {
          // WebSocket.OPEN
          conn.socket.ping();
        }
      }
    }, pingInterval);
  }

  return {
    router,
    connections,
    subscriptions,

    async start(): Promise<void> {
      return new Promise((resolve) => {
        if (config.httpServer) {
          wss = new WebSocketServer({
            server: config.httpServer,
            maxPayload: maxPayloadSize
          });
        } else {
          wss = new WebSocketServer({
            port,
            host,
            maxPayload: maxPayloadSize
          });
        }

        wss.on('connection', handleConnection);

        wss.on('listening', () => {
          console.log(`Spine server listening on ${host}:${port}`);
          startPingInterval();
          resolve();
        });

        // If using httpServer, it's already listening
        if (config.httpServer) {
          startPingInterval();
          resolve();
        }
      });
    },

    async stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }

        if (!wss) {
          resolve();
          return;
        }

        // Close all connections
        for (const conn of connections.getAll()) {
          conn.socket.close(1000, 'Server shutting down');
        }

        wss.close((error) => {
          if (error) {
            reject(error);
          } else {
            console.log('Spine server stopped');
            resolve();
          }
        });
      });
    },

    broadcast(channel: string, params: Record<string, unknown>): void {
      subscriptions.broadcast({ channel }, params);
    }
  };
}
