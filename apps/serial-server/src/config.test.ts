import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import {
  getConfigPath,
  loadConfigFromEnv,
  resolveConfig,
  ensureDataDir
} from './config.js';

describe('config', () => {
  describe('getConfigPath', () => {
    it('returns path in user home config directory', () => {
      const path = getConfigPath();
      expect(path).toContain('.config');
      expect(path).toContain('spine');
      expect(path).toContain('server.json');
    });
  });

  describe('loadConfigFromEnv', () => {
    const original_env = { ...process.env };

    beforeEach(() => {
      // Clear relevant env vars
      delete process.env.SPINE_PORT;
      delete process.env.SPINE_HOST;
      delete process.env.SPINE_DATA_DIR;
      delete process.env.SPINE_LLM_ENDPOINT;
      delete process.env.SPINE_LLM_API_KEY;
      delete process.env.SPINE_LLM_MODEL;
    });

    afterEach(() => {
      process.env = { ...original_env };
    });

    it('returns empty object when no env vars set', () => {
      const config = loadConfigFromEnv();
      expect(config).toEqual({});
    });

    it('loads port from SPINE_PORT', () => {
      process.env.SPINE_PORT = '9000';
      const config = loadConfigFromEnv();
      expect(config.port).toBe(9000);
    });

    it('ignores invalid port', () => {
      process.env.SPINE_PORT = 'invalid';
      const config = loadConfigFromEnv();
      expect(config.port).toBeUndefined();
    });

    it('loads host from SPINE_HOST', () => {
      process.env.SPINE_HOST = 'localhost';
      const config = loadConfigFromEnv();
      expect(config.host).toBe('localhost');
    });

    it('loads dataDir from SPINE_DATA_DIR', () => {
      process.env.SPINE_DATA_DIR = '/custom/data';
      const config = loadConfigFromEnv();
      expect(config.dataDir).toBe('/custom/data');
    });

    it('loads LLM config when endpoint and model are set', () => {
      process.env.SPINE_LLM_ENDPOINT = 'http://localhost:8000';
      process.env.SPINE_LLM_MODEL = 'test-model';
      process.env.SPINE_LLM_API_KEY = 'test-key';

      const config = loadConfigFromEnv();
      expect(config.llm).toEqual({
        endpoint: 'http://localhost:8000',
        defaultModel: 'test-model',
        apiKey: 'test-key'
      });
    });

    it('does not load LLM config when only endpoint is set', () => {
      process.env.SPINE_LLM_ENDPOINT = 'http://localhost:8000';
      const config = loadConfigFromEnv();
      expect(config.llm).toBeUndefined();
    });
  });

  describe('resolveConfig', () => {
    const original_env = { ...process.env };

    beforeEach(() => {
      delete process.env.SPINE_PORT;
      delete process.env.SPINE_HOST;
      delete process.env.SPINE_DATA_DIR;
      delete process.env.SPINE_LLM_ENDPOINT;
      delete process.env.SPINE_LLM_API_KEY;
      delete process.env.SPINE_LLM_MODEL;
    });

    afterEach(() => {
      process.env = { ...original_env };
    });

    it('returns defaults when no config provided', () => {
      const config = resolveConfig();
      expect(config.port).toBe(8080);
      expect(config.host).toBe('0.0.0.0');
      expect(config.dataDir).toContain('.spine-data');
    });

    it('CLI options override env vars', () => {
      process.env.SPINE_PORT = '9000';
      const config = resolveConfig({ port: 3000 });
      expect(config.port).toBe(3000);
    });

    it('env vars override defaults', () => {
      process.env.SPINE_PORT = '9000';
      const config = resolveConfig();
      expect(config.port).toBe(9000);
    });

    it('resolves dataDir to absolute path', () => {
      const config = resolveConfig({ dataDir: './relative/path' });
      expect(config.dataDir).toMatch(/^\//);
      expect(config.dataDir).toContain('relative/path');
    });
  });

  describe('ensureDataDir', () => {
    it('creates directory if it does not exist', async () => {
      const fs = await import('node:fs');
      const tmpDir = join('/tmp', `spine-test-${Date.now()}`);

      expect(fs.existsSync(tmpDir)).toBe(false);
      ensureDataDir(tmpDir);
      expect(fs.existsSync(tmpDir)).toBe(true);

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true });
    });

    it('does not error if directory already exists', async () => {
      const fs = await import('node:fs');
      const tmpDir = join('/tmp', `spine-test-${Date.now()}`);

      fs.mkdirSync(tmpDir, { recursive: true });
      expect(() => ensureDataDir(tmpDir)).not.toThrow();

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true });
    });
  });
});
