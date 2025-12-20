#!/usr/bin/env node
/**
 * Spine MCP Server
 *
 * Model Context Protocol server for Spine - the LLM-assisted web serial writing tool.
 * Exposes Spine functionality as tools for LLM interaction.
 *
 * Usage:
 *   spine-mcp                     # Start with default config
 *   SPINE_SERVER_URL=ws://... spine-mcp  # Override server URL
 *
 * Configuration:
 *   Environment variables:
 *     - SPINE_SERVER_URL: WebSocket URL (default: ws://localhost:8080)
 *     - SPINE_AUTO_RECONNECT: Auto-reconnect on disconnect (default: true)
 *     - SPINE_RECONNECT_DELAY: Reconnect delay in ms (default: 1000)
 *     - SPINE_REQUEST_TIMEOUT: Request timeout in ms (default: 30000)
 *
 *   Config file: ~/.config/spine/mcp.json
 */

import { createSpineMcpServer } from './server';

// Export for programmatic use
export { createSpineMcpServer, type SpineMcpServer } from './server';
export { loadConfig, type McpConfig } from './config';
export {
  createSessionContext,
  hasProject,
  requireProjectId,
  requireStructureId,
  loadProject,
  selectStructure,
  clearContext,
  type SessionContext
} from './context';

// Main entry point
async function main(): Promise<void> {
  const server = createSpineMcpServer();

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('[spine-mcp] Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[spine-mcp] Unhandled rejection:', reason);
    process.exit(1);
  });

  await server.start();
}

// Run if executed directly
main().catch((error) => {
  console.error('[spine-mcp] Fatal error:', error);
  process.exit(1);
});
