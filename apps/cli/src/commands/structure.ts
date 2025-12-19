/**
 * Structure Commands
 *
 * Commands for viewing and managing story structure.
 */

import { Command } from 'commander';
import { withClient } from '../client.js';
import { success, error, dim } from '../ui/format.js';
import { promptText, promptStructureType, promptSelect } from '../ui/prompts.js';
import { withSpinner } from '../ui/progress.js';
import { loadConfig } from '../config.js';
import type { Structure } from '@repo/types';

function getProjectId(options: { project?: string }): string {
  const projectId = options.project ?? loadConfig().defaultProject;
  if (!projectId) {
    throw new Error('No project specified. Use --project or set a default project.');
  }
  return projectId;
}

/**
 * Print structure tree recursively
 */
function printTree(structure: Structure, indent = 0, config: { color: boolean }): void {
  const prefix = '  '.repeat(indent);
  const typeLabel = config.color ? dim(`[${structure.type}]`) : `[${structure.type}]`;
  const tensionLabel = structure.tensionTarget
    ? config.color ? dim(` (tension: ${structure.tensionTarget})`) : ` (tension: ${structure.tensionTarget})`
    : '';

  console.log(`${prefix}${structure.title} ${typeLabel}${tensionLabel}`);

  for (const child of structure.children) {
    printTree(child, indent + 1, config);
  }
}

export function createStructureCommand(): Command {
  const structure = new Command('structure')
    .alias('struct')
    .description('Manage story structure')
    .option('-p, --project <id>', 'Project ID');

  // Show structure tree
  structure
    .command('tree')
    .description('Show structure tree')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});
        const config = loadConfig();

        const tree = await withClient(async (client) => {
          return withSpinner('Loading structure...', () =>
            client.structure.getTree(projectId)
          );
        });

        console.log();
        printTree(tree, 0, config);
        console.log();
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load structure'));
        process.exit(1);
      }
    });

  // List structures flat
  structure
    .command('list')
    .alias('ls')
    .description('List all structures')
    .option('-t, --type <type>', 'Filter by type (book, arc, chapter, scene)')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let structures = await withClient(async (client) => {
          return withSpinner('Loading structures...', () =>
            client.structure.getAll(projectId)
          );
        });

        if (options.type) {
          structures = structures.filter((s) => s.type === options.type);
        }

        if (structures.length === 0) {
          console.log('No structures found.');
          return;
        }

        for (const s of structures) {
          const tensionInfo = s.tensionTarget ? ` [tension: ${s.tensionTarget}]` : '';
          console.log(`${s.id}: ${s.title} (${s.type})${tensionInfo}`);
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list structures'));
        process.exit(1);
      }
    });

  // Create structure
  structure
    .command('create')
    .description('Create a new structure element')
    .option('-t, --title <title>', 'Structure title')
    .option('--type <type>', 'Structure type (book, arc, chapter, scene)')
    .option('--parent <id>', 'Parent structure ID')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let title = options.title as string | undefined;
        if (!title) {
          title = await promptText('Structure title:');
        }

        let type = options.type as 'book' | 'arc' | 'chapter' | 'scene' | undefined;
        if (!type) {
          type = await promptStructureType();
        }

        let parentId = options.parent as string | undefined;
        if (!parentId && type !== 'book') {
          // Get available parents
          const structures = await withClient(async (client) => {
            return client.structure.getAll(projectId);
          });

          const validParents = structures.filter((s) => {
            if (type === 'arc') return s.type === 'book';
            if (type === 'chapter') return s.type === 'arc' || s.type === 'book';
            if (type === 'scene') return s.type === 'chapter';
            return false;
          });

          if (validParents.length > 0) {
            parentId = await promptSelect('Parent structure:', validParents.map((s) => ({
              name: `${s.title} (${s.type})`,
              value: s.id
            })));
          }
        }

        const created = await withClient(async (client) => {
          return withSpinner('Creating structure...', () =>
            client.structure.create(projectId, {
              title,
              type,
              parentId
            })
          );
        });

        console.log(success(`Created: ${created.title} (${created.id})`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to create structure'));
        process.exit(1);
      }
    });

  // Show structure details
  structure
    .command('show <id>')
    .description('Show structure details')
    .action(async function (this: Command, id: string) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const struct = await withClient(async (client) => {
          return withSpinner('Loading structure...', () =>
            client.structure.get(projectId, id)
          );
        });

        console.log();
        console.log(`Title: ${struct.title}`);
        console.log(`Type: ${struct.type}`);
        console.log(`ID: ${struct.id}`);
        if (struct.synopsis) {
          console.log(`Synopsis: ${struct.synopsis}`);
        }
        if (struct.tensionTarget !== undefined) {
          console.log(`Tension Target: ${struct.tensionTarget}`);
        }
        if (struct.chapterType) {
          console.log(`Chapter Type: ${struct.chapterType}`);
        }
        if (struct.beats && struct.beats.length > 0) {
          console.log(`Beats: ${struct.beats.length}`);
          for (const beat of struct.beats) {
            console.log(`  - ${beat.description}`);
          }
        }
        if (struct.hook) {
          console.log(`Hook: ${struct.hook.type}`);
          if (struct.hook.description) {
            console.log(`  ${struct.hook.description}`);
          }
        }
        console.log();
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load structure'));
        process.exit(1);
      }
    });

  return structure;
}
