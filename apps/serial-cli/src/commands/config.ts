/**
 * Config Commands
 *
 * Commands for managing CLI configuration.
 */

import { Command } from 'commander';
import { loadConfig, saveConfig, resetConfig, getConfigPath } from '../config.js';
import { success, error, formatKeyValue } from '../ui/format.js';
import { promptText, promptSelect, promptConfirm } from '../ui/prompts.js';

export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage CLI configuration');

  // Show config
  config
    .command('show')
    .alias('ls')
    .description('Show current configuration')
    .action(() => {
      const cfg = loadConfig();
      console.log(`Config file: ${getConfigPath()}`);
      console.log();
      console.log(formatKeyValue({
        'Server URL': cfg.serverUrl,
        'Default Project': cfg.defaultProject ?? '(none)',
        'Output Format': cfg.outputFormat,
        'Color': cfg.color ? 'enabled' : 'disabled'
      }));
    });

  // Set config value
  config
    .command('set <key> [value]')
    .description('Set a configuration value')
    .action(async (key: string, value?: string) => {
      try {
        const cfg = loadConfig();

        switch (key) {
          case 'serverUrl':
          case 'server': {
            const url = value ?? await promptText('Server URL:', cfg.serverUrl);
            cfg.serverUrl = url;
            break;
          }

          case 'defaultProject':
          case 'project': {
            const projectId = value ?? await promptText('Default project ID:');
            cfg.defaultProject = projectId || undefined;
            break;
          }

          case 'outputFormat':
          case 'format': {
            const format = value as 'table' | 'json' | 'plain' | undefined ??
              await promptSelect('Output format:', [
                { name: 'Table', value: 'table' as const },
                { name: 'JSON', value: 'json' as const },
                { name: 'Plain', value: 'plain' as const }
              ]);
            cfg.outputFormat = format;
            break;
          }

          case 'color': {
            const enabled = value === 'true' || value === '1' ||
              (value === undefined && await promptConfirm('Enable color?', cfg.color));
            cfg.color = enabled;
            break;
          }

          default:
            console.error(error(`Unknown config key: ${key}`));
            console.log('Available keys: serverUrl, defaultProject, outputFormat, color');
            process.exit(1);
        }

        saveConfig(cfg);
        console.log(success(`Set ${key}`));
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : 'Failed to set config'));
        process.exit(1);
      }
    });

  // Get config value
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action((key: string) => {
      const cfg = loadConfig();

      switch (key) {
        case 'serverUrl':
        case 'server':
          console.log(cfg.serverUrl);
          break;

        case 'defaultProject':
        case 'project':
          console.log(cfg.defaultProject ?? '');
          break;

        case 'outputFormat':
        case 'format':
          console.log(cfg.outputFormat);
          break;

        case 'color':
          console.log(cfg.color);
          break;

        default:
          console.error(error(`Unknown config key: ${key}`));
          process.exit(1);
      }
    });

  // Reset config
  config
    .command('reset')
    .description('Reset configuration to defaults')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      if (!options.force) {
        const confirmed = await promptConfirm('Reset configuration to defaults?');
        if (!confirmed) {
          return;
        }
      }

      resetConfig();
      console.log(success('Configuration reset'));
    });

  // Show config path
  config
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      console.log(getConfigPath());
    });

  return config;
}
