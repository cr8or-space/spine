/**
 * OpenAI-compatible LLM client
 *
 * Provides a client for making requests to OpenAI-compatible APIs
 * with support for streaming, error handling, and retries.
 */

import type { LLMConfig } from './config';
import { mergeConfig, validateConfig } from './config';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamingChatCompletionChunk,
} from './types';
import { LLMError } from './types';

/**
 * LLM client interface
 */
export interface LLMClient {
  /** Make a chat completion request */
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /** Make a streaming chat completion request */
  chatStream(
    request: ChatCompletionRequest,
    onChunk: (chunk: StreamingChatCompletionChunk) => void
  ): Promise<void>;

  /** Get the current configuration */
  getConfig(): Readonly<Required<LLMConfig>>;

  /** Update configuration */
  updateConfig(config: Partial<LLMConfig>): void;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse error from response
 */
async function parseError(response: Response): Promise<LLMError> {
  const status = response.status;

  let message = `HTTP ${status}: ${response.statusText}`;
  let type: LLMError['type'] = 'unknown';
  let retryable = false;

  // Try to parse error body
  try {
    const body = await response.json();
    if (body.error?.message) {
      message = body.error.message;
    }
  } catch {
    // Ignore JSON parse errors
  }

  // Classify error type
  if (status === 401 || status === 403) {
    type = 'auth';
  } else if (status === 429) {
    type = 'rate_limit';
    retryable = true;
  } else if (status === 400 || status === 422) {
    type = 'invalid_request';
  } else if (status >= 500) {
    type = 'server_error';
    retryable = true;
  }

  return new LLMError(message, type, status, retryable);
}

/**
 * Parse SSE (Server-Sent Events) line
 */
function parseSSELine(line: string): string | null {
  if (line.startsWith('data: ')) {
    return line.slice(6);
  }
  return null;
}

/**
 * Create an LLM client
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  validateConfig(config);
  let currentConfig = mergeConfig(config);

  /**
   * Make a request with retry logic
   */
  async function makeRequest<T>(
    url: string,
    options: RequestInit,
    attempt = 0
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), currentConfig.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await parseError(response);

        // Retry if error is retryable and we have attempts left
        if (error.retryable && attempt < currentConfig.maxRetries) {
          const delay = currentConfig.retryDelay * Math.pow(currentConfig.retryMultiplier, attempt);
          await sleep(delay);
          return makeRequest<T>(url, options, attempt + 1);
        }

        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new LLMError('Network error', 'network', undefined, true);

        // Retry network errors
        if (attempt < currentConfig.maxRetries) {
          const delay = currentConfig.retryDelay * Math.pow(currentConfig.retryMultiplier, attempt);
          await sleep(delay);
          return makeRequest<T>(url, options, attempt + 1);
        }

        throw networkError;
      }

      // Handle timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new LLMError('Request timeout', 'timeout', undefined, true);

        // Retry timeouts
        if (attempt < currentConfig.maxRetries) {
          const delay = currentConfig.retryDelay * Math.pow(currentConfig.retryMultiplier, attempt);
          await sleep(delay);
          return makeRequest<T>(url, options, attempt + 1);
        }

        throw timeoutError;
      }

      throw error;
    }
  }

  /**
   * Build request headers
   */
  function buildHeaders(stream: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...currentConfig.headers,
    };

    if (currentConfig.apiKey) {
      headers['Authorization'] = `Bearer ${currentConfig.apiKey}`;
    }

    if (stream) {
      headers['Accept'] = 'text/event-stream';
    }

    return headers;
  }

  return {
    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
      const url = `${currentConfig.endpoint}/chat/completions`;

      const body: ChatCompletionRequest = {
        model: request.model || currentConfig.defaultModel,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: false,
      };

      return makeRequest<ChatCompletionResponse>(url, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
      });
    },

    async chatStream(
      request: ChatCompletionRequest,
      onChunk: (chunk: StreamingChatCompletionChunk) => void
    ): Promise<void> {
      const url = `${currentConfig.endpoint}/chat/completions`;

      const body: ChatCompletionRequest = {
        model: request.model || currentConfig.defaultModel,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        frequency_penalty: request.frequency_penalty,
        presence_penalty: request.presence_penalty,
        stop: request.stop,
        stream: true,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), currentConfig.timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: buildHeaders(true),
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw await parseError(response);
        }

        if (!response.body) {
          throw new LLMError('No response body', 'unknown');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed === 'data: [DONE]') continue;

            const data = parseSSELine(trimmed);
            if (!data) continue;

            try {
              const chunk = JSON.parse(data) as StreamingChatCompletionChunk;
              onChunk(chunk);
            } catch (error) {
              console.error('Failed to parse SSE chunk:', error);
            }
          }
        }
      } catch (error) {
        clearTimeout(timeout);

        // Handle timeout
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new LLMError('Request timeout', 'timeout');
        }

        throw error;
      }
    },

    getConfig(): Readonly<Required<LLMConfig>> {
      return { ...currentConfig };
    },

    updateConfig(config: Partial<LLMConfig>): void {
      const newConfig = { ...currentConfig, ...config };
      validateConfig(newConfig);
      currentConfig = mergeConfig(newConfig);
    },
  };
}
