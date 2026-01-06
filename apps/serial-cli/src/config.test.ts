/**
 * Tests for CLI configuration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock the config path to use a temp directory
const testConfigDir = join(tmpdir(), 'spine-cli-test-' + Date.now());

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => tmpdir()
  };
});

// Import after mocking
import {
  loadConfig,
  saveConfig,
  updateConfig,
  resetConfig,
  getConfigPath
} from './config.js';

describe('Config', () => {
  beforeEach(() => {
    // Clean up any existing test config
    try {
      rmSync(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  afterEach(() => {
    // Clean up
    try {
      rmSync(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('loadConfig', () => {
    it('should return defaults when no config file exists', () => {
      const config = loadConfig();

      expect(config.serverUrl).toBe('ws://localhost:8080');
      expect(config.outputFormat).toBe('table');
      expect(config.color).toBe(true);
      expect(config.defaultProject).toBeUndefined();
    });

    it('should load config from file', () => {
      // Create config file
      const configPath = getConfigPath();
      mkdirSync(join(configPath, '..'), { recursive: true });
      writeFileSync(configPath, JSON.stringify({
        serverUrl: 'ws://example.com:9000',
        defaultProject: 'test-project'
      }));

      const config = loadConfig();

      expect(config.serverUrl).toBe('ws://example.com:9000');
      expect(config.defaultProject).toBe('test-project');
      // Defaults should still be applied
      expect(config.outputFormat).toBe('table');
      expect(config.color).toBe(true);
    });

    it('should return defaults on invalid JSON', () => {
      const configPath = getConfigPath();
      mkdirSync(join(configPath, '..'), { recursive: true });
      writeFileSync(configPath, 'not valid json');

      const config = loadConfig();

      expect(config.serverUrl).toBe('ws://localhost:8080');
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const config = {
        serverUrl: 'ws://test:8080',
        outputFormat: 'json' as const,
        color: false
      };

      saveConfig(config);

      const configPath = getConfigPath();
      expect(existsSync(configPath)).toBe(true);

      const saved = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(saved.serverUrl).toBe('ws://test:8080');
      expect(saved.outputFormat).toBe('json');
      expect(saved.color).toBe(false);
    });

    it('should create config directory if it does not exist', () => {
      const config = {
        serverUrl: 'ws://test:8080',
        outputFormat: 'table' as const,
        color: true
      };

      saveConfig(config);

      const configPath = getConfigPath();
      expect(existsSync(configPath)).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update specific values', () => {
      // First save
      saveConfig({
        serverUrl: 'ws://original:8080',
        outputFormat: 'table',
        color: true
      });

      // Update
      const updated = updateConfig({ serverUrl: 'ws://updated:8080' });

      expect(updated.serverUrl).toBe('ws://updated:8080');
      expect(updated.outputFormat).toBe('table'); // Unchanged
      expect(updated.color).toBe(true); // Unchanged
    });
  });

  describe('resetConfig', () => {
    it('should reset to defaults', () => {
      // First save custom config
      saveConfig({
        serverUrl: 'ws://custom:8080',
        outputFormat: 'json',
        color: false,
        defaultProject: 'some-project'
      });

      // Reset
      const config = resetConfig();

      expect(config.serverUrl).toBe('ws://localhost:8080');
      expect(config.outputFormat).toBe('table');
      expect(config.color).toBe(true);
      expect(config.defaultProject).toBeUndefined();
    });
  });
});
