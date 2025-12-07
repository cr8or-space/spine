/**
 * LLM client package
 *
 * OpenAI-compatible API client with streaming support, error handling,
 * and token counting utilities.
 */

// Client
export { createLLMClient, type LLMClient } from './client';

// Configuration
export {
  type LLMConfig,
  DEFAULT_CONFIG,
  validateConfig,
  mergeConfig,
} from './config';

// Types
export type {
  MessageRole,
  ChatMessage,
  ChatCompletionRequest,
  TokenUsage,
  ChatCompletionChoice,
  ChatCompletionResponse,
  ChatCompletionDelta,
  StreamingChatCompletionChoice,
  StreamingChatCompletionChunk,
  LLMErrorType,
} from './types';

export { LLMError } from './types';

// Token counting
export {
  countTokens,
  countMessageTokens,
  countMessagesTokens,
  estimateCompletionTokens,
  calculateTotalTokens,
  fitsWithinBudget,
  truncateMessages,
} from './token-counter';
