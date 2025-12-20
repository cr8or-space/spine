/**
 * MCP Server setup
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFullClient, type FullClient } from '@repo/client';
import { loadConfig, type McpConfig } from './config';
import { createSessionContext, type SessionContext } from './context';
import { registerAllTools } from './tools/index';

export interface SpineMcpServer {
  server: McpServer;
  client: FullClient;
  session: SessionContext;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Create the Spine MCP server
 */
export function createSpineMcpServer(config?: Partial<McpConfig>): SpineMcpServer {
  const mergedConfig = { ...loadConfig(), ...config };

  // Create MCP server
  const server = new McpServer({
    name: 'spine',
    version: '0.0.1'
  });

  // Create WebSocket client for Spine backend
  const client = createFullClient({
    url: mergedConfig.serverUrl,
    autoReconnect: mergedConfig.autoReconnect,
    reconnectDelay: mergedConfig.reconnectDelay,
    requestTimeout: mergedConfig.requestTimeout,
    onConnect: () => {
      console.error('[spine-mcp] Connected to Spine server');
    },
    onDisconnect: (reason) => {
      console.error(`[spine-mcp] Disconnected from Spine server: ${reason || 'unknown'}`);
    },
    onError: (error) => {
      console.error(`[spine-mcp] Connection error: ${error.message}`);
    }
  });

  // Create session context
  const session = createSessionContext();

  // Register all tools
  registerAllTools(server, { client, session });

  return {
    server,
    client,
    session,

    async start(): Promise<void> {
      // Connect to Spine backend
      try {
        await client.connect();
      } catch (error) {
        console.error('[spine-mcp] Failed to connect to Spine server:', error);
        console.error('[spine-mcp] Make sure the Spine server is running at', mergedConfig.serverUrl);
        // Continue anyway - the client will auto-reconnect
      }

      // Start MCP server with stdio transport
      const transport = new StdioServerTransport();
      await server.connect(transport);

      console.error('[spine-mcp] MCP server started');
    },

    async stop(): Promise<void> {
      client.disconnect();
      await server.close();
      console.error('[spine-mcp] MCP server stopped');
    }
  };
}
