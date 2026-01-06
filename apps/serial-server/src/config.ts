/**
 * Server Configuration
 *
 * Manages configuration for the Spine server including:
 * - WebSocket server settings
 * - Data directory location
 * - LLM configuration
 */

import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';

export interface LlmConfig {
  /** LLM API endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default model to use */
  defaultModel: string;
}

export interface ServerConfig {
  /** WebSocket server port */
  port: number;
  /** WebSocket server host */
  host: string;
  /** Data directory for SQLite database */
  dataDir: string;
  /** LLM configuration (optional) */
  llm?: LlmConfig;
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 8080,
  host: '0.0.0.0',
  dataDir: join(process.cwd(), '.spine-data')
};

/**
 * Get the config file path
 */
export function getConfigPath(): string {
  const configDir = join(homedir(), '.config', 'spine');
  return join(configDir, 'server.json');
}

/**
 * Load configuration from file
 */
export function loadConfigFromFile(): Partial<ServerConfig> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as Partial<ServerConfig>;
  } catch {
    return {};
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {};

  if (process.env.SPINE_PORT) {
    const port = parseInt(process.env.SPINE_PORT, 10);
    if (!isNaN(port)) {
      config.port = port;
    }
  }

  if (process.env.SPINE_HOST) {
    config.host = process.env.SPINE_HOST;
  }

  if (process.env.SPINE_DATA_DIR) {
    config.dataDir = process.env.SPINE_DATA_DIR;
  }

  // LLM configuration from environment
  if (process.env.SPINE_LLM_ENDPOINT && process.env.SPINE_LLM_MODEL) {
    config.llm = {
      endpoint: process.env.SPINE_LLM_ENDPOINT,
      apiKey: process.env.SPINE_LLM_API_KEY,
      defaultModel: process.env.SPINE_LLM_MODEL
    };
  }

  return config;
}

/**
 * Merge configuration from multiple sources
 * Priority: CLI args > Environment > Config file > Defaults
 */
export function resolveConfig(cliOptions: Partial<ServerConfig> = {}): ServerConfig {
  const fileConfig = loadConfigFromFile();
  const envConfig = loadConfigFromEnv();

  const config = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
    ...cliOptions
  };

  // Resolve dataDir to absolute path
  config.dataDir = resolve(config.dataDir);

  // Merge LLM config properly
  if (cliOptions.llm || envConfig.llm || fileConfig.llm) {
    config.llm = {
      ...fileConfig.llm,
      ...envConfig.llm,
      ...cliOptions.llm
    } as LlmConfig;
  }

  return config;
}

/**
 * Ensure data directory exists
 */
export function ensureDataDir(dataDir: string): void {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Ensure config directory exists
 */
export function ensureConfigDir(): void {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}
