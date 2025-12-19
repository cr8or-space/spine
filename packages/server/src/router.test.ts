/**
 * Router tests
 */

import { describe, it, expect, vi } from 'vitest';
import { createRouter, ApiError } from './router';
import { ErrorCode } from './protocol';
import type { ConnectionState } from './connection';

// Create a mock connection state
function createMockConnection(): ConnectionState {
  return {
    id: 'conn-test',
    socket: {
      send: vi.fn(),
      readyState: 1
    } as unknown as import('ws').WebSocket,
    createdAt: new Date(),
    lastActivity: new Date(),
    subscriptions: new Set(),
    activeGenerations: new Set()
  };
}

describe('createRouter', () => {
  it('should create a router', () => {
    const router = createRouter();
    expect(router).toBeDefined();
    expect(typeof router.register).toBe('function');
    expect(typeof router.handle).toBe('function');
    expect(typeof router.hasMethod).toBe('function');
    expect(typeof router.getMethods).toBe('function');
  });
});

describe('Router.register', () => {
  it('should register a handler', () => {
    const router = createRouter();

    router.register<{ name: string }, { greeting: string }>(
      'test.greet',
      (params) => ({ greeting: `Hello, ${params.name}!` })
    );

    expect(router.hasMethod('test.greet')).toBe(true);
  });

  it('should allow multiple handlers to be registered', () => {
    const router = createRouter();

    router.register('method.one', () => 1);
    router.register('method.two', () => 2);

    expect(router.hasMethod('method.one')).toBe(true);
    expect(router.hasMethod('method.two')).toBe(true);
    expect(router.getMethods()).toContain('method.one');
    expect(router.getMethods()).toContain('method.two');
  });
});

describe('Router.handle', () => {
  it('should handle a request and return success response', async () => {
    const router = createRouter();
    const connection = createMockConnection();

    router.register<{ x: number; y: number }, number>(
      'math.add',
      (params) => params.x + params.y
    );

    const responseJson = await router.handle(
      { jsonrpc: '2.0', id: 'req-1', method: 'math.add', params: { x: 5, y: 3 } },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe('req-1');
    expect(response.result).toBe(8);
  });

  it('should return error for unknown method', async () => {
    const router = createRouter();
    const connection = createMockConnection();

    const responseJson = await router.handle(
      { jsonrpc: '2.0', id: 'req-1', method: 'unknown.method', params: {} },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.id).toBe('req-1');
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(ErrorCode.METHOD_NOT_FOUND);
  });

  it('should handle ApiError thrown by handler', async () => {
    const router = createRouter();
    const connection = createMockConnection();

    router.register('test.error', () => {
      throw ApiError.entityNotFound('Item', 'item-123');
    });

    const responseJson = await router.handle(
      { jsonrpc: '2.0', id: 'req-1', method: 'test.error', params: {} },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.id).toBe('req-1');
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(ErrorCode.ENTITY_NOT_FOUND);
    expect(response.error.message).toContain('Item');
  });

  it('should handle unexpected errors', async () => {
    const router = createRouter();
    const connection = createMockConnection();

    router.register('test.crash', () => {
      throw new Error('Something went wrong');
    });

    const responseJson = await router.handle(
      { jsonrpc: '2.0', id: 'req-1', method: 'test.crash', params: {} },
      connection
    );
    const response = JSON.parse(responseJson);

    expect(response.id).toBe('req-1');
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it('should validate params with schema when provided', async () => {
    const router = createRouter();
    const connection = createMockConnection();
    const { z } = await import('zod');

    const ParamsSchema = z.object({
      name: z.string().min(1)
    });

    router.register<{ name: string }, string>(
      'test.validate',
      (params) => `Hello, ${params.name}`,
      ParamsSchema
    );

    // Valid params
    const validJson = await router.handle(
      { jsonrpc: '2.0', id: 'req-1', method: 'test.validate', params: { name: 'World' } },
      connection
    );
    const validResponse = JSON.parse(validJson);
    expect(validResponse.result).toBe('Hello, World');

    // Invalid params
    const invalidJson = await router.handle(
      { jsonrpc: '2.0', id: 'req-2', method: 'test.validate', params: { name: '' } },
      connection
    );
    const invalidResponse = JSON.parse(invalidJson);
    expect(invalidResponse.error).toBeDefined();
    expect(invalidResponse.error.code).toBe(ErrorCode.INVALID_PARAMS);
  });
});

describe('ApiError', () => {
  it('should create entity not found error', () => {
    const error = ApiError.entityNotFound('Project', 'proj-123');
    expect(error.code).toBe(ErrorCode.ENTITY_NOT_FOUND);
    expect(error.message).toContain('Project');
    expect(error.message).toContain('proj-123');
  });

  it('should create project not found error', () => {
    const error = ApiError.projectNotFound('proj-123');
    expect(error.code).toBe(ErrorCode.PROJECT_NOT_FOUND);
    expect(error.message).toContain('proj-123');
  });

  it('should create content locked error', () => {
    const error = ApiError.contentLocked('content-123');
    expect(error.code).toBe(ErrorCode.CONTENT_LOCKED);
    expect(error.message).toContain('locked');
  });

  it('should create database error', () => {
    const error = ApiError.databaseError('Connection failed');
    expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(error.message).toBe('Connection failed');
  });

  it('should create validation error with data', () => {
    const error = ApiError.validationError('Invalid input', { field: 'email' });
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.data).toEqual({ field: 'email' });
  });

  it('should create generation error', () => {
    const error = ApiError.generationError('LLM failed');
    expect(error.code).toBe(ErrorCode.GENERATION_ERROR);
    expect(error.message).toBe('LLM failed');
  });

  it('should create llm error', () => {
    const error = ApiError.llmError('API timeout');
    expect(error.code).toBe(ErrorCode.LLM_ERROR);
    expect(error.message).toBe('API timeout');
  });

  it('should create subscription error', () => {
    const error = ApiError.subscriptionError('Channel not found');
    expect(error.code).toBe(ErrorCode.SUBSCRIPTION_ERROR);
    expect(error.message).toBe('Channel not found');
  });
});
