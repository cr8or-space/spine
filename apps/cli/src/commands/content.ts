/**
 * Content Commands
 *
 * Commands for viewing and managing content.
 */

import { Command } from 'commander';
import { withClient } from '../client.js';
import { success, error, header, dim, info } from '../ui/format.js';
import { promptEditor, promptConfirm } from '../ui/prompts.js';
import { withSpinner } from '../ui/progress.js';
import { loadConfig } from '../config.js';

function getProjectId(options: { project?: string }): string {
  const projectId = options.project ?? loadConfig().defaultProject;
  if (!projectId) {
    throw new Error('No project specified. Use --project or set a default project.');
  }
  return projectId;
}

export function createContentCommand(): Command {
  const content = new Command('content')
    .description('Manage content')
    .option('-p, --project <id>', 'Project ID');

  // View content
  content
    .command('view <structureId>')
    .alias('show')
    .description('View content for a structure')
    .action(async function (this: Command, structureId: string) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const [contentData, structData] = await withClient(async (client) => {
          return Promise.all([
            withSpinner('Loading content...', () =>
              client.content.get(projectId, structureId)
            ),
            client.structure.get(projectId, structureId)
          ]);
        });

        console.log();
        console.log(header(structData.title));
        console.log();

        if (!contentData) {
          console.log(dim('No content yet.'));
          return;
        }

        console.log(info(`Status: ${contentData.status} | Source: ${contentData.source}`));
        console.log(info(`Word count: ${contentData.text.split(/\s+/).length}`));
        console.log();
        console.log(contentData.text);
        console.log();
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load content'));
        process.exit(1);
      }
    });

  // Edit content
  content
    .command('edit <structureId>')
    .description('Edit content for a structure')
    .action(async function (this: Command, structureId: string) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        // Get current content
        const [currentContent, structData] = await withClient(async (client) => {
          return Promise.all([
            client.content.get(projectId, structureId),
            client.structure.get(projectId, structureId)
          ]);
        });

        console.log(info(`Editing: ${structData.title}`));

        // Open editor
        const newText = await promptEditor(
          'Edit content (save and close editor when done):',
          currentContent?.text ?? ''
        );

        if (newText === (currentContent?.text ?? '')) {
          console.log(dim('No changes made.'));
          return;
        }

        const confirmed = await promptConfirm('Save changes?', true);
        if (!confirmed) {
          console.log(dim('Cancelled.'));
          return;
        }

        await withClient(async (client) => {
          return withSpinner('Saving content...', () =>
            client.content.save(projectId, structureId, newText)
          );
        });

        console.log(success('Content saved'));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to edit content'));
        process.exit(1);
      }
    });

  // View history
  content
    .command('history <structureId>')
    .description('View content version history')
    .action(async function (this: Command, structureId: string) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const history = await withClient(async (client) => {
          return withSpinner('Loading history...', () =>
            client.content.getHistory(projectId, structureId)
          );
        });

        if (history.length === 0) {
          console.log('No version history.');
          return;
        }

        console.log(header('Version History'));
        console.log();

        for (const version of history) {
          const wordCount = version.text.split(/\s+/).length;
          console.log(`v${version.version} | ${new Date(version.timestamp).toLocaleString()} | ${wordCount} words`);
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load history'));
        process.exit(1);
      }
    });

  // Rollback to version
  content
    .command('rollback <structureId> <version>')
    .description('Rollback to a specific version')
    .option('-f, --force', 'Skip confirmation')
    .action(async function (this: Command, structureId: string, version: string, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});
        const versionNumber = parseInt(version, 10);

        if (isNaN(versionNumber)) {
          console.error(error('Version must be a number'));
          process.exit(1);
        }

        if (!options.force) {
          const confirmed = await promptConfirm(`Rollback to version ${versionNumber}?`);
          if (!confirmed) {
            console.log(dim('Cancelled.'));
            return;
          }
        }

        await withClient(async (client) => {
          return withSpinner('Rolling back...', () =>
            client.content.rollback(projectId, structureId, versionNumber)
          );
        });

        console.log(success(`Rolled back to version ${versionNumber}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to rollback'));
        process.exit(1);
      }
    });

  return content;
}
