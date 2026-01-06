/**
 * MCP server configuration
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface McpConfig {
  /** WebSocket server URL */
  serverUrl: string;
  /** Auto-reconnect on disconnect */
  autoReconnect: boolean;
  /** Reconnect delay in ms */
  reconnectDelay: number;
  /** Request timeout in ms */
  requestTimeout: number;
}

const DEFAULT_CONFIG: McpConfig = {
  serverUrl: 'ws://localhost:8080',
  autoReconnect: true,
  reconnectDelay: 1000,
  requestTimeout: 30000
};

/**
 * Get config file path
 */
function getConfigPath(): string {
  return join(homedir(), '.config', 'spine', 'mcp.json');
}

/**
 * Load configuration from file
 */
function loadConfigFile(): Partial<McpConfig> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as Partial<McpConfig>;
  } catch {
    return {};
  }
}

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): Partial<McpConfig> {
  const config: Partial<McpConfig> = {};

  if (process.env.SPINE_SERVER_URL) {
    config.serverUrl = process.env.SPINE_SERVER_URL;
  }

  if (process.env.SPINE_AUTO_RECONNECT) {
    config.autoReconnect = process.env.SPINE_AUTO_RECONNECT === 'true';
  }

  if (process.env.SPINE_RECONNECT_DELAY) {
    const delay = parseInt(process.env.SPINE_RECONNECT_DELAY, 10);
    if (!isNaN(delay)) {
      config.reconnectDelay = delay;
    }
  }

  if (process.env.SPINE_REQUEST_TIMEOUT) {
    const timeout = parseInt(process.env.SPINE_REQUEST_TIMEOUT, 10);
    if (!isNaN(timeout)) {
      config.requestTimeout = timeout;
    }
  }

  return config;
}

/**
 * Load merged configuration
 * Priority: Environment > Config file > Defaults
 */
export function loadConfig(): McpConfig {
  const fileConfig = loadConfigFile();
  const envConfig = loadEnvConfig();

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig
  };
}
