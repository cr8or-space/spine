/**
 * LLM client configuration
 */

/**
 * LLM provider configuration
 */
export interface LLMConfig {
  /** API endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default model to use */
  defaultModel: string;
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Retry delay multiplier for exponential backoff (default: 2) */
  retryMultiplier?: number;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<LLMConfig> = {
  timeout: 60000,
  maxRetries: 3,
  retryDelay: 1000,
  retryMultiplier: 2,
};

/**
 * Validate LLM configuration
 */
export function validateConfig(config: LLMConfig): void {
  if (!config.endpoint) {
    throw new Error('LLM endpoint is required');
  }

  if (!config.defaultModel) {
    throw new Error('Default model is required');
  }

  // Validate URL format
  try {
    new URL(config.endpoint);
  } catch {
    throw new Error('Invalid endpoint URL');
  }

  // Validate timeout
  if (config.timeout !== undefined && config.timeout <= 0) {
    throw new Error('Timeout must be positive');
  }

  // Validate retry settings
  if (config.maxRetries !== undefined && config.maxRetries < 0) {
    throw new Error('Max retries must be non-negative');
  }

  if (config.retryDelay !== undefined && config.retryDelay < 0) {
    throw new Error('Retry delay must be non-negative');
  }

  if (config.retryMultiplier !== undefined && config.retryMultiplier < 1) {
    throw new Error('Retry multiplier must be >= 1');
  }
}

/**
 * Merge user config with defaults
 */
export function mergeConfig(config: LLMConfig): Required<LLMConfig> {
  return {
    endpoint: config.endpoint,
    apiKey: config.apiKey ?? '',
    defaultModel: config.defaultModel,
    timeout: config.timeout ?? DEFAULT_CONFIG.timeout!,
    maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries!,
    retryDelay: config.retryDelay ?? DEFAULT_CONFIG.retryDelay!,
    retryMultiplier: config.retryMultiplier ?? DEFAULT_CONFIG.retryMultiplier!,
    headers: config.headers ?? {},
  };
}
