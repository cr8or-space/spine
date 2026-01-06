/**
 * Protocol types tests
 */

import { describe, it, expect } from 'vitest';
import { API_METHODS, ErrorCode } from './types';
import { BaseRequestSchema, validateRequest } from './request';
import { createErrorResponse, createSuccessResponse } from './response';

describe('API_METHODS', () => {
  it('should have project methods', () => {
    expect(API_METHODS.PROJECT_LIST).toBe('project.list');
    expect(API_METHODS.PROJECT_CREATE).toBe('project.create');
    expect(API_METHODS.PROJECT_LOAD).toBe('project.load');
    expect(API_METHODS.PROJECT_DELETE).toBe('project.delete');
  });

  it('should have bible methods', () => {
    expect(API_METHODS.BIBLE_GET).toBe('bible.get');
    expect(API_METHODS.BIBLE_CHARACTER_LIST).toBe('bible.character.list');
    expect(API_METHODS.BIBLE_LOCATION_LIST).toBe('bible.location.list');
    expect(API_METHODS.BIBLE_FACTION_LIST).toBe('bible.faction.list');
  });

  it('should have structure methods', () => {
    expect(API_METHODS.STRUCTURE_GET_TREE).toBe('structure.getTree');
    expect(API_METHODS.STRUCTURE_CREATE).toBe('structure.create');
    expect(API_METHODS.STRUCTURE_UPDATE).toBe('structure.update');
    expect(API_METHODS.STRUCTURE_DELETE).toBe('structure.delete');
  });

  it('should have content methods', () => {
    expect(API_METHODS.CONTENT_GET).toBe('content.get');
    expect(API_METHODS.CONTENT_SAVE).toBe('content.save');
    expect(API_METHODS.CONTENT_GET_HISTORY).toBe('content.getHistory');
    expect(API_METHODS.CONTENT_ROLLBACK).toBe('content.rollback');
  });
});

describe('BaseRequestSchema', () => {
  it('should validate a valid request', () => {
    const request = {
      jsonrpc: '2.0' as const,
      id: 'req-123',
      method: 'project.list',
      params: {}
    };

    const result = BaseRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('req-123');
      expect(result.data.method).toBe('project.list');
    }
  });

  it('should reject a request without id', () => {
    const request = {
      jsonrpc: '2.0' as const,
      method: 'project.list',
      params: {}
    };

    const result = BaseRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should reject a request without method', () => {
    const request = {
      jsonrpc: '2.0' as const,
      id: 'req-123',
      params: {}
    };

    const result = BaseRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should allow params to be undefined', () => {
    const request = {
      jsonrpc: '2.0' as const,
      id: 'req-123',
      method: 'project.list'
    };

    const result = BaseRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });
});

describe('validateRequest', () => {
  it('should return valid request when input is correct', () => {
    const input = { jsonrpc: '2.0' as const, id: 'test', method: 'project.list', params: {} };
    const result = validateRequest(input);
    expect(result.id).toBe('test');
    expect(result.method).toBe('project.list');
  });

  it('should throw for invalid input', () => {
    expect(() => validateRequest({ method: 'test' })).toThrow();
  });

  it('should throw for non-object input', () => {
    expect(() => validateRequest('invalid')).toThrow();
  });
});

describe('createErrorResponse', () => {
  it('should create an error response with code and message', () => {
    const response = createErrorResponse('req-123', {
      code: ErrorCode.METHOD_NOT_FOUND,
      message: 'Method not found'
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe('req-123');
    expect(response.error.code).toBe(ErrorCode.METHOD_NOT_FOUND);
    expect(response.error.message).toBe('Method not found');
  });

  it('should include data when provided', () => {
    const response = createErrorResponse('req-123', {
      code: ErrorCode.INVALID_PARAMS,
      message: 'Invalid params',
      data: { field: 'name' }
    });

    expect(response.error.data).toEqual({ field: 'name' });
  });
});

describe('createSuccessResponse', () => {
  it('should create a success response with result', () => {
    const response = createSuccessResponse('req-123', { value: 42 });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe('req-123');
    expect(response.result).toEqual({ value: 42 });
  });

  it('should handle null result', () => {
    const response = createSuccessResponse('req-123', null);

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe('req-123');
    expect(response.result).toBeNull();
  });
});
