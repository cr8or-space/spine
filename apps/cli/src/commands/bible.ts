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

  // Create location
  bible
    .command('add-location')
    .description('Add a new location')
    .option('-n, --name <name>', 'Location name')
    .option('-t, --type <type>', 'Location type (city, building, region, landmark, other)')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let name = options.name as string | undefined;
        if (!name) {
          name = await promptText('Location name:');
        }

        let type = options.type as 'city' | 'building' | 'region' | 'landmark' | 'other' | undefined;
        if (!type) {
          type = await promptSelect('Location type:', [
            { name: 'City', value: 'city' as const },
            { name: 'Building', value: 'building' as const },
            { name: 'Region', value: 'region' as const },
            { name: 'Landmark', value: 'landmark' as const },
            { name: 'Other', value: 'other' as const }
          ]);
        }

        const location = await withClient(async (client) => {
          return withSpinner('Creating location...', () =>
            client.bible.location.create(projectId, { name, type })
          );
        });

        console.log(success(`Created location: ${location.name}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to create location'));
        process.exit(1);
      }
    });

  // List factions
  bible
    .command('factions')
    .description('List factions')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const factions = await withClient(async (client) => {
          return withSpinner('Loading factions...', () =>
            client.bible.faction.list(projectId)
          );
        });

        if (factions.length === 0) {
          console.log('No factions found.');
          return;
        }

        const rows = factions.map((f) => [
          f.name,
          f.type,
          truncate(f.description ?? '', 40)
        ]);

        console.log(formatTable(rows, {
          head: ['Name', 'Type', 'Description']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list factions'));
        process.exit(1);
      }
    });

  // Create faction
  bible
    .command('add-faction')
    .description('Add a new faction')
    .option('-n, --name <name>', 'Faction name')
    .option('-t, --type <type>', 'Faction type (organization, government, religion, criminal, military, other)')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let name = options.name as string | undefined;
        if (!name) {
          name = await promptText('Faction name:');
        }

        let type = options.type as 'organization' | 'government' | 'religion' | 'criminal' | 'military' | 'other' | undefined;
        if (!type) {
          type = await promptSelect('Faction type:', [
            { name: 'Organization', value: 'organization' as const },
            { name: 'Government', value: 'government' as const },
            { name: 'Religion', value: 'religion' as const },
            { name: 'Criminal', value: 'criminal' as const },
            { name: 'Military', value: 'military' as const },
            { name: 'Other', value: 'other' as const }
          ]);
        }

        const faction = await withClient(async (client) => {
          return withSpinner('Creating faction...', () =>
            client.bible.faction.create(projectId, { name, type })
          );
        });

        console.log(success(`Created faction: ${faction.name}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to create faction'));
        process.exit(1);
      }
    });

  // List world rules
  bible
    .command('rules')
    .description('List world rules')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const rules = await withClient(async (client) => {
          return withSpinner('Loading world rules...', () =>
            client.bible.worldRule.list(projectId)
          );
        });

        if (rules.length === 0) {
          console.log('No world rules found.');
          return;
        }

        const rows = rules.map((r) => [
          r.name,
          r.category,
          truncate(r.description ?? '', 40)
        ]);

        console.log(formatTable(rows, {
          head: ['Name', 'Category', 'Description']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list world rules'));
        process.exit(1);
      }
    });

  // Create world rule
  bible
    .command('add-rule')
    .description('Add a new world rule')
    .option('-n, --name <name>', 'Rule name')
    .option('-c, --category <category>', 'Rule category (magic, physics, social, economic, other)')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let name = options.name as string | undefined;
        if (!name) {
          name = await promptText('Rule name:');
        }

        let category = options.category as 'magic' | 'physics' | 'social' | 'economic' | 'other' | undefined;
        if (!category) {
          category = await promptSelect('Rule category:', [
            { name: 'Magic', value: 'magic' as const },
            { name: 'Physics', value: 'physics' as const },
            { name: 'Social', value: 'social' as const },
            { name: 'Economic', value: 'economic' as const },
            { name: 'Other', value: 'other' as const }
          ]);
        }

        const rule = await withClient(async (client) => {
          return withSpinner('Creating world rule...', () =>
            client.bible.worldRule.create(projectId, { name, category })
          );
        });

        console.log(success(`Created world rule: ${rule.name}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to create world rule'));
        process.exit(1);
      }
    });

  // Create plot thread
  bible
    .command('add-thread')
    .description('Add a new plot thread')
    .option('-n, --name <name>', 'Thread name')
    .option('-t, --type <type>', 'Thread type (main, subplot, character_arc, mystery, romance)')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let name = options.name as string | undefined;
        if (!name) {
          name = await promptText('Thread name:');
        }

        let type = options.type as 'main' | 'subplot' | 'character_arc' | 'mystery' | 'romance' | undefined;
        if (!type) {
          type = await promptSelect('Thread type:', [
            { name: 'Main', value: 'main' as const },
            { name: 'Subplot', value: 'subplot' as const },
            { name: 'Character Arc', value: 'character_arc' as const },
            { name: 'Mystery', value: 'mystery' as const },
            { name: 'Romance', value: 'romance' as const }
          ]);
        }

        const thread = await withClient(async (client) => {
          return withSpinner('Creating plot thread...', () =>
            client.bible.plotThread.create(projectId, { name, type })
          );
        });

        console.log(success(`Created plot thread: ${thread.name}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to create plot thread'));
        process.exit(1);
      }
    });

  // List timeline events
  bible
    .command('timeline')
    .description('List timeline events')
    .action(async function (this: Command) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        const events = await withClient(async (client) => {
          return withSpinner('Loading timeline events...', () =>
            client.bible.timelineEvent.list(projectId)
          );
        });

        if (events.length === 0) {
          console.log('No timeline events found.');
          return;
        }

        const rows = events.map((e) => [
          e.name,
          e.date,
          e.significance ?? '-',
          truncate(e.description ?? '', 30)
        ]);

        console.log(formatTable(rows, {
          head: ['Name', 'Date', 'Significance', 'Description']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list timeline events'));
        process.exit(1);
      }
    });

  // Create timeline event
  bible
    .command('add-event')
    .description('Add a new timeline event')
    .option('-n, --name <name>', 'Event name')
    .option('-d, --date <date>', 'Event date')
    .option('-s, --significance <significance>', 'Event significance (major, moderate, minor)')
    .action(async function (this: Command, options) {
      try {
        const projectId = getProjectId(this.parent?.opts() ?? {});

        let name = options.name as string | undefined;
        if (!name) {
          name = await promptText('Event name:');
        }

        let date = options.date as string | undefined;
        if (!date) {
          date = await promptText('Event date:');
        }

        let significance = options.significance as 'major' | 'moderate' | 'minor' | undefined;
        if (!significance) {
          significance = await promptSelect('Event significance:', [
            { name: 'Major', value: 'major' as const },
            { name: 'Moderate', value: 'moderate' as const },
            { name: 'Minor', value: 'minor' as const }
          ]);
        }

        const event = await withClient(async (client) => {
          return withSpinner('Creating timeline event...', () =>
            client.bible.timelineEvent.create(projectId, { name, date, significance })
          );
        });

        console.log(success(`Created timeline event: ${event.name}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to create timeline event'));
        process.exit(1);
      }
    });

  return bible;
}
