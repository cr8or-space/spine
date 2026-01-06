/**
 * @repo/framework/server - WebSocket server for Spine Framework
 *
 * This package provides:
 * - WebSocket server for real-time communication
 * - JSON-RPC 2.0 style protocol
 * - Domain handler registration system
 * - Generic handlers for entities, content, validation
 * - Subscription system for real-time updates
 * - Connection and session management
 *
 * For domains:
 * ```typescript
 * import {
 *   createServer,
 *   createBaseServices,
 *   registerFrameworkHandlers,
 *   createSessionManager,
 * } from '@repo/framework-server';
 *
 * const services = createBaseServices({ dataDir: './data' });
 * const sessionManager = createSessionManager();
 * const server = createServer({ port: 8080 });
 *
 * registerFrameworkHandlers(server.router, services, server.subscriptions, sessionManager);
 * registerMyDomainHandlers(server.router, services);
 *
 * await server.start();
 * ```
 *
 * For serial domain (backwards compatible):
 * ```typescript
 * import { createSpineServer } from '@repo/framework-server';
 *
 * const instance = createSpineServer({ dataDir: './data', port: 8080 });
 * await instance.start();
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
 *
 * This creates a server with serial-domain handlers for backwards compatibility.
 * For new domains, use createServer + registerFrameworkHandlers + domain handlers.
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

  // Register all handlers (serial domain)
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

// ============================================================================
// Core Server Infrastructure
// ============================================================================

export { createServer, type SpineServer, type ServerConfig } from './server';
export { createConnectionManager, type ConnectionManager, type ConnectionState } from './connection';
export { createRouter, ApiError, type Router, type Handler, type HandlerContext } from './router';
export {
  createSubscriptionManager,
  projectSubscription,
  generationSubscription,
  type SubscriptionManager,
  type SubscriptionKey
} from './subscriptions';

// ============================================================================
// Framework Types (for domains to extend)
// ============================================================================

export type {
  BaseServices,
  BaseProject,
  ProjectService,
  ValidationService,
  ValidationContext,
  DomainHandlerRegistry,
  HandlerDefinition,
  SessionState,
  SessionManager,
} from './types';

// ============================================================================
// Base Services (for domains to use)
// ============================================================================

export {
  createBaseServices,
  extendServices,
  type BaseServicesConfig,
  type BaseServicesState,
} from './base-services';

// ============================================================================
// Session Management
// ============================================================================

export {
  createSessionManager,
  createSessionContext,
  type SessionContext,
} from './session';

// ============================================================================
// Handler Registration
// ============================================================================

export {
  // Framework handlers
  registerFrameworkHandlers,
  type FrameworkHandlerOptions,
  registerEntityHandlers,
  registerGenericContentHandlers,
  registerGenericProjectHandlers,
  registerValidationHandlers,
  // Serial domain handlers (backwards compatible)
  registerAllHandlers,
  registerProjectHandlers,
  registerBibleHandlers,
  registerStructureHandlers,
  registerContentHandlers,
  registerSubscriptionHandlers,
  registerGenerationHandlers,
  registerReviewHandlers,
  registerAnalyticsHandlers,
  registerSerialHandlers,
  registerCascadeHandlers,
  registerSystemHandlers,
  registerExtractionHandlers,
} from './handlers';

// ============================================================================
// Serial Domain Services (backwards compatible)
// ============================================================================

export { createServices, type Services, type ServiceConfig } from './services';

// ============================================================================
// Protocol
// ============================================================================

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
