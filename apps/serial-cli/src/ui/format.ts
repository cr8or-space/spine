/**
 * Output Formatting Utilities
 *
 * Provides consistent formatting for CLI output including
 * tables, JSON, and plain text.
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import { loadConfig } from '../config.js';

export interface TableOptions {
  head: string[];
  colWidths?: number[];
}

/**
 * Format data as a table
 */
export function formatTable(rows: string[][], options: TableOptions): string {
  const config = loadConfig();

  if (config.outputFormat === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  if (config.outputFormat === 'plain') {
    return rows.map((row) => row.join('\t')).join('\n');
  }

  const table = new Table({
    head: config.color ? options.head.map((h) => chalk.bold.cyan(h)) : options.head,
    colWidths: options.colWidths
  });

  for (const row of rows) {
    table.push(row);
  }

  return table.toString();
}

/**
 * Format a key-value object as a table
 */
export function formatKeyValue(data: Record<string, unknown>): string {
  const config = loadConfig();

  if (config.outputFormat === 'json') {
    return JSON.stringify(data, null, 2);
  }

  const rows = Object.entries(data).map(([key, value]) => [
    key,
    String(value ?? '')
  ]);

  return formatTable(rows, { head: ['Property', 'Value'] });
}

/**
 * Format a success message
 */
export function success(message: string): string {
  const config = loadConfig();
  return config.color ? chalk.green(`✓ ${message}`) : `[OK] ${message}`;
}

/**
 * Format an error message
 */
export function error(message: string): string {
  const config = loadConfig();
  return config.color ? chalk.red(`✗ ${message}`) : `[ERROR] ${message}`;
}

/**
 * Format a warning message
 */
export function warning(message: string): string {
  const config = loadConfig();
  return config.color ? chalk.yellow(`⚠ ${message}`) : `[WARN] ${message}`;
}

/**
 * Format an info message
 */
export function info(message: string): string {
  const config = loadConfig();
  return config.color ? chalk.blue(`ℹ ${message}`) : `[INFO] ${message}`;
}

/**
 * Format a header/title
 */
export function header(message: string): string {
  const config = loadConfig();
  return config.color ? chalk.bold.white(message) : `=== ${message} ===`;
}

/**
 * Format a dim/secondary text
 */
export function dim(message: string): string {
  const config = loadConfig();
  return config.color ? chalk.dim(message) : message;
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
