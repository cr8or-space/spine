/**
 * Review workflow tools
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './index';
import { resolveProjectId } from '../context';
import { handleToolCall } from '../utils/errors';

export function registerReviewTools(
  server: McpServer,
  { client, session }: ToolContext
): void {
  // Get review queue
  server.tool(
    'spine_review_queue',
    'Get the review queue (content awaiting review)',
    {
      status: z
        .enum(['draft', 'in_review', 'approved', 'published'])
        .optional()
        .describe('Filter by content status'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, status }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const queue = await client.review.queue(pid, status);

        if (queue.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: status
                  ? `No content with status "${status}" found.`
                  : 'Review queue is empty.'
              }
            ]
          };
        }

        const lines = queue.map(
          (item) =>
            `• ${item.structureTitle} (${item.contentId})\n  Status: ${item.status} | Words: ${item.wordCount} | Updated: ${item.updatedAt}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Review Queue (${queue.length} items)\n\n${lines.join('\n\n')}`
            }
          ]
        };
      });
    }
  );

  // Get review item
  server.tool(
    'spine_review_get',
    'Get a specific content item for review',
    {
      contentId: z.string().describe('Content ID to review'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, contentId }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const content = await client.review.getItem(pid, contentId);

        const lines: string[] = [
          `**Status:** ${content.status}`,
          `**Version:** ${content.version}`,
          `**Word Count:** ${content.wordCount}`,
          ''
        ];

        if (content.comments && content.comments.length > 0) {
          lines.push(`**Comments:** ${content.comments.length}`);
          for (const comment of content.comments) {
            lines.push(`  • [P${comment.paragraphIndex}] ${comment.text}`);
          }
          lines.push('');
        }

        lines.push('---', '', content.text);

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Approve content
  server.tool(
    'spine_review_approve',
    'Approve content and transition to approved status',
    {
      contentId: z.string().describe('Content ID to approve'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, contentId }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const result = await client.review.transitionStatus(pid, contentId, 'approved');

        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `Approved content ${contentId}. New status: ${result.newStatus}`
                : `Could not approve: ${result.reason || 'Unknown error'}`
            }
          ]
        };
      });
    }
  );

  // Publish content
  server.tool(
    'spine_review_publish',
    'Publish approved content (makes it immutable)',
    {
      contentId: z.string().describe('Content ID to publish'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, contentId }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const result = await client.review.transitionStatus(pid, contentId, 'published');

        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `Published content ${contentId}. Content is now immutable.`
                : `Could not publish: ${result.reason || 'Unknown error'}`
            }
          ]
        };
      });
    }
  );

  // Reject content (back to draft)
  server.tool(
    'spine_review_reject',
    'Reject content and return to draft status',
    {
      contentId: z.string().describe('Content ID to reject'),
      reason: z.string().optional().describe('Reason for rejection'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, contentId, reason }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const result = await client.review.transitionStatus(pid, contentId, 'draft', reason);

        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `Rejected content ${contentId}. Status reverted to draft.`
                : `Could not reject: ${result.reason || 'Unknown error'}`
            }
          ]
        };
      });
    }
  );

  // Bulk approve
  server.tool(
    'spine_review_bulk_approve',
    'Approve multiple content items at once',
    {
      contentIds: z.array(z.string()).describe('Content IDs to approve'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, contentIds }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const result = await client.review.bulkApprove(pid, contentIds);

        const lines: string[] = [];

        if (result.succeeded.length > 0) {
          lines.push(`**Approved:** ${result.succeeded.length} items`);
        }

        if (result.failed.length > 0) {
          lines.push(`**Failed:** ${result.failed.length} items`);
          for (const failure of result.failed) {
            lines.push(`  • ${failure.contentId}: ${failure.reason}`);
          }
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Create lock point
  server.tool(
    'spine_review_lock',
    'Create a lock point to protect content from revision cascades',
    {
      structureId: z.string().describe('Structure ID to lock'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, structureId }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const lockPoint = await client.review.createLockPoint(pid, structureId);

        return {
          content: [
            {
              type: 'text',
              text: `Created lock point (${lockPoint.id}) at structure ${structureId}`
            }
          ]
        };
      });
    }
  );

  // Remove lock point
  server.tool(
    'spine_review_unlock',
    'Remove a lock point',
    {
      lockPointId: z.string().describe('Lock point ID to remove'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, lockPointId }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        await client.review.removeLockPoint(pid, lockPointId);

        return {
          content: [
            {
              type: 'text',
              text: `Removed lock point ${lockPointId}`
            }
          ]
        };
      });
    }
  );

  // List lock points
  server.tool(
    'spine_review_locks',
    'List all lock points',
    {
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const locks = await client.review.getLockPoints(pid);

        if (locks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No lock points found.'
              }
            ]
          };
        }

        const lines = locks.map(
          (l) => `• ${l.id} at structure ${l.structureId} (${l.createdAt})`
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Lock Points (${locks.length})\n\n${lines.join('\n')}`
            }
          ]
        };
      });
    }
  );

  // Add comment
  server.tool(
    'spine_review_comment',
    'Add a review comment to content',
    {
      contentId: z.string().describe('Content ID'),
      paragraphIndex: z.number().describe('Paragraph index to comment on'),
      text: z.string().describe('Comment text'),
      author: z.string().optional().describe('Author name'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, contentId, paragraphIndex, text, author }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        await client.review.addComment(pid, contentId, {
          paragraphIndex,
          text,
          author
        });

        return {
          content: [
            {
              type: 'text',
              text: `Added comment to paragraph ${paragraphIndex}`
            }
          ]
        };
      });
    }
  );

  // Preview cascade
  server.tool(
    'spine_review_cascade_preview',
    'Preview revision cascade impact',
    {
      contentId: z.string().describe('Content ID'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, contentId }) => {
      return handleToolCall(async () => {
        const pid = resolveProjectId(projectId, session);
        const preview = await client.review.previewCascade(pid, contentId);

        const lines: string[] = [
          `# Cascade Preview`,
          '',
          `**Affected Structures:** ${preview.affectedStructures.length}`
        ];

        if (preview.affectedStructures.length > 0) {
          for (const structId of preview.affectedStructures) {
            lines.push(`  • ${structId}`);
          }
        }

        if (preview.lockPoints.length > 0) {
          lines.push('', `**Lock Points in Range:** ${preview.lockPoints.length}`);
          for (const lock of preview.lockPoints) {
            lines.push(`  • ${lock.id} at ${lock.structureId}`);
          }
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }]
        };
      });
    }
  );

  // Execute cascade
  server.tool(
    'spine_review_cascade_execute',
    'Execute revision cascade to regenerate affected content',
    {
      contentId: z.string().describe('Content ID'),
      confirm: z.boolean().describe('Must be true to confirm execution'),
      projectId: z.string().optional().describe('Project ID (uses current if not specified)')
    },
    async ({ projectId, contentId, confirm }) => {
      return handleToolCall(async () => {
        if (!confirm) {
          return {
            content: [
              {
                type: 'text',
                text: 'Cascade not confirmed. Use spine_review_cascade_preview to preview impact, then set confirm: true to execute.'
              }
            ]
          };
        }

        const pid = resolveProjectId(projectId, session);
        const result = await client.review.executeCascade(pid, contentId);

        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `Cascade executed successfully. ${result.affected} structures affected.`
                : 'Cascade execution failed.'
            }
          ]
        };
      });
    }
  );
}
