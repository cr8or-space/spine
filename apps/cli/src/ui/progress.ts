/**
 * Progress Indicators
 *
 * Provides spinners and progress bars for long-running operations.
 */

import ora, { type Ora } from 'ora';
import chalk from 'chalk';
import { loadConfig } from '../config.js';

/**
 * Create a spinner for an operation
 */
export function createSpinner(text: string): Ora {
  const config = loadConfig();
  return ora({
    text,
    color: 'cyan',
    isEnabled: config.color
  });
}

/**
 * Run an async operation with a spinner
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  successText?: string
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();

  try {
    const result = await fn();
    spinner.succeed(successText ?? text);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    spinner.fail(`${text}: ${message}`);
    throw error;
  }
}

/**
 * Generation progress tracker
 */
export class GenerationProgress {
  private spinner: Ora;
  private stage: string = '';
  private tokens: number = 0;
  private config = loadConfig();

  constructor() {
    this.spinner = createSpinner('Initializing generation...');
  }

  start(): void {
    this.spinner.start();
  }

  setStage(stage: string): void {
    this.stage = stage;
    this.updateText();
  }

  addToken(token: string): void {
    this.tokens += 1;
    this.updateText();

    // Also stream the token if color is enabled
    if (this.config.color) {
      process.stdout.write(chalk.dim(token));
    }
  }

  private updateText(): void {
    this.spinner.text = `Stage: ${this.stage} | Tokens: ${this.tokens}`;
  }

  succeed(message: string): void {
    if (this.config.color) {
      process.stdout.write('\n');
    }
    this.spinner.succeed(message);
  }

  fail(message: string): void {
    if (this.config.color) {
      process.stdout.write('\n');
    }
    this.spinner.fail(message);
  }

  stop(): void {
    this.spinner.stop();
  }
}
