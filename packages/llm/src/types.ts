/**
 * LLM client types
 *
 * OpenAI-compatible API types for chat completion requests and responses.
 */

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Chat completion request parameters
 */
export interface ChatCompletionRequest {
  /** Model identifier */
  model: string;
  /** Array of chat messages */
  messages: ChatMessage[];
  /** Temperature (0-2, default 1) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Top-p sampling (0-1) */
  top_p?: number;
  /** Frequency penalty (-2 to 2) */
  frequency_penalty?: number;
  /** Presence penalty (-2 to 2) */
  presence_penalty?: number;
  /** Stop sequences */
  stop?: string | string[];
  /** Stream responses */
  stream?: boolean;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Chat completion choice
 */
export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
}

/**
 * Streaming chat completion delta
 */
export interface ChatCompletionDelta {
  role?: MessageRole;
  content?: string;
}

/**
 * Streaming chat completion choice
 */
export interface StreamingChatCompletionChoice {
  index: number;
  delta: ChatCompletionDelta;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

/**
 * Streaming chat completion chunk
 */
export interface StreamingChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamingChatCompletionChoice[];
}

/**
 * LLM error types
 */
export type LLMErrorType =
  | 'network'
  | 'auth'
  | 'rate_limit'
  | 'invalid_request'
  | 'server_error'
  | 'timeout'
  | 'unknown';

/**
 * LLM error
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public type: LLMErrorType,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
