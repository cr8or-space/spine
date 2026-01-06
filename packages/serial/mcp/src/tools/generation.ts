/**
 * Content generation tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { requireProjectId } from '../context';
import { handleToolCall } from '../utils/errors';

export function registerGenerationTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // Start generation
  server.tool(
    'spine_generate_start',
    'Start LLM content generation for a structure',
    {
      structureId: z
        .string()
        .optional()
        .describe('Structure ID (uses selected if not specified)'),
      stage: z
        .enum(['outline', 'beats', 'draft', 'review'])
        .optional()
        .describe('Generation stage'),
      temperature: z.number().optional().describe('LLM temperature (0-2)'),
      maxTokens: z.number().optional().describe('Maximum tokens to generate'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId, stage, temperature, maxTokens }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const sid = structureId || session.currentStructureId;

        if (!sid) {
          return {
            content: [
              {
                type: 'text',
                text: 'No structure specified or selected. Use structureId parameter or spine_structure_select first.'
              }
            ]
          };
        }

        const options: Record<string, unknown> = {};
        if (stage) options.stage = stage;
        if (temperature !== undefined) options.temperature = temperature;
        if (maxTokens !== undefined) options.maxTokens = maxTokens;

        const result = await client.generation.start(
          pid,
          sid,
          Object.keys(options).length > 0 ? options : undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: `Started generation (ID: ${result.generationId})\n\nUse spine_generate_status to check progress.`
            }
          ]
        };
      });
    }
  );

  // Check generation status
  server.tool(
    'spine_generate_status',
    'Check the status of a content generation',
    {
      generationId: z.string().describe('Generation ID to check')
    },
    async ({ generationId }) => {
      return handleToolCall(async () => {
        const status = await client.generation.status(generationId);

        const lines: string[] = [
          `**Status:** ${status.status}`,
          ''
        ];

        if (status.pipelineState) {
          const state = status.pipelineState;
          lines.push(`**Current Stage:** ${state.currentStage}`);

          if (state.stages) {
            lines.push('', '**Stage Progress:**');
            for (const [stageName, stageData] of Object.entries(state.stages)) {
              const stageInfo = stageData as { status: string; progress?: number };
              lines.push(
                `  • ${stageName}: ${stageInfo.status}${stageInfo.progress !== undefined ? ` (${Math.round(stageInfo.progress * 100)}%)` : ''}`
              );
            }
          }
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Cancel generation
  server.tool(
    'spine_generate_cancel',
    'Cancel a running content generation',
    {
      generationId: z.string().describe('Generation ID to cancel')
    },
    async ({ generationId }) => {
      return handleToolCall(async () => {
        await client.generation.cancel(generationId);

        return {
          content: [
            {
              type: 'text',
              text: `Cancelled generation ${generationId}`
            }
          ]
        };
      });
    }
  );

  // Retry generation stage
  server.tool(
    'spine_generate_retry',
    'Retry a failed generation stage',
    {
      generationId: z.string().describe('Generation ID'),
      stage: z
        .enum(['outline', 'beats', 'draft', 'review'])
        .describe('Stage to retry')
    },
    async ({ generationId, stage }) => {
      return handleToolCall(async () => {
        await client.generation.retry(generationId, stage);

        return {
          content: [
            {
              type: 'text',
              text: `Retrying ${stage} stage for generation ${generationId}`
            }
          ]
        };
      });
    }
  );
}
