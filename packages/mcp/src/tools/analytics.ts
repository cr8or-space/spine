/**
 * Analytics tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { requireProjectId } from '../context';
import { handleToolCall } from '../utils/errors';

export function registerAnalyticsTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // Get tension curve
  server.tool(
    'spine_analytics_tension',
    'Get tension curve data showing planned vs actual tension across chapters',
    {
      bookId: z.string().optional().describe('Filter by book ID'),
      arcId: z.string().optional().describe('Filter by arc ID'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, bookId, arcId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const scope = bookId || arcId ? { bookId, arcId } : undefined;
        const data = await client.analytics.tensionCurve(pid, scope);

        if (!data || data.chapters.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No tension data available. Add chapters with tension targets and content to see analytics.'
              }
            ]
          };
        }

        const lines: string[] = [
          '# Tension Curve',
          '',
          '| Chapter | Planned | Actual | Deviation |',
          '|---------|---------|--------|-----------|'
        ];

        for (const chapter of data.chapters) {
          const planned = chapter.planned ?? '-';
          const actual = chapter.actual ?? '-';
          const deviation =
            chapter.planned !== undefined && chapter.actual !== undefined
              ? `${chapter.actual - chapter.planned > 0 ? '+' : ''}${chapter.actual - chapter.planned}`
              : '-';

          lines.push(`| ${chapter.title} | ${planned} | ${actual} | ${deviation} |`);
        }

        if (data.averageDivergence !== undefined) {
          lines.push('', `**Average Divergence:** ${data.averageDivergence.toFixed(1)} points`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Get character presence
  server.tool(
    'spine_analytics_characters',
    'Get character presence heatmap data showing where characters appear',
    {
      bookId: z.string().optional().describe('Filter by book ID'),
      arcId: z.string().optional().describe('Filter by arc ID'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, bookId, arcId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const scope = bookId || arcId ? { bookId, arcId } : undefined;
        const data = await client.analytics.characterPresence(pid, scope);

        if (data.size === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No character presence data available.'
              }
            ]
          };
        }

        const lines: string[] = ['# Character Presence', ''];

        for (const [charId, tracking] of data) {
          lines.push(`## ${tracking.characterName || charId}`);
          lines.push(`Appearances: ${tracking.appearances.length}`);

          if (tracking.appearances.length > 0) {
            const chapters = tracking.appearances
              .slice(0, 10)
              .map((a) => a.chapterTitle || a.structureId)
              .join(', ');

            lines.push(`Chapters: ${chapters}${tracking.appearances.length > 10 ? '...' : ''}`);
          }

          lines.push('');
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Get plot threads
  server.tool(
    'spine_analytics_threads',
    'Get plot thread timeline data',
    {
      bookId: z.string().optional().describe('Filter by book ID'),
      arcId: z.string().optional().describe('Filter by arc ID'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, bookId, arcId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const scope = bookId || arcId ? { bookId, arcId } : undefined;
        const data = await client.analytics.plotThreads(pid, scope);

        if (data.size === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No plot thread data available.'
              }
            ]
          };
        }

        const lines: string[] = ['# Plot Thread Timeline', ''];

        for (const [threadId, tracking] of data) {
          const statusIcon =
            tracking.status === 'resolved'
              ? '✅'
              : tracking.status === 'active'
                ? '🔄'
                : '📝';

          lines.push(`${statusIcon} **${tracking.threadName || threadId}** (${tracking.status})`);

          if (tracking.startChapter) {
            lines.push(`  Start: Chapter ${tracking.startChapter}`);
          }

          if (tracking.endChapter) {
            lines.push(`  End: Chapter ${tracking.endChapter}`);
          }

          if (tracking.mentions && tracking.mentions.length > 0) {
            lines.push(`  Mentions: ${tracking.mentions.length}`);
          }

          lines.push('');
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Get quality metrics
  server.tool(
    'spine_analytics_quality',
    'Get quality metrics (tension, hooks, continuity issues)',
    {
      bookId: z.string().optional().describe('Filter by book ID'),
      arcId: z.string().optional().describe('Filter by arc ID'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, bookId, arcId }) => {
      return handleToolCall(async () => {
        const pid = projectId || requireProjectId(session);
        const scope = bookId || arcId ? { bookId, arcId } : undefined;
        const metrics = await client.analytics.quality(pid, scope);

        const lines: string[] = [
          '# Quality Metrics',
          '',
          `**Chapters Analyzed:** ${metrics.chaptersAnalyzed}`,
          `**Average Tension Score:** ${metrics.averageTensionScore.toFixed(1)}`,
          `**Average Hook Strength:** ${metrics.averageHookStrength.toFixed(1)}`,
          '',
          `**Continuity Issues:** ${metrics.continuityIssueCount}`,
          `**Chapters with Issues:** ${metrics.chaptersWithIssues} (${metrics.chaptersAnalyzed > 0 ? ((metrics.chaptersWithIssues / metrics.chaptersAnalyzed) * 100).toFixed(0) : 0}%)`
        ];

        // Add quality assessment
        lines.push('', '---', '');

        if (metrics.continuityIssueCount === 0 && metrics.averageHookStrength >= 70) {
          lines.push('**Assessment:** Good narrative health');
        } else if (metrics.continuityIssueCount > 5) {
          lines.push('**Assessment:** Multiple continuity issues need attention');
        } else if (metrics.averageHookStrength < 50) {
          lines.push('**Assessment:** Hook strength could be improved');
        } else {
          lines.push('**Assessment:** Acceptable with room for improvement');
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );
}
