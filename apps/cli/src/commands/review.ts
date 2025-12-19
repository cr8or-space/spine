/**
 * Review Commands
 *
 * Commands for managing the review queue and content status.
 */

import { Command } from 'commander';
import { withClient } from '../client.js';
import { formatTable, success, error, header, truncate } from '../ui/format.js';
import { promptSelect, promptConfirm, promptContentStatus } from '../ui/prompts.js';
import { withSpinner } from '../ui/progress.js';
import { loadConfig } from '../config.js';

function getProjectId(options: { project?: string }): string {
  const projectId = options.project ?? loadConfig().defaultProject;
  if (!projectId) {
    throw new Error('No project specified. Use --project or set a default project.');
  }
  return projectId;
}

export function createReviewCommand(): Command {
  const review = new Command('review')
    .description('Manage review queue')
    .option('-p, --project <id>', 'Project ID');

  // List review queue
  review
    .command('queue')
    .alias('ls')
    .description('Show review queue')
    .option('-s, --status <status>', 'Filter by status')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const queue = await withClient(async (client) => {
          return withSpinner('Loading queue...', () =>
            client.review.queue(projectId, options.status)
          );
        });

        if (queue.length === 0) {
          console.log('Review queue is empty.');
          return;
        }

        console.log(header('Review Queue'));
        console.log();

        const rows = queue.map((item) => [
          item.contentId,
          item.structureTitle ?? 'Unknown',
          item.status,
          item.wordCount?.toString() ?? '-',
          new Date(item.updatedAt).toLocaleDateString()
        ]);

        console.log(formatTable(rows, {
          head: ['ID', 'Title', 'Status', 'Words', 'Updated']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load queue'));
        process.exit(1);
      }
    });

  // View review item
  review
    .command('show <contentId>')
    .description('Show review item details')
    .action(async function (this: Command, contentId: string) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const content = await withClient(async (client) => {
          return withSpinner('Loading content...', () =>
            client.review.getItem(projectId, contentId)
          );
        });

        console.log();
        console.log(`Content ID: ${content.id}`);
        console.log(`Structure: ${content.structureId}`);
        console.log(`Status: ${content.status}`);
        console.log(`Source: ${content.source}`);
        console.log(`Locked: ${content.locked ? 'Yes' : 'No'}`);
        console.log(`Word count: ${content.text.split(/\s+/).length}`);
        console.log();
        console.log('Preview:');
        console.log(truncate(content.text, 500));
        console.log();
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load content'));
        process.exit(1);
      }
    });

  // Transition status
  review
    .command('transition <contentId>')
    .alias('status')
    .description('Transition content status')
    .option('-s, --status <status>', 'New status')
    .option('-r, --reason <reason>', 'Transition reason')
    .action(async function (this: Command, contentId: string, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let newStatus = options.status as 'draft' | 'review' | 'approved' | 'published' | undefined;
        if (!newStatus) {
          newStatus = await promptContentStatus();
        }

        await withClient(async (client) => {
          return withSpinner('Transitioning status...', () =>
            client.review.transitionStatus(projectId, contentId, newStatus, options.reason)
          );
        });

        console.log(success(`Status changed to: ${newStatus}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to transition'));
        process.exit(1);
      }
    });

  // Approve content
  review
    .command('approve <contentId>')
    .description('Approve content (move to approved status)')
    .action(async function (this: Command, contentId: string) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        await withClient(async (client) => {
          return withSpinner('Approving...', () =>
            client.review.transitionStatus(projectId, contentId, 'approved')
          );
        });

        console.log(success('Content approved'));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to approve'));
        process.exit(1);
      }
    });

  // Bulk approve
  review
    .command('bulk-approve')
    .description('Approve multiple content items')
    .option('-a, --all', 'Approve all items in review status')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        // Get items to approve
        const queue = await withClient(async (client) => {
          return client.review.queue(projectId, 'review');
        });

        if (queue.length === 0) {
          console.log('No items in review status.');
          return;
        }

        let contentIds: string[];
        if (options.all) {
          contentIds = queue.map((item) => item.contentId);
        } else {
          // Let user select
          const selected = await promptSelect(
            'Select items to approve:',
            queue.map((item) => ({
              name: `${item.structureTitle ?? item.contentId} (${item.wordCount ?? 0} words)`,
              value: item.contentId
            }))
          );
          contentIds = [selected];
        }

        const confirmed = await promptConfirm(`Approve ${contentIds.length} item(s)?`, true);
        if (!confirmed) {
          return;
        }

        const result = await withClient(async (client) => {
          return withSpinner('Approving...', () =>
            client.review.bulkApprove(projectId, contentIds)
          );
        });

        console.log(success(`Approved: ${result.succeeded.length}`));
        if (result.failed.length > 0) {
          console.log(error(`Failed: ${result.failed.length}`));
          for (const fail of result.failed) {
            console.log(`  ${fail.contentId}: ${fail.reason}`);
          }
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to approve'));
        process.exit(1);
      }
    });

  // Lock points
  review
    .command('locks')
    .description('List lock points')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const locks = await withClient(async (client) => {
          return withSpinner('Loading locks...', () =>
            client.review.getLockPoints(projectId)
          );
        });

        if (locks.length === 0) {
          console.log('No lock points.');
          return;
        }

        console.log(header('Lock Points'));
        console.log();

        const rows = locks.map((lock) => [
          lock.id,
          lock.structureId,
          lock.type,
          lock.reason ?? ''
        ]);

        console.log(formatTable(rows, {
          head: ['ID', 'Structure', 'Type', 'Reason']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list locks'));
        process.exit(1);
      }
    });

  return review;
}
