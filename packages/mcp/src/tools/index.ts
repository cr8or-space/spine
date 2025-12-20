/**
 * Tool registry and registration
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FullClient } from '@repo/client';
import type { SessionContext } from '../context';
import { registerProjectTools } from './project';
import { registerBibleTools } from './bible';
import { registerStructureTools } from './structure';
import { registerContentTools } from './content';
import { registerGenerationTools } from './generation';
import { registerReviewTools } from './review';
import { registerAnalyticsTools } from './analytics';
import { registerSerialTools } from './serial';

export interface ToolContext {
  client: FullClient;
  session: SessionContext;
}

/**
 * Register all Spine tools with the MCP server
 */
export function registerAllTools(
  server: McpServer,
  context: ToolContext
): void {
  registerProjectTools(server, context);
  registerBibleTools(server, context);
  registerStructureTools(server, context);
  registerContentTools(server, context);
  registerGenerationTools(server, context);
  registerReviewTools(server, context);
  registerAnalyticsTools(server, context);
  registerSerialTools(server, context);
}
