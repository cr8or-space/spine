/**
 * Web serial feature tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { requireProjectId } from '../context';
import { handleToolCall } from '../utils/errors';

export function registerSerialTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // Get buffer status
  server.tool(
    'spine_serial_buffer',
    'Get release buffer status (how many chapters ahead you are)',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const status = await client.serial.bufferStatus(pid);

        const healthIcon =
          status.health === 'healthy'
            ? '✅'
            : status.health === 'warning'
              ? '⚠️'
              : '🚨';

        const lines: string[] = [
          '# Release Buffer Status',
          '',
          `${healthIcon} **Health:** ${status.health}`,
          `**Current Buffer:** ${status.currentBuffer} chapters`,
          `**Minimum Required:** ${status.minimumBuffer} chapters`
        ];

        if (status.depletionDate) {
          lines.push(`**Depletion Date:** ${status.depletionDate}`);
        }

        if (status.daysUntilDepletion !== undefined) {
          lines.push(`**Days Until Depletion:** ${status.daysUntilDepletion}`);
        }

        // Add recommendation
        lines.push('', '---', '');

        if (status.health === 'critical') {
          lines.push('**Recommendation:** Prioritize content creation immediately to avoid missing releases.');
        } else if (status.health === 'warning') {
          lines.push('**Recommendation:** Buffer is low. Consider increasing writing pace.');
        } else {
          lines.push('**Recommendation:** Buffer is healthy. Maintain current pace.');
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Get release schedule
  server.tool(
    'spine_serial_schedule',
    'Get release schedule and upcoming deadlines',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const result = await client.serial.releaseSchedule(pid);

        const lines: string[] = [
          '# Release Schedule',
          '',
          `**Releases Per Week:** ${result.releasesPerWeek}`
        ];

        if (result.nextReleaseDate) {
          lines.push(`**Next Release:** ${result.nextReleaseDate}`);
        }

        lines.push('', `**Buffer Status:** ${result.depletion.currentBuffer} chapters`);

        if (result.depletion.depletionDate) {
          lines.push(`**Buffer Depletes:** ${result.depletion.depletionDate} (${result.depletion.daysUntilDepletion} days)`);
        }

        if (result.schedule.length > 0) {
          lines.push('', '## Upcoming Releases', '');

          for (const release of result.schedule.slice(0, 10)) {
            const statusIcon = release.status === 'published' ? '✅' : '📅';
            lines.push(`${statusIcon} ${release.date}: ${release.title}`);
          }

          if (result.schedule.length > 10) {
            lines.push(`... and ${result.schedule.length - 10} more`);
          }
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Get hook patterns
  server.tool(
    'spine_serial_hooks',
    'Analyze hook patterns and variety across chapters',
    {
      bookId: z.string().optional().describe('Filter by book ID'),
      arcId: z.string().optional().describe('Filter by arc ID'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, bookId, arcId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const scope = bookId || arcId ? { bookId, arcId } : undefined;
        const patterns = await client.serial.hookPatterns(pid, scope);

        const lines: string[] = ['# Hook Pattern Analysis', ''];

        // Distribution
        if (patterns.distribution) {
          lines.push('## Type Distribution', '');
          for (const [hookType, count] of Object.entries(patterns.distribution)) {
            lines.push(`• ${hookType}: ${count}`);
          }
          lines.push('');
        }

        // Average strength
        if (patterns.averageStrength !== undefined) {
          lines.push(`**Average Hook Strength:** ${patterns.averageStrength.toFixed(1)}/100`);
        }

        // Variety warnings
        if (patterns.warnings && patterns.warnings.length > 0) {
          lines.push('', '## Variety Warnings', '');
          for (const warning of patterns.warnings) {
            lines.push(`⚠️ ${warning}`);
          }
        }

        // Recent hooks
        if (patterns.recentHooks && patterns.recentHooks.length > 0) {
          lines.push('', '## Recent Hooks', '');
          for (const hook of patterns.recentHooks.slice(0, 5)) {
            lines.push(`• ${hook.chapterTitle}: ${hook.type}${hook.strength ? ` (${hook.strength}/100)` : ''}`);
          }
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Get cycle status
  server.tool(
    'spine_serial_cycle',
    'Get tension cycle status and phase detection',
    {
      bookId: z.string().optional().describe('Filter by book ID'),
      arcId: z.string().optional().describe('Filter by arc ID'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, bookId, arcId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const scope = bookId || arcId ? { bookId, arcId } : undefined;
        const cycle = await client.serial.cycleStatus(pid, scope);

        const phaseIcon =
          cycle.currentPhase === 'rising'
            ? '📈'
            : cycle.currentPhase === 'falling'
              ? '📉'
              : cycle.currentPhase === 'climax'
                ? '🔥'
                : '➡️';

        const lines: string[] = [
          '# Tension Cycle Status',
          '',
          `${phaseIcon} **Current Phase:** ${cycle.currentPhase}`,
          `**Cycle Position:** ${cycle.position}/${cycle.cycleLength}`
        ];

        if (cycle.nextTransition) {
          lines.push(`**Next Transition:** ${cycle.nextTransition.phase} in ${cycle.nextTransition.chaptersUntil} chapters`);
        }

        // Recommendations
        if (cycle.recommendations && cycle.recommendations.length > 0) {
          lines.push('', '## Recommendations', '');
          for (const rec of cycle.recommendations) {
            lines.push(`• ${rec}`);
          }
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Get mystery board
  server.tool(
    'spine_serial_mysteries',
    'Get mystery tracking board with clue status',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const mysteries = await client.serial.mysteryBoard(pid);

        if (mysteries.size === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No mysteries tracked. Add plot threads of type "mystery" to see them here.'
              }
            ]
          };
        }

        const lines: string[] = ['# Mystery Board', ''];

        for (const [mysteryId, tracking] of mysteries) {
          const statusIcon =
            tracking.status === 'resolved'
              ? '✅'
              : tracking.status === 'active'
                ? '🔍'
                : '📝';

          lines.push(`## ${statusIcon} ${tracking.mysteryName || mysteryId}`);
          lines.push(`Status: ${tracking.status}`);

          if (tracking.cluesPlanted !== undefined && tracking.cluesRevealed !== undefined) {
            lines.push(`Clues: ${tracking.cluesRevealed}/${tracking.cluesPlanted} revealed`);
          }

          if (tracking.layer) {
            lines.push(`Layer: ${tracking.layer}`);
          }

          if (tracking.estimatedResolution) {
            lines.push(`Expected Resolution: ${tracking.estimatedResolution}`);
          }

          lines.push('');
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );
}
