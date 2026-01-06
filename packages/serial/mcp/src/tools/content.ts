/**
 * Content management tools
 */

import { z } from 'zod';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import type { Structure } from '@repo/serial-types';
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

  // Export content to markdown files
  server.tool(
    'spine_content_export',
    'Export chapters to markdown files',
    {
      outputDir: z
        .string()
        .describe('Output directory path (will be created if it does not exist)'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)'),
      structureType: z
        .enum(['chapter', 'scene', 'all'])
        .optional()
        .default('chapter')
        .describe('Type of structures to export (default: chapter)'),
      includeMetadata: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include metadata header in markdown files')
    },
    async ({ outputDir, projectId, structureType, includeMetadata }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);

        // Ensure output directory exists
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        // Get all structures
        const structures = await client.structure.getAll(pid);

        // Filter by type
        const typesToExport = structureType === 'all'
          ? ['chapter', 'scene']
          : [structureType];

        const targetStructures = structures.filter(s =>
          typesToExport.includes(s.type)
        );

        if (targetStructures.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No ${structureType} structures found to export.`
              }
            ]
          };
        }

        // Sort structures by their order for consistent output
        targetStructures.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Build parent title map for context
        const structureMap = new Map<string, Structure>();
        for (const s of structures) {
          structureMap.set(s.id, s);
        }

        const getParentPath = (struct: Structure): string => {
          const parts: string[] = [];
          let current: Structure | undefined = struct;
          while (current?.parentId) {
            const parent = structureMap.get(current.parentId);
            if (parent) {
              parts.unshift(parent.title);
              current = parent;
            } else {
              break;
            }
          }
          return parts.join(' > ');
        };

        const exported: string[] = [];
        const errors: string[] = [];

        for (const structure of targetStructures) {
          try {
            const content = await client.content.get(pid, structure.id);

            if (!content || !content.text) {
              continue; // Skip structures without content
            }

            // Build filename: sanitize title, add order prefix
            const orderPrefix = String(structure.order ?? 0).padStart(2, '0');
            const sanitizedTitle = structure.title
              .replace(/[^a-zA-Z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .toLowerCase();
            const filename = `${orderPrefix}-${sanitizedTitle}.md`;
            const filepath = join(outputDir, filename);

            // Build markdown content
            const lines: string[] = [];

            if (includeMetadata) {
              lines.push('---');
              lines.push(`title: "${structure.title}"`);
              lines.push(`type: ${structure.type}`);
              if (structure.synopsis) {
                lines.push(`synopsis: "${structure.synopsis.replace(/"/g, '\\"')}"`);
              }
              const parentPath = getParentPath(structure);
              if (parentPath) {
                lines.push(`parent: "${parentPath}"`);
              }
              lines.push(`status: ${content.status}`);
              lines.push(`word_count: ${content.wordCount ?? 'unknown'}`);
              lines.push('---');
              lines.push('');
            }

            lines.push(`# ${structure.title}`);
            lines.push('');
            lines.push(content.text);

            writeFileSync(filepath, lines.join('\n'), 'utf-8');
            exported.push(`${filename} (${content.wordCount ?? '?'} words)`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${structure.title}: ${msg}`);
          }
        }

        const resultLines: string[] = [
          `# Export Complete`,
          '',
          `**Output Directory:** ${outputDir}`,
          `**Exported:** ${exported.length} files`,
          ''
        ];

        if (exported.length > 0) {
          resultLines.push('## Files Created');
          for (const file of exported) {
            resultLines.push(`• ${file}`);
          }
        }

        if (errors.length > 0) {
          resultLines.push('');
          resultLines.push('## Errors');
          for (const error of errors) {
            resultLines.push(`• ${error}`);
          }
        }

        return {
          content: [{ type: 'text', text: resultLines.join('\n') }]
        };
      });
    }
  );
}
