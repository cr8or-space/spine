/**
 * CLI Configuration
 *
 * Manages configuration for the Spine CLI including:
 * - Server connection settings
 * - Default project selection
 * - Output preferences
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export interface CliConfig {
  /** WebSocket server URL */
  serverUrl: string;
  /** Default project ID to use */
  defaultProject?: string;
  /** Output format: 'table' | 'json' | 'plain' */
  outputFormat: 'table' | 'json' | 'plain';
  /** Enable colored output */
  color: boolean;
}

const DEFAULT_CONFIG: CliConfig = {
  serverUrl: 'ws://localhost:8080',
  outputFormat: 'table',
  color: true
};

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  const configDir = join(homedir(), '.config', 'spine');
  return join(configDir, 'cli.json');
}

/**
 * Load configuration from file
 */
export function loadConfig(): CliConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content) as Partial<CliConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: CliConfig): void {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Update specific config values
 */
export function updateConfig(updates: Partial<CliConfig>): CliConfig {
  const current = loadConfig();
  const updated = { ...current, ...updates };
  saveConfig(updated);
  return updated;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): CliConfig {
  saveConfig(DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG };
}
