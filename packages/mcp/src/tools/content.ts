/**
 * Content management tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { requireProjectId } from '../context';
import { handleToolCall } from '../utils/errors';

export function registerContentTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // Get content
  server.tool(
    'spine_content_get',
    'Get the content (prose) for a structure',
    {
      structureId: z
        .string()
        .optional()
        .describe('Structure ID (uses selected if not specified)'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId }) => {
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

        const content = await client.content.get(pid, sid);

        if (!content) {
          return {
            content: [
              {
                type: 'text',
                text: 'No content found for this structure. Use spine_content_save to add content.'
              }
            ]
          };
        }

        const lines: string[] = [
          `**Status:** ${content.status}`,
          `**Version:** ${content.version}`,
          `**Word Count:** ${content.wordCount}`,
          '',
          '---',
          '',
          content.text
        ];

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Save content
  server.tool(
    'spine_content_save',
    'Save content (prose) for a structure',
    {
      text: z.string().describe('Content text'),
      structureId: z
        .string()
        .optional()
        .describe('Structure ID (uses selected if not specified)'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId, text }) => {
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

        const content = await client.content.save(pid, sid, text);

        return {
          content: [
            {
              type: 'text',
              text: `Saved content (version ${content.version}, ${content.wordCount} words)\nStatus: ${content.status}`
            }
          ]
        };
      });
    }
  );

  // Get content history
  server.tool(
    'spine_content_history',
    'Get version history for content',
    {
      structureId: z
        .string()
        .optional()
        .describe('Structure ID (uses selected if not specified)'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const sid = structureId || session.currentStructureId;

        if (!sid) {
          return {
            content: [
              {
                type: 'text',
                text: 'No structure specified or selected.'
              }
            ]
          };
        }

        const history = await client.content.getHistory(pid, sid);

        if (history.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No version history found.'
              }
            ]
          };
        }

        const lines = history.map(
          (v) =>
            `• Version ${v.versionNumber} (${v.createdAt})\n  ${v.wordCount} words - ${v.source || 'manual'}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Version History (${history.length} versions)\n\n${lines.join('\n\n')}`
            }
          ]
        };
      });
    }
  );

  // Rollback content
  server.tool(
    'spine_content_rollback',
    'Rollback content to a previous version',
    {
      versionNumber: z.number().describe('Version number to restore'),
      structureId: z
        .string()
        .optional()
        .describe('Structure ID (uses selected if not specified)'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId, versionNumber }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const sid = structureId || session.currentStructureId;

        if (!sid) {
          return {
            content: [
              {
                type: 'text',
                text: 'No structure specified or selected.'
              }
            ]
          };
        }

        const content = await client.content.rollback(pid, sid, versionNumber);

        return {
          content: [
            {
              type: 'text',
              text: `Rolled back to version ${versionNumber}. Current version is now ${content.version}.`
            }
          ]
        };
      });
    }
  );
}
