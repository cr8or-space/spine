#!/usr/bin/env node
/**
 * Spine Server
 *
 * Standalone WebSocket server for Spine API.
 * Provides the backend for CLI, MCP server, and web UI.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createSpineServer, type SpineServerInstance } from '@repo/framework-server';
import { resolveConfig, ensureDataDir, type ServerConfig, type LlmConfig } from './config.js';

const program = new Command();

program
  .name('spine-server')
  .description('Spine WebSocket API Server')
  .version('0.0.0')
  .option('-p, --port <number>', 'WebSocket server port', '8080')
  .option('-H, --host <address>', 'WebSocket server host', '0.0.0.0')
  .option('-d, --data-dir <path>', 'Data directory for SQLite database')
  .option('--llm-endpoint <url>', 'LLM API endpoint URL')
  .option('--llm-api-key <key>', 'LLM API key')
  .option('--llm-model <model>', 'Default LLM model')
  .action(async (options) => {
    await startServer(options);
  });

interface CliOptions {
  port: string;
  host: string;
  dataDir?: string;
  llmEndpoint?: string;
  llmApiKey?: string;
  llmModel?: string;
}

async function startServer(options: CliOptions): Promise<void> {
  // Build config from CLI options
  const cliConfig: Partial<ServerConfig> = {
    port: parseInt(options.port, 10),
    host: options.host
  };

  if (options.dataDir) {
    cliConfig.dataDir = options.dataDir;
  }

  // Build LLM config if provided
  if (options.llmEndpoint && options.llmModel) {
    cliConfig.llm = {
      endpoint: options.llmEndpoint,
      apiKey: options.llmApiKey,
      defaultModel: options.llmModel
    } as LlmConfig;
  }

  // Resolve final configuration
  const config = resolveConfig(cliConfig);

  // Ensure data directory exists
  ensureDataDir(config.dataDir);

  // Display startup info
  console.log(chalk.bold.blue('\n  Spine Server\n'));
  console.log(chalk.gray('  Configuration:'));
  console.log(chalk.gray(`    Port:     ${chalk.white(config.port)}`));
  console.log(chalk.gray(`    Host:     ${chalk.white(config.host)}`));
  console.log(chalk.gray(`    Data Dir: ${chalk.white(config.dataDir)}`));
  if (config.llm) {
    console.log(chalk.gray(`    LLM:      ${chalk.white(config.llm.endpoint)}`));
    console.log(chalk.gray(`    Model:    ${chalk.white(config.llm.defaultModel)}`));
  } else {
    console.log(chalk.gray(`    LLM:      ${chalk.yellow('not configured')}`));
  }
  console.log();

  // Create server instance
  let instance: SpineServerInstance;
  try {
    instance = createSpineServer({
      port: config.port,
      host: config.host,
      dataDir: config.dataDir,
      llm: config.llm
    });
  } catch (error) {
    console.error(chalk.red('Failed to create server:'), error);
    process.exit(1);
  }

  // Handle shutdown signals
  const shutdown = async (): Promise<void> => {
    console.log(chalk.yellow('\n  Shutting down...'));
    try {
      await instance.stop();
      console.log(chalk.green('  Server stopped.\n'));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('  Error during shutdown:'), error);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start server
  try {
    await instance.start();
    console.log(chalk.green(`  Server running at ws://${config.host}:${config.port}`));
    console.log(chalk.gray('  Press Ctrl+C to stop.\n'));
  } catch (error) {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  }
}

// Parse and execute
program.parse();
