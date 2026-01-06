/**
 * Structure management tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { requireProjectId, selectStructure } from '../context';
import { handleToolCall } from '../utils/errors';
import { formatStructureTree } from '../utils/formatting';

export function registerStructureTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // Get structure tree
  server.tool(
    'spine_structure_tree',
    'Get the hierarchical structure tree (books, arcs, chapters, scenes)',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);

        // Get all structures to build complete tree including all root-level books
        const allStructures = await client.structure.getAll(pid);

        if (allStructures.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '# Structure Tree\n\nNo structures found. Use spine_structure_create to add books, arcs, chapters, or scenes.'
              }
            ]
          };
        }

        // Build a map for quick parent lookup
        const structureMap = new Map(allStructures.map((s) => [s.id, { ...s, children: [] as typeof allStructures }]));

        // Find root structures (no parent) and build tree
        const roots: typeof allStructures = [];
        for (const structure of allStructures) {
          const node = structureMap.get(structure.id)!;
          if (structure.parentId && structureMap.has(structure.parentId)) {
            const parent = structureMap.get(structure.parentId)!;
            parent.children.push(node);
          } else {
            roots.push(node);
          }
        }

        // Sort roots and children by order
        roots.sort((a, b) => a.order - b.order);
        for (const node of structureMap.values()) {
          node.children.sort((a, b) => a.order - b.order);
        }

        // Format each root tree
        const formatted = roots.map((root) => formatStructureTree(root)).join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `# Structure Tree\n\n${formatted}`
            }
          ]
        };
      });
    }
  );

  // List all structures flat
  server.tool(
    'spine_structure_list',
    'Get all structures as a flat list',
    {
      type: z
        .enum(['book', 'arc', 'chapter', 'scene'])
        .optional()
        .describe('Filter by structure type'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, type }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        let structures = await client.structure.getAll(pid);

        if (type) {
          structures = structures.filter((s) => s.type === type);
        }

        if (structures.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: type
                  ? `No ${type}s found. Use spine_structure_create to add structures.`
                  : 'No structures found. Use spine_structure_create to add structures.'
              }
            ]
          };
        }

        const lines = structures.map((s) => {
          let line = `• ${s.title} (${s.id}) - ${s.type}`;
          if (s.tensionTarget !== undefined) {
            line += ` [tension: ${s.tensionTarget}]`;
          }
          if (s.chapterType) {
            line += ` (${s.chapterType})`;
          }
          return line;
        });

        return {
          content: [
            {
              type: 'text',
              text: `# Structures (${structures.length})\n\n${lines.join('\n')}`
            }
          ]
        };
      });
    }
  );

  // Get single structure
  server.tool(
    'spine_structure_get',
    'Get details of a specific structure node',
    {
      id: z.string().describe('Structure ID'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, id }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const structure = await client.structure.get(pid, id);

        const lines: string[] = [
          `# ${structure.title}`,
          '',
          `**Type:** ${structure.type}`,
          `**ID:** ${structure.id}`
        ];

        if (structure.parentId) {
          lines.push(`**Parent ID:** ${structure.parentId}`);
        }

        if (structure.order !== undefined) {
          lines.push(`**Order:** ${structure.order}`);
        }

        if (structure.summary) {
          lines.push(`**Summary:** ${structure.summary}`);
        }

        if (structure.tensionTarget !== undefined) {
          lines.push(`**Tension Target:** ${structure.tensionTarget}`);
        }

        if (structure.chapterType) {
          lines.push(`**Chapter Type:** ${structure.chapterType}`);
        }

        if (structure.targetWordCount !== undefined) {
          lines.push(`**Target Word Count:** ${structure.targetWordCount}`);
        }

        if (structure.notes) {
          lines.push(`**Notes:** ${structure.notes}`);
        }

        if (structure.hook) {
          lines.push(`**Hook:** ${structure.hook.type} - ${structure.hook.description || 'No description'}`);
        }

        if (structure.beats && structure.beats.length > 0) {
          lines.push('', '**Beats:**');
          for (const beat of structure.beats) {
            const completed = beat.completed ? ' ✓' : '';
            lines.push(`  • ${beat.description}${beat.targetWordCount ? ` (~${beat.targetWordCount} words)` : ''}${completed}`);
          }
        }

        if (structure.children && structure.children.length > 0) {
          lines.push('', '**Children:**');
          for (const child of structure.children) {
            lines.push(`  • ${child.title} (${child.type}) - ${child.id}`);
          }
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Create structure
  server.tool(
    'spine_structure_create',
    'Create a new structure node (book, arc, chapter, or scene)',
    {
      title: z.string().describe('Node title'),
      type: z.enum(['book', 'arc', 'chapter', 'scene']).describe('Structure type'),
      parentId: z.string().optional().describe('Parent structure ID'),
      synopsis: z.string().optional().describe('Brief summary'),
      tensionTarget: z.number().optional().describe('Target tension level (0-100)'),
      chapterType: z
        .enum(['action', 'character', 'worldbuilding', 'transition'])
        .optional()
        .describe('Chapter type (for chapters only)'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const structure = await client.structure.create(pid, data);

        // Auto-select the new structure
        selectStructure(session, structure.id);

        return {
          content: [
            {
              type: 'text',
              text: `Created ${structure.type} "${structure.title}" (${structure.id})\n\nStructure is now selected.`
            }
          ]
        };
      });
    }
  );

  // Update structure
  server.tool(
    'spine_structure_update',
    'Update structure properties',
    {
      id: z.string().describe('Structure ID'),
      title: z.string().optional().describe('New title'),
      synopsis: z.string().optional().describe('New synopsis'),
      tensionTarget: z.number().optional().describe('New tension target (0-100)'),
      chapterType: z
        .enum(['action', 'character', 'worldbuilding', 'transition'])
        .optional()
        .describe('New chapter type'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, id, ...data }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const structure = await client.structure.update(pid, id, data);

        return {
          content: [
            {
              type: 'text',
              text: `Updated ${structure.type} "${structure.title}"`
            }
          ]
        };
      });
    }
  );

  // Delete structure
  server.tool(
    'spine_structure_delete',
    'Delete a structure and all its children',
    {
      id: z.string().describe('Structure ID to delete'),
      confirm: z.boolean().describe('Must be true to confirm deletion'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, id, confirm }) => {
      return handleToolCall(async () => {
        if (!confirm) {
          return {
            content: [
              {
                type: 'text',
                text: 'Deletion not confirmed. Set confirm: true to delete the structure and all its children.'
              }
            ]
          };
        }

        const pid = projectId || requireProjectId(session);

        // Clear selection if deleting selected structure
        if (session.currentStructureId === id) {
          session.currentStructureId = null;
        }

        await client.structure.delete(pid, id);

        return {
          content: [
            {
              type: 'text',
              text: `Deleted structure ${id} and all children.`
            }
          ]
        };
      });
    }
  );

  // Select structure
  server.tool(
    'spine_structure_select',
    'Select a structure for subsequent operations',
    {
      id: z.string().describe('Structure ID to select'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, id }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const structure = await client.structure.get(pid, id);

        selectStructure(session, structure.id);

        return {
          content: [
            {
              type: 'text',
              text: `Selected ${structure.type} "${structure.title}" (${structure.id})`
            }
          ]
        };
      });
    }
  );

  // Reorder structure
  server.tool(
    'spine_structure_reorder',
    'Move a structure to a new position',
    {
      id: z.string().describe('Structure ID to move'),
      newOrder: z.number().describe('New position index (0-based)'),
      newParentId: z.string().optional().describe('New parent ID (for reparenting)'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, id, newOrder, newParentId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const structure = await client.structure.reorder(pid, id, newOrder, newParentId);

        return {
          content: [
            {
              type: 'text',
              text: `Moved "${structure.title}" to position ${newOrder}${newParentId ? ` under new parent ${newParentId}` : ''}`
            }
          ]
        };
      });
    }
  );

  // Add beat
  server.tool(
    'spine_structure_add_beat',
    'Add a beat to a chapter or scene',
    {
      structureId: z
        .string()
        .optional()
        .describe('Structure ID (uses selected if not specified)'),
      description: z.string().describe('Beat description'),
      targetWordCount: z.number().optional().describe('Target word count for this beat'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId, description, targetWordCount }) => {
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

        const beat = await client.structure.addBeat(pid, sid, description, targetWordCount);

        return {
          content: [
            {
              type: 'text',
              text: `Added beat: "${beat.description}"${beat.targetWordCount ? ` (~${beat.targetWordCount} words)` : ''}`
            }
          ]
        };
      });
    }
  );

  // Remove beat
  server.tool(
    'spine_structure_remove_beat',
    'Remove a beat from a structure',
    {
      structureId: z.string().describe('Structure ID'),
      beatId: z.string().describe('Beat ID to remove'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId, beatId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        await client.structure.removeBeat(pid, structureId, beatId);

        return {
          content: [{ type: 'text', text: `Removed beat ${beatId}` }]
        };
      });
    }
  );

  // Set hook
  server.tool(
    'spine_structure_set_hook',
    'Set the chapter hook (what keeps readers engaged)',
    {
      structureId: z
        .string()
        .optional()
        .describe('Structure ID (uses selected if not specified)'),
      type: z
        .enum(['revelation', 'decision', 'cliffhanger', 'emotional'])
        .describe('Hook type'),
      description: z.string().optional().describe('Hook description'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId, type, description }) => {
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

        const structure = await client.structure.setHook(pid, sid, { type, description });

        return {
          content: [
            {
              type: 'text',
              text: `Set ${type} hook on "${structure.title}"${description ? `: ${description}` : ''}`
            }
          ]
        };
      });
    }
  );

  // Clear hook
  server.tool(
    'spine_structure_clear_hook',
    'Remove the hook from a structure',
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

        const structure = await client.structure.setHook(pid, sid, null);

        return {
          content: [
            {
              type: 'text',
              text: `Cleared hook from "${structure.title}"`
            }
          ]
        };
      });
    }
  );
}
