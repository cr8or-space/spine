#!/usr/bin/env node
/**
 * Spine CLI
 *
 * Command-line interface for managing Spine projects.
 * Connects to a Spine server via WebSocket.
 */

import { Command } from 'commander';
import { createProjectCommand } from './commands/project.js';
import { createBibleCommand } from './commands/bible.js';
import { createStructureCommand } from './commands/structure.js';
import { createContentCommand } from './commands/content.js';
import { createGenerateCommand } from './commands/generate.js';
import { createReviewCommand } from './commands/review.js';
import { createConfigCommand } from './commands/config.js';

const program = new Command();

program
  .name('spine')
  .description('CLI for Spine - Web Serial Production Tool')
  .version('0.0.0');

// Register commands
program.addCommand(createProjectCommand());
program.addCommand(createBibleCommand());
program.addCommand(createStructureCommand());
program.addCommand(createContentCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createReviewCommand());
program.addCommand(createConfigCommand());

// Parse and execute
program.parse();
