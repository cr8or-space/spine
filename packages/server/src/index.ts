/**
 * @repo/server - WebSocket server for Spine API
 *
 * This package provides:
 * - WebSocket server for real-time communication
 * - JSON-RPC 2.0 style protocol
 * - All domain API handlers (project, bible, structure, content, generation, review, analytics, serial)
 * - Subscription system for real-time updates
 * - Connection management
 *
 * Usage:
 * ```typescript
 * import { createSpineServer, type SpineServerConfig } from '@repo/server';
 *
 * const server = createSpineServer({
 *   dataDir: './data',
 *   port: 3001
 * });
 *
 * await server.start();
 * ```
 */

import { createServer, type SpineServer, type ServerConfig } from './server';
import { createServices, type Services, type ServiceConfig } from './services';
import { registerAllHandlers } from './handlers';

export interface SpineServerConfig extends ServiceConfig {
  port?: number;
  host?: string;
}

export interface SpineServerInstance {
  server: SpineServer;
  services: Services;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Create a fully configured Spine server with all handlers registered.
 */
export function createSpineServer(config: SpineServerConfig): SpineServerInstance {
  // Create services
  const services = createServices({
    dataDir: config.dataDir,
    dbPath: config.dbPath,
    llm: config.llm
  });

  // Create server
  const serverConfig: ServerConfig = {
    port: config.port,
    host: config.host
  };
  const server = createServer(serverConfig);

  // Register all handlers
  registerAllHandlers(server.router, services, server.subscriptions);

  return {
    server,
    services,

    async start(): Promise<void> {
      await server.start();
    },

    async stop(): Promise<void> {
      await server.stop();
      services.close();
    }
  };
}

// Re-export core types
export { createServer, type SpineServer, type ServerConfig } from './server';
export { createServices, type Services, type ServiceConfig } from './services';
export { createConnectionManager, type ConnectionManager, type ConnectionState } from './connection';
export { createRouter, ApiError, type Router, type Handler, type HandlerContext } from './router';
export {
  createSubscriptionManager,
  projectSubscription,
  generationSubscription,
  type SubscriptionManager,
  type SubscriptionKey
} from './subscriptions';

// Re-export handlers
export { registerAllHandlers } from './handlers';

// Re-export protocol (available as @repo/server/protocol)
export * from './protocol';

// Standalone server entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const path = await import('path');
  const dataDir = process.env.SPINE_DATA_DIR || path.join(process.cwd(), '.spine-data');
  const port = parseInt(process.env.SPINE_PORT || '3001', 10);

  const llmConfig = process.env.SPINE_LLM_ENDPOINT && process.env.SPINE_LLM_MODEL
    ? {
        endpoint: process.env.SPINE_LLM_ENDPOINT,
        apiKey: process.env.SPINE_LLM_API_KEY,
        defaultModel: process.env.SPINE_LLM_MODEL
      }
    : undefined;

  const instance = createSpineServer({
    dataDir,
    port,
    llm: llmConfig
  });

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await instance.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await instance.stop();
    process.exit(0);
  });

  await instance.start();
  console.log(`Spine server running on port ${port}`);
  console.log(`Data directory: ${dataDir}`);
  if (llmConfig) {
    console.log(`LLM configured: ${llmConfig.endpoint}`);
  }
}
