import type { ZodSchema } from 'zod';
import type { ConnectionState } from './connection';
import type { BaseRequest, MessageId } from './protocol';
import { ErrorCode, createSuccessResponse, createErrorResponse } from './protocol';

/**
 * Request router for WebSocket API methods.
 */

export interface HandlerContext {
  connection: ConnectionState;
  request: BaseRequest;
}

export type Handler<TParams = unknown, TResult = unknown> = (
  params: TParams,
  context: HandlerContext
) => Promise<TResult> | TResult;

export interface RouteDefinition<TParams = unknown, TResult = unknown> {
  method: string;
  paramsSchema?: ZodSchema<TParams>;
  handler: Handler<TParams, TResult>;
}

export interface Router {
  register<TParams, TResult>(
    method: string,
    handler: Handler<TParams, TResult>,
    paramsSchema?: ZodSchema<TParams>
  ): void;
  handle(request: BaseRequest, connection: ConnectionState): Promise<string>;
  hasMethod(method: string): boolean;
  getMethods(): string[];
}

interface RouteEntry {
  handler: Handler;
  paramsSchema?: ZodSchema;
}

/**
 * Create a router for handling API method requests.
 */
export function createRouter(): Router {
  const routes = new Map<string, RouteEntry>();

  async function handle(request: BaseRequest, connection: ConnectionState): Promise<string> {
    const { id, method, params } = request;

    const route = routes.get(method);
    if (!route) {
      return JSON.stringify(
        createErrorResponse(id, {
          code: ErrorCode.METHOD_NOT_FOUND,
          message: `Method not found: ${method}`
        })
      );
    }

    try {
      // Validate params if schema is provided
      let validatedParams = params ?? {};
      if (route.paramsSchema) {
        const result = route.paramsSchema.safeParse(params);
        if (!result.success) {
          return JSON.stringify(
            createErrorResponse(id, {
              code: ErrorCode.INVALID_PARAMS,
              message: 'Invalid parameters',
              data: result.error.issues
            })
          );
        }
        validatedParams = result.data;
      }

      // Execute handler
      const context: HandlerContext = { connection, request };
      const result = await route.handler(validatedParams, context);

      return JSON.stringify(createSuccessResponse(id, result));
    } catch (error) {
      return JSON.stringify(createErrorFromException(id, error));
    }
  }

  return {
    register<TParams, TResult>(
      method: string,
      handler: Handler<TParams, TResult>,
      paramsSchema?: ZodSchema<TParams>
    ): void {
      routes.set(method, {
        handler: handler as Handler,
        paramsSchema
      });
    },

    handle,

    hasMethod(method: string): boolean {
      return routes.has(method);
    },

    getMethods(): string[] {
      return Array.from(routes.keys());
    }
  };
}

/**
 * Create an error response from an exception.
 */
function createErrorFromException(id: MessageId, error: unknown) {
  if (error instanceof ApiError) {
    return createErrorResponse(id, {
      code: error.code,
      message: error.message,
      data: error.data
    });
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return createErrorResponse(id, {
    code: ErrorCode.INTERNAL_ERROR,
    message
  });
}

/**
 * Custom error class for API errors with error codes.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static projectNotFound(id: string): ApiError {
    return new ApiError(ErrorCode.PROJECT_NOT_FOUND, `Project not found: ${id}`);
  }

  static entityNotFound(type: string, id: string): ApiError {
    return new ApiError(ErrorCode.ENTITY_NOT_FOUND, `${type} not found: ${id}`);
  }

  static validationError(message: string, data?: unknown): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, data);
  }

  static generationError(message: string, data?: unknown): ApiError {
    return new ApiError(ErrorCode.GENERATION_ERROR, message, data);
  }

  static reviewError(message: string, data?: unknown): ApiError {
    return new ApiError(ErrorCode.REVIEW_ERROR, message, data);
  }

  static contentLocked(structureId: string): ApiError {
    return new ApiError(
      ErrorCode.CONTENT_LOCKED,
      `Content is locked and cannot be modified: ${structureId}`
    );
  }

  static databaseError(message: string): ApiError {
    return new ApiError(ErrorCode.DATABASE_ERROR, message);
  }

  static llmError(message: string): ApiError {
    return new ApiError(ErrorCode.LLM_ERROR, message);
  }

  static subscriptionError(message: string): ApiError {
    return new ApiError(ErrorCode.SUBSCRIPTION_ERROR, message);
  }
}
