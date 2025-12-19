/**
 * Bible Commands
 *
 * Commands for viewing and managing story bible entities.
 */

import { Command } from 'commander';
import { withClient } from '../client.js';
import { formatTable, success, error, header, truncate } from '../ui/format.js';
import { promptText, promptSelect } from '../ui/prompts.js';
import { withSpinner } from '../ui/progress.js';
import { loadConfig } from '../config.js';

function getProjectId(options: { project?: string }): string {
  const projectId = options.project ?? loadConfig().defaultProject;
  if (!projectId) {
    throw new Error('No project specified. Use --project or set a default project.');
  }
  return projectId;
}

export function createBibleCommand(): Command {
  const bible = new Command('bible')
    .description('Manage story bible')
    .option('-p, --project <id>', 'Project ID');

  // Show bible summary
  bible
    .command('show')
    .description('Show bible summary')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const bibleData = await withClient(async (client) => {
          return withSpinner('Loading bible...', () => client.bible.get(projectId));
        });

        console.log(header('Story Bible'));
        console.log();
        console.log(`Characters: ${bibleData.characters.length}`);
        console.log(`Locations: ${bibleData.locations.length}`);
        console.log(`Factions: ${bibleData.factions.length}`);
        console.log(`World Rules: ${bibleData.worldRules.length}`);
        console.log(`Plot Threads: ${bibleData.plotThreads.length}`);
        console.log(`Timeline Events: ${bibleData.timelineEvents.length}`);
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load bible'));
        process.exit(1);
      }
    });

  // List characters
  bible
    .command('characters')
    .alias('chars')
    .description('List characters')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const characters = await withClient(async (client) => {
          return withSpinner('Loading characters...', () =>
            client.bible.character.list(projectId)
          );
        });

        if (characters.length === 0) {
          console.log('No characters found.');
          return;
        }

        const rows = characters.map((c) => [
          c.name,
          c.role,
          truncate(c.description ?? '', 40)
        ]);

        console.log(formatTable(rows, {
          head: ['Name', 'Role', 'Description']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list characters'));
        process.exit(1);
      }
    });

  // List locations
  bible
    .command('locations')
    .alias('locs')
    .description('List locations')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const locations = await withClient(async (client) => {
          return withSpinner('Loading locations...', () =>
            client.bible.location.list(projectId)
          );
        });

        if (locations.length === 0) {
          console.log('No locations found.');
          return;
        }

        const rows = locations.map((l) => [
          l.name,
          l.type,
          truncate(l.description ?? '', 40)
        ]);

        console.log(formatTable(rows, {
          head: ['Name', 'Type', 'Description']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list locations'));
        process.exit(1);
      }
    });

  // List plot threads
  bible
    .command('threads')
    .description('List plot threads')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const threads = await withClient(async (client) => {
          return withSpinner('Loading plot threads...', () =>
            client.bible.plotThread.list(projectId)
          );
        });

        if (threads.length === 0) {
          console.log('No plot threads found.');
          return;
        }

        const rows = threads.map((t) => [
          t.name,
          t.type,
          t.status ?? 'setup',
          truncate(t.description ?? '', 30)
        ]);

        console.log(formatTable(rows, {
          head: ['Name', 'Type', 'Status', 'Description']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list threads'));
        process.exit(1);
      }
    });

  // Create character
  bible
    .command('add-character')
    .description('Add a new character')
    .option('-n, --name <name>', 'Character name')
    .option('-r, --role <role>', 'Character role (protagonist, antagonist, supporting, minor)')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let name = options.name as string | undefined;
        if (!name) {
          name = await promptText('Character name:');
        }

        let role = options.role as 'protagonist' | 'antagonist' | 'supporting' | 'minor' | undefined;
        if (!role) {
          role = await promptSelect('Character role:', [
            { name: 'Protagonist', value: 'protagonist' as const },
            { name: 'Antagonist', value: 'antagonist' as const },
            { name: 'Supporting', value: 'supporting' as const },
            { name: 'Minor', value: 'minor' as const }
          ]);
        }

        const character = await withClient(async (client) => {
          return withSpinner('Creating character...', () =>
            client.bible.character.create(projectId, { name, role })
          );
        });

        console.log(success(`Created character: ${character.name}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to create character'));
        process.exit(1);
      }
    });

  return bible;
}
