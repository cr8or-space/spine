/**
 * Extraction tools - Bible entity detection from content
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { handleToolCall } from '../utils/errors';
import { resolveProjectId } from '../context';

export function registerExtractionTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // Run extraction
  server.tool(
    'spine_extraction_run',
    'Run entity extraction on project content to detect characters, locations, factions, and other entities',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)'),
      entityTypes: z
        .array(z.enum(['character', 'location', 'faction', 'world-rule', 'plot-thread']))
        .optional()
        .describe('Entity types to extract (uses project settings if not specified)'),
      reanalyze: z.boolean().optional().describe('Re-analyze content that was already processed'),
    },
    async ({ projectId, entityTypes, reanalyze }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const result = await client.extraction.run(pid, {
          entityTypes,
          reanalyze: reanalyze ?? false,
        });

        const lines: string[] = [
          '# Extraction Results',
          '',
          `**Structures Analyzed:** ${result.structuresAnalyzed.length}`,
          `**Suggestions Created:** ${result.suggestionsCreated}`,
          `- New entities: ${result.byType.new}`,
          `- Updates: ${result.byType.update}`,
        ];

        if (Object.keys(result.byEntityType).length > 0) {
          lines.push('', '## By Entity Type');
          for (const [type, count] of Object.entries(result.byEntityType)) {
            lines.push(`- ${type.replace('-', ' ')}: ${count}`);
          }
        }

        if (result.errors.length > 0) {
          lines.push('', '## Errors');
          for (const err of result.errors) {
            lines.push(`- ${err}`);
          }
        }

        if (result.suggestionsCreated > 0) {
          lines.push(
            '',
            '---',
            '',
            'Use `spine_extraction_suggestions` to review pending suggestions.'
          );
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      });
    }
  );

  // List suggestions
  server.tool(
    'spine_extraction_suggestions',
    'List entity suggestions from extraction',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)'),
      status: z
        .enum(['pending', 'accepted', 'rejected', 'merged'])
        .optional()
        .describe('Filter by status'),
      entityType: z
        .enum(['character', 'location', 'faction', 'world-rule', 'plot-thread'])
        .optional()
        .describe('Filter by entity type'),
    },
    async ({ projectId, status, entityType }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const suggestions = await client.extraction.suggestions(pid, status, entityType);

        if (suggestions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No suggestions found. Use `spine_extraction_run` to extract entities from content.',
              },
            ],
          };
        }

        const lines: string[] = [
          '# Entity Suggestions',
          '',
          `Found ${suggestions.length} suggestion(s):`,
          '',
        ];

        for (const s of suggestions) {
          const icon = s.suggestionType === 'new' ? '➕' : '📝';
          const confidence =
            s.confidence === 'high' ? '🟢' : s.confidence === 'medium' ? '🟡' : '🔴';
          lines.push(
            `## ${icon} ${s.name}`,
            `- **ID:** ${s.id}`,
            `- **Type:** ${s.entityType.replace('-', ' ')} (${s.suggestionType})`,
            `- **Confidence:** ${confidence} ${s.confidence}`,
            `- **Status:** ${s.status}`,
            `- **Evidence:** ${s.evidenceCount} excerpt(s)`,
            ''
          );
        }

        lines.push(
          '---',
          '',
          'Use `spine_extraction_show` to see details, or `spine_extraction_accept`/`spine_extraction_reject` to review.'
        );

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      });
    }
  );

  // Show suggestion detail
  server.tool(
    'spine_extraction_show',
    'Show details of an entity suggestion',
    {
      suggestionId: z.string().describe('Suggestion ID'),
    },
    async ({ suggestionId }) => {
      return handleToolCall(async () => {
        const suggestion = await client.extraction.suggestion(suggestionId);

        const typeIcon = suggestion.suggestionType === 'new' ? '➕ New' : '📝 Update';
        const confidence =
          suggestion.confidence === 'high'
            ? '🟢 High'
            : suggestion.confidence === 'medium'
              ? '🟡 Medium'
              : '🔴 Low';

        const lines: string[] = [
          `# ${typeIcon} ${suggestion.entityType.replace('-', ' ')}: ${suggestion.name}`,
          '',
          `**ID:** ${suggestion.id}`,
          `**Status:** ${suggestion.status}`,
          `**Confidence:** ${confidence}`,
          '',
          '## Reasoning',
          suggestion.reasoning,
        ];

        if (suggestion.suggestionType === 'new' && suggestion.suggestedData) {
          lines.push('', '## Suggested Data');
          for (const [key, value] of Object.entries(suggestion.suggestedData)) {
            const displayValue =
              typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
            lines.push(`**${key}:** ${displayValue}`);
          }
        }

        if (suggestion.fieldUpdates && suggestion.fieldUpdates.length > 0) {
          lines.push('', '## Field Updates');
          for (const update of suggestion.fieldUpdates) {
            lines.push(
              `### ${update.field}`,
              `- **Current:** ${JSON.stringify(update.currentValue)}`,
              `- **Suggested:** ${JSON.stringify(update.suggestedValue)}`,
              `- **Reason:** ${update.reason}`,
              ''
            );
          }
        }

        if (suggestion.evidence.length > 0) {
          lines.push('', '## Evidence');
          for (const e of suggestion.evidence) {
            lines.push(`> "${e.excerpt}"`);
            if (e.position !== undefined) {
              lines.push(`> _(at position ${e.position}% in ${e.structureId})_`);
            }
            lines.push('');
          }
        }

        if (suggestion.status === 'pending') {
          lines.push(
            '---',
            '',
            'Use `spine_extraction_accept` or `spine_extraction_reject` to review this suggestion.'
          );
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      });
    }
  );

  // Accept suggestion
  server.tool(
    'spine_extraction_accept',
    'Accept an entity suggestion',
    {
      suggestionId: z.string().describe('Suggestion ID to accept'),
      reviewNotes: z.string().optional().describe('Optional review notes'),
    },
    async ({ suggestionId, reviewNotes }) => {
      return handleToolCall(async () => {
        const result = await client.extraction.accept(suggestionId, reviewNotes);

        if (result.success) {
          const lines = [
            '✅ Suggestion accepted.',
            '',
            '**Note:** The entity has not been created yet. Use the appropriate bible command to create it:',
            '- For characters: `spine_bible_character_create`',
            '- For locations: `spine_bible_location_create`',
            '- For factions: `spine_bible_faction_create`',
            '- For world rules: `spine_bible_rule_create`',
            '- For plot threads: `spine_bible_thread_create`',
          ];
          return {
            content: [{ type: 'text', text: lines.join('\n') }],
          };
        } else {
          return {
            content: [{ type: 'text', text: `❌ Failed to accept: ${result.error}` }],
          };
        }
      });
    }
  );

  // Reject suggestion
  server.tool(
    'spine_extraction_reject',
    'Reject an entity suggestion',
    {
      suggestionId: z.string().describe('Suggestion ID to reject'),
      reviewNotes: z.string().optional().describe('Optional review notes'),
    },
    async ({ suggestionId, reviewNotes }) => {
      return handleToolCall(async () => {
        await client.extraction.reject(suggestionId, reviewNotes);
        return {
          content: [{ type: 'text', text: '✅ Suggestion rejected.' }],
        };
      });
    }
  );

  // Get pending count
  server.tool(
    'spine_extraction_pending_count',
    'Get count of pending entity suggestions',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)'),
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const count = await client.extraction.pendingCount(pid);

        if (count === 0) {
          return {
            content: [{ type: 'text', text: 'No pending suggestions.' }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `**${count}** pending suggestion(s) to review.\n\nUse \`spine_extraction_suggestions\` to see them.`,
            },
          ],
        };
      });
    }
  );

  // Cleanup
  server.tool(
    'spine_extraction_cleanup',
    'Clean up old reviewed suggestions',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)'),
      days: z.number().optional().describe('Remove suggestions older than days (default: 30)'),
    },
    async ({ projectId, days }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const deleted = await client.extraction.cleanup(pid, days);

        return {
          content: [
            {
              type: 'text',
              text: `Cleaned up ${deleted} old reviewed suggestion(s).`,
            },
          ],
        };
      });
    }
  );
}
