/**
 * Configuration tests
 */

import { describe, expect, it } from 'vitest';

import { mergeConfig, validateConfig } from './config';
import type { LLMConfig } from './config';

describe('config', () => {
  describe('validateConfig', () => {
    it('should validate a valid config', () => {
      const config: LLMConfig = {
        endpoint: 'https://api.example.com/v1',
        defaultModel: 'gpt-4',
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw for missing endpoint', () => {
      const config = {
        defaultModel: 'gpt-4',
      } as LLMConfig;
      expect(() => validateConfig(config)).toThrow('endpoint is required');
    });

    it('should throw for missing defaultModel', () => {
      const config = {
        endpoint: 'https://api.example.com/v1',
      } as LLMConfig;
      expect(() => validateConfig(config)).toThrow('Default model is required');
    });

    it('should throw for invalid endpoint URL', () => {
      const config: LLMConfig = {
        endpoint: 'not-a-url',
        defaultModel: 'gpt-4',
      };
      expect(() => validateConfig(config)).toThrow('Invalid endpoint URL');
    });

    it('should throw for negative timeout', () => {
      const config: LLMConfig = {
        endpoint: 'https://api.example.com/v1',
        defaultModel: 'gpt-4',
        timeout: -1000,
      };
      expect(() => validateConfig(config)).toThrow('Timeout must be positive');
    });

    it('should throw for negative maxRetries', () => {
      const config: LLMConfig = {
        endpoint: 'https://api.example.com/v1',
        defaultModel: 'gpt-4',
        maxRetries: -1,
      };
      expect(() => validateConfig(config)).toThrow('Max retries must be non-negative');
    });

    it('should throw for negative retryDelay', () => {
      const config: LLMConfig = {
        endpoint: 'https://api.example.com/v1',
        defaultModel: 'gpt-4',
        retryDelay: -100,
      };
      expect(() => validateConfig(config)).toThrow('Retry delay must be non-negative');
    });

    it('should throw for invalid retryMultiplier', () => {
      const config: LLMConfig = {
        endpoint: 'https://api.example.com/v1',
        defaultModel: 'gpt-4',
        retryMultiplier: 0.5,
      };
      expect(() => validateConfig(config)).toThrow('Retry multiplier must be >= 1');
    });
  });

  describe('mergeConfig', () => {
    it('should merge config with defaults', () => {
      const config: LLMConfig = {
        endpoint: 'https://api.example.com/v1',
        defaultModel: 'gpt-4',
      };
      const merged = mergeConfig(config);

      expect(merged.endpoint).toBe(config.endpoint);
      expect(merged.defaultModel).toBe(config.defaultModel);
      expect(merged.timeout).toBe(60000);
      expect(merged.maxRetries).toBe(3);
      expect(merged.retryDelay).toBe(1000);
      expect(merged.retryMultiplier).toBe(2);
      expect(merged.apiKey).toBe('');
      expect(merged.headers).toEqual({});
    });

    it('should preserve provided values', () => {
      const config: LLMConfig = {
        endpoint: 'https://api.example.com/v1',
        defaultModel: 'gpt-4',
        apiKey: 'test-key',
        timeout: 30000,
        maxRetries: 5,
        retryDelay: 500,
        retryMultiplier: 1.5,
        headers: { 'X-Custom': 'value' },
      };
      const merged = mergeConfig(config);

      expect(merged.apiKey).toBe('test-key');
      expect(merged.timeout).toBe(30000);
      expect(merged.maxRetries).toBe(5);
      expect(merged.retryDelay).toBe(500);
      expect(merged.retryMultiplier).toBe(1.5);
      expect(merged.headers).toEqual({ 'X-Custom': 'value' });
    });
  });
});
