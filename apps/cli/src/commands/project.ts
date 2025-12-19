/**
 * Project Commands
 *
 * Commands for managing projects: list, create, select, delete.
 */

import { Command } from 'commander';
import { withClient } from '../client.js';
import { formatTable, success, error, header } from '../ui/format.js';
import { promptText, promptSelect, promptConfirm } from '../ui/prompts.js';
import { withSpinner } from '../ui/progress.js';
import { loadConfig, updateConfig } from '../config.js';

export function createProjectCommand(): Command {
  const project = new Command('project')
    .description('Manage projects');

  // List projects
  project
    .command('list')
    .alias('ls')
    .description('List all projects')
    .action(async () => {
      try {
        const projects = await withClient(async (client) => {
          return withSpinner('Fetching projects...', () => client.project.list());
        });

        if (projects.length === 0) {
          console.log('No projects found. Create one with: spine project create');
          return;
        }

        const config = loadConfig();
        const rows = projects.map((p) => [
          p.id === config.defaultProject ? '* ' + p.id : '  ' + p.id,
          p.title,
          p.format ?? 'web-serial',
          new Date(p.updatedAt).toLocaleDateString()
        ]);

        console.log(formatTable(rows, {
          head: ['ID', 'Title', 'Format', 'Updated']
        }));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to list projects'));
        process.exit(1);
      }
    });

  // Create project
  project
    .command('create')
    .description('Create a new project')
    .option('-t, --title <title>', 'Project title')
    .option('-f, --format <format>', 'Project format (web-serial, novel, short-story)', 'web-serial')
    .action(async (options) => {
      try {
        let title = options.title as string | undefined;
        if (!title) {
          title = await promptText('Project title:');
        }

        const format = options.format as 'web-serial' | 'novel' | 'short-story';

        const project = await withClient(async (client) => {
          return withSpinner('Creating project...', () => client.project.create(title, format));
        });

        console.log(success(`Created project: ${project.title} (${project.id})`));

        const setDefault = await promptConfirm('Set as default project?', true);
        if (setDefault) {
          updateConfig({ defaultProject: project.id });
          console.log(success('Set as default project'));
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to create project'));
        process.exit(1);
      }
    });

  // Show project details
  project
    .command('show [id]')
    .description('Show project details')
    .action(async (id?: string) => {
      try {
        const projectId = id ?? loadConfig().defaultProject;
        if (!projectId) {
          console.error(error('No project specified. Use --id or set a default project.'));
          process.exit(1);
        }

        const proj = await withClient(async (client) => {
          return withSpinner('Loading project...', () => client.project.load(projectId));
        });

        console.log(header(proj.title));
        console.log();
        console.log(`ID: ${proj.id}`);
        console.log(`Format: ${proj.format}`);
        console.log(`Created: ${new Date(proj.createdAt).toLocaleString()}`);
        console.log(`Updated: ${new Date(proj.updatedAt).toLocaleString()}`);
        if (proj.metadata?.description) {
          console.log(`Description: ${proj.metadata.description}`);
        }
        if (proj.metadata?.genre) {
          console.log(`Genre: ${proj.metadata.genre}`);
        }
        if (proj.metadata?.targetWordCount) {
          console.log(`Target words: ${proj.metadata.targetWordCount.toLocaleString()}`);
        }
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to load project'));
        process.exit(1);
      }
    });

  // Select default project
  project
    .command('select')
    .description('Select default project')
    .action(async () => {
      try {
        const projects = await withClient(async (client) => {
          return withSpinner('Fetching projects...', () => client.project.list());
        });

        if (projects.length === 0) {
          console.error(error('No projects found. Create one first.'));
          process.exit(1);
        }

        const projectId = await promptSelect('Select project:', projects.map((p) => ({
          name: p.title,
          value: p.id
        })));

        updateConfig({ defaultProject: projectId });
        console.log(success(`Default project set to: ${projectId}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to select project'));
        process.exit(1);
      }
    });

  // Delete project
  project
    .command('delete <id>')
    .description('Delete a project')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id: string, options) => {
      try {
        if (!options.force) {
          const confirmed = await promptConfirm(`Delete project ${id}? This cannot be undone.`);
          if (!confirmed) {
            console.log('Cancelled');
            return;
          }
        }

        await withClient(async (client) => {
          return withSpinner('Deleting project...', () => client.project.delete(id));
        });

        const config = loadConfig();
        if (config.defaultProject === id) {
          updateConfig({ defaultProject: undefined });
        }

        console.log(success(`Deleted project: ${id}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to delete project'));
        process.exit(1);
      }
    });

  return project;
}
