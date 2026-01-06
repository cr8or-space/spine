/**
 * Resilient LLM client with circuit breaker and enhanced error tracking
 *
 * Wraps the base LLM client with:
 * - Circuit breaker to prevent cascading failures
 * - Error statistics tracking
 * - Configurable fallback behavior
 */

import { createLLMClient, type LLMClient } from './client';
import { type LLMConfig } from './config';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamingChatCompletionChunk,
} from './types';
import { LLMError } from './types';
import {
  createCircuitBreaker,
  type CircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
  CircuitOpenError,
} from './circuit-breaker';

export interface ErrorStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorsByType: Record<string, number>;
  lastError: { message: string; type: string; timestamp: string } | null;
  averageLatencyMs: number;
  recentLatencies: number[];
}

export interface ResilientClientConfig {
  llm: LLMConfig;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  /** Whether to track detailed error statistics */
  trackStats?: boolean;
  /** Maximum number of latency samples to keep */
  maxLatencySamples?: number;
}

export interface ResilientLLMClient extends LLMClient {
  /** Get circuit breaker stats */
  getCircuitStats(): CircuitBreakerStats;
  /** Get error statistics */
  getErrorStats(): ErrorStats;
  /** Reset circuit breaker */
  resetCircuit(): void;
  /** Check if the client is healthy */
  isHealthy(): boolean;
  /** Get underlying base client */
  getBaseClient(): LLMClient;
}

/**
 * Create a resilient LLM client with circuit breaker protection
 */
export function createResilientLLMClient(config: ResilientClientConfig): ResilientLLMClient {
  const baseClient = createLLMClient(config.llm);
  const circuitBreaker: CircuitBreaker = createCircuitBreaker(config.circuitBreaker);

  const trackStats = config.trackStats ?? true;
  const maxLatencySamples = config.maxLatencySamples ?? 100;

  const stats: ErrorStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    errorsByType: {},
    lastError: null,
    averageLatencyMs: 0,
    recentLatencies: [],
  };

  /**
   * Record latency sample
   */
  function recordLatency(ms: number): void {
    if (!trackStats) return;

    stats.recentLatencies.push(ms);
    if (stats.recentLatencies.length > maxLatencySamples) {
      stats.recentLatencies.shift();
    }

    // Calculate average
    const sum = stats.recentLatencies.reduce((a, b) => a + b, 0);
    stats.averageLatencyMs = sum / stats.recentLatencies.length;
  }

  /**
   * Record error
   */
  function recordError(error: unknown): void {
    if (!trackStats) return;

    stats.failedRequests++;

    let errorType = 'unknown';
    let message = 'Unknown error';

    if (error instanceof LLMError) {
      errorType = error.type;
      message = error.message;
    } else if (error instanceof CircuitOpenError) {
      errorType = 'circuit_open';
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }

    stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
    stats.lastError = {
      message,
      type: errorType,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record success
   */
  function recordSuccess(): void {
    if (!trackStats) return;
    stats.successfulRequests++;
  }

  return {
    async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
      stats.totalRequests++;
      const startTime = Date.now();

      try {
        const result = await circuitBreaker.execute(() => baseClient.chat(request));
        recordLatency(Date.now() - startTime);
        recordSuccess();
        return result;
      } catch (error) {
        recordLatency(Date.now() - startTime);
        recordError(error);
        throw error;
      }
    },

    async chatStream(
      request: ChatCompletionRequest,
      onChunk: (chunk: StreamingChatCompletionChunk) => void
    ): Promise<void> {
      stats.totalRequests++;
      const startTime = Date.now();

      try {
        await circuitBreaker.execute(() => baseClient.chatStream(request, onChunk));
        recordLatency(Date.now() - startTime);
        recordSuccess();
      } catch (error) {
        recordLatency(Date.now() - startTime);
        recordError(error);
        throw error;
      }
    },

    getConfig() {
      return baseClient.getConfig();
    },

    updateConfig(newConfig: Partial<LLMConfig>) {
      baseClient.updateConfig(newConfig);
    },

    getCircuitStats(): CircuitBreakerStats {
      return circuitBreaker.getStats();
    },

    getErrorStats(): ErrorStats {
      return { ...stats };
    },

    resetCircuit(): void {
      circuitBreaker.reset();
    },

    isHealthy(): boolean {
      return circuitBreaker.isAllowed();
    },

    getBaseClient(): LLMClient {
      return baseClient;
    },
  };
}
