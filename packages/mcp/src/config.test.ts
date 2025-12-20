/**
 * Configuration tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default config when no overrides', () => {
    const config = loadConfig();

    expect(config.serverUrl).toBe('ws://localhost:8080');
    expect(config.autoReconnect).toBe(true);
    expect(config.reconnectDelay).toBe(1000);
    expect(config.requestTimeout).toBe(30000);
  });

  it('respects SPINE_SERVER_URL environment variable', () => {
    process.env.SPINE_SERVER_URL = 'ws://custom:9999';

    const config = loadConfig();

    expect(config.serverUrl).toBe('ws://custom:9999');
  });

  it('respects SPINE_AUTO_RECONNECT environment variable', () => {
    process.env.SPINE_AUTO_RECONNECT = 'false';

    const config = loadConfig();

    expect(config.autoReconnect).toBe(false);
  });

  it('respects SPINE_RECONNECT_DELAY environment variable', () => {
    process.env.SPINE_RECONNECT_DELAY = '5000';

    const config = loadConfig();

    expect(config.reconnectDelay).toBe(5000);
  });

  it('respects SPINE_REQUEST_TIMEOUT environment variable', () => {
    process.env.SPINE_REQUEST_TIMEOUT = '60000';

    const config = loadConfig();

    expect(config.requestTimeout).toBe(60000);
  });

  it('ignores invalid numeric values', () => {
    process.env.SPINE_RECONNECT_DELAY = 'not-a-number';

    const config = loadConfig();

    expect(config.reconnectDelay).toBe(1000); // default
  });
});
