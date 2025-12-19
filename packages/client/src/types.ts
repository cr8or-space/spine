/**
 * Client protocol types
 *
 * Types for WebSocket communication with the Spine server.
 */

import { z } from 'zod';

export const JSONRPC_VERSION = '2.0' as const;

// Message ID schema
export const MessageIdSchema = z.union([z.string(), z.number()]);
export type MessageId = z.infer<typeof MessageIdSchema>;

// RPC Error schema
export const RpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional()
});
export type RpcError = z.infer<typeof RpcErrorSchema>;

// Error codes
export const ErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  PROJECT_NOT_FOUND: -32000,
  ENTITY_NOT_FOUND: -32001,
  VALIDATION_ERROR: -32002,
  GENERATION_ERROR: -32003,
  REVIEW_ERROR: -32004,
  CONTENT_LOCKED: -32005,
  DATABASE_ERROR: -32006,
  LLM_ERROR: -32007,
  SUBSCRIPTION_ERROR: -32008,
  UNAUTHORIZED: -32009,
  RATE_LIMITED: -32010
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// Request structure
export interface Request {
  jsonrpc: typeof JSONRPC_VERSION;
  id: MessageId;
  method: string;
  params?: Record<string, unknown>;
}

// Success response
export interface SuccessResponse {
  jsonrpc: typeof JSONRPC_VERSION;
  id: MessageId;
  result: unknown;
}

// Error response
export interface ErrorResponse {
  jsonrpc: typeof JSONRPC_VERSION;
  id: MessageId | null;
  error: RpcError;
}

// Response type union
export type Response = SuccessResponse | ErrorResponse;

// Notification (server -> client)
export interface Notification {
  jsonrpc: typeof JSONRPC_VERSION;
  method: string;
  params: Record<string, unknown>;
}

// Helper to check if response is error
export function isErrorResponse(response: Response): response is ErrorResponse {
  return 'error' in response;
}

// Subscription channels
export const SUBSCRIPTION_CHANNELS = {
  PROJECT_UPDATED: 'project.updated',
  BIBLE_UPDATED: 'bible.updated',
  STRUCTURE_UPDATED: 'structure.updated',
  CONTENT_UPDATED: 'content.updated',
  GENERATION_PROGRESS: 'generation.progress',
  GENERATION_COMPLETE: 'generation.complete',
  GENERATION_ERROR: 'generation.error',
  REVIEW_UPDATED: 'review.updated'
} as const;

export type SubscriptionChannel =
  (typeof SUBSCRIPTION_CHANNELS)[keyof typeof SUBSCRIPTION_CHANNELS];

// Subscription key
export interface SubscriptionKey {
  channel: SubscriptionChannel;
  projectId?: string;
  generationId?: string;
}

// Client configuration
export interface ClientConfig {
  /** WebSocket URL (e.g., 'ws://localhost:8080') */
  url: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Request timeout in ms (default: 30000) */
  requestTimeout?: number;
  /** Callback when connection is established */
  onConnect?: () => void;
  /** Callback when connection is lost */
  onDisconnect?: (reason?: string) => void;
  /** Callback for connection errors */
  onError?: (error: Error) => void;
}

// Client state
export type ClientState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Notification handler
export type NotificationHandler = (params: Record<string, unknown>) => void;

// Custom error class for API errors
export class SpineApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'SpineApiError';
  }

  static fromRpcError(error: RpcError): SpineApiError {
    return new SpineApiError(error.code, error.message, error.data);
  }

  get isProjectNotFound(): boolean {
    return this.code === ErrorCode.PROJECT_NOT_FOUND;
  }

  get isEntityNotFound(): boolean {
    return this.code === ErrorCode.ENTITY_NOT_FOUND;
  }

  get isValidationError(): boolean {
    return this.code === ErrorCode.VALIDATION_ERROR;
  }

  get isContentLocked(): boolean {
    return this.code === ErrorCode.CONTENT_LOCKED;
  }

  get isLlmError(): boolean {
    return this.code === ErrorCode.LLM_ERROR;
  }
}
