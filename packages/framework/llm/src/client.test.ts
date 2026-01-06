/**
 * LLM client tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLLMClient } from './client';
import type { LLMConfig } from './config';
import type { ChatCompletionResponse } from './types';
import { LLMError } from './types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('LLMClient', () => {
  const config: LLMConfig = {
    endpoint: 'https://api.example.com/v1',
    defaultModel: 'test-model',
    apiKey: 'test-key',
    timeout: 5000,
    maxRetries: 2,
    retryDelay: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('chat', () => {
    it('should make a successful chat request', async () => {
      const mockResponse: ChatCompletionResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createLLMClient(config);
      const result = await client.chat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should use default model when not specified', async () => {
      const mockResponse: ChatCompletionResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createLLMClient(config);
      await client.chat({
        model: '',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('test-model');
    });

    it('should handle 401 auth error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      const client = createLLMClient(config);

      try {
        await client.chat({
          model: 'test-model',
          messages: [{ role: 'user', content: 'Hi' }],
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).type).toBe('auth');
        expect((error as LLMError).retryable).toBe(false);
      }
    });

    it('should retry on 429 rate limit error', async () => {
      // First attempt: rate limit
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });

      // Second attempt: success
      const mockResponse: ChatCompletionResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createLLMClient(config);
      const result = await client.chat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server error', async () => {
      // First attempt: server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      // Second attempt: success
      const mockResponse: ChatCompletionResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createLLMClient(config);
      const result = await client.chat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 invalid request error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Invalid request' } }),
      });

      const client = createLLMClient(config);

      await expect(
        client.chat({
          model: 'test-model',
          messages: [{ role: 'user', content: 'Hi' }],
        })
      ).rejects.toThrow(LLMError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConfig', () => {
    it('should return current config', () => {
      const client = createLLMClient(config);
      const currentConfig = client.getConfig();

      expect(currentConfig.endpoint).toBe(config.endpoint);
      expect(currentConfig.defaultModel).toBe(config.defaultModel);
      expect(currentConfig.apiKey).toBe(config.apiKey);
    });

    it('should return a copy of config', () => {
      const client = createLLMClient(config);
      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const client = createLLMClient(config);

      client.updateConfig({
        defaultModel: 'new-model',
        timeout: 10000,
      });

      const updated = client.getConfig();
      expect(updated.defaultModel).toBe('new-model');
      expect(updated.timeout).toBe(10000);
      expect(updated.endpoint).toBe(config.endpoint);
    });

    it('should validate updated config', () => {
      const client = createLLMClient(config);

      expect(() => {
        client.updateConfig({
          timeout: -1000,
        });
      }).toThrow('Timeout must be positive');
    });
  });
});
