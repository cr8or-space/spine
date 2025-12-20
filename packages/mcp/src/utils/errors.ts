/**
 * Error handling utilities
 */

import { SpineApiError } from '@repo/client';

/**
 * MCP tool error with structured data
 */
export class McpToolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'McpToolError';
  }
}

/**
 * Map Spine API error codes to MCP error codes
 */
function mapErrorCode(spineCode: number): string {
  switch (spineCode) {
    case -32700:
      return 'PARSE_ERROR';
    case -32600:
      return 'INVALID_REQUEST';
    case -32601:
      return 'METHOD_NOT_FOUND';
    case -32602:
      return 'INVALID_PARAMS';
    case -32603:
      return 'INTERNAL_ERROR';
    case -32000:
      return 'PROJECT_NOT_FOUND';
    case -32001:
      return 'ENTITY_NOT_FOUND';
    case -32002:
      return 'VALIDATION_ERROR';
    case -32003:
      return 'GENERATION_ERROR';
    case -32004:
      return 'REVIEW_ERROR';
    case -32005:
      return 'CONTENT_LOCKED';
    case -32006:
      return 'DATABASE_ERROR';
    case -32007:
      return 'LLM_ERROR';
    case -32008:
      return 'SUBSCRIPTION_ERROR';
    case -32009:
      return 'UNAUTHORIZED';
    case -32010:
      return 'RATE_LIMITED';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Wrap a tool handler to convert Spine API errors
 */
export async function handleToolCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SpineApiError) {
      throw new McpToolError(
        mapErrorCode(error.code),
        error.message,
        error.data
      );
    }
    if (error instanceof McpToolError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new McpToolError('INTERNAL_ERROR', error.message);
    }
    throw new McpToolError('INTERNAL_ERROR', 'Unknown error occurred');
  }
}

/**
 * Format error for tool response
 */
export function formatError(error: unknown): { error: string; code?: string } {
  if (error instanceof McpToolError) {
    return {
      error: error.message,
      code: error.code
    };
  }
  if (error instanceof Error) {
    return { error: error.message };
  }
  return { error: 'Unknown error occurred' };
}
