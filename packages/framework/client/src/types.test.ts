/**
 * Tests for client types
 */

import { describe, it, expect } from 'vitest';
import {
  SpineApiError,
  ErrorCode,
  isErrorResponse,
  JSONRPC_VERSION,
  SUBSCRIPTION_CHANNELS
} from './types';

describe('SpineApiError', () => {
  it('should create error with code and message', () => {
    const error = new SpineApiError(ErrorCode.PROJECT_NOT_FOUND, 'Project not found');

    expect(error.code).toBe(ErrorCode.PROJECT_NOT_FOUND);
    expect(error.message).toBe('Project not found');
    expect(error.name).toBe('SpineApiError');
  });

  it('should create error with data', () => {
    const data = { field: 'title', reason: 'required' };
    const error = new SpineApiError(ErrorCode.VALIDATION_ERROR, 'Validation failed', data);

    expect(error.data).toEqual(data);
  });

  it('should create from RpcError', () => {
    const rpcError = {
      code: ErrorCode.ENTITY_NOT_FOUND,
      message: 'Entity not found',
      data: { entityType: 'Character' }
    };

    const error = SpineApiError.fromRpcError(rpcError);

    expect(error.code).toBe(ErrorCode.ENTITY_NOT_FOUND);
    expect(error.message).toBe('Entity not found');
    expect(error.data).toEqual({ entityType: 'Character' });
  });

  describe('error type checks', () => {
    it('should identify project not found error', () => {
      const error = new SpineApiError(ErrorCode.PROJECT_NOT_FOUND, 'Not found');

      expect(error.isProjectNotFound).toBe(true);
      expect(error.isEntityNotFound).toBe(false);
    });

    it('should identify entity not found error', () => {
      const error = new SpineApiError(ErrorCode.ENTITY_NOT_FOUND, 'Not found');

      expect(error.isEntityNotFound).toBe(true);
      expect(error.isProjectNotFound).toBe(false);
    });

    it('should identify validation error', () => {
      const error = new SpineApiError(ErrorCode.VALIDATION_ERROR, 'Invalid');

      expect(error.isValidationError).toBe(true);
    });

    it('should identify content locked error', () => {
      const error = new SpineApiError(ErrorCode.CONTENT_LOCKED, 'Locked');

      expect(error.isContentLocked).toBe(true);
    });

    it('should identify LLM error', () => {
      const error = new SpineApiError(ErrorCode.LLM_ERROR, 'LLM failed');

      expect(error.isLlmError).toBe(true);
    });
  });
});

describe('isErrorResponse', () => {
  it('should return true for error response', () => {
    const response = {
      jsonrpc: JSONRPC_VERSION,
      id: '1',
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal error'
      }
    };

    expect(isErrorResponse(response)).toBe(true);
  });

  it('should return false for success response', () => {
    const response = {
      jsonrpc: JSONRPC_VERSION,
      id: '1',
      result: { success: true }
    };

    expect(isErrorResponse(response)).toBe(false);
  });
});

describe('Constants', () => {
  it('should have correct JSON-RPC version', () => {
    expect(JSONRPC_VERSION).toBe('2.0');
  });

  it('should have all subscription channels', () => {
    expect(SUBSCRIPTION_CHANNELS.PROJECT_UPDATED).toBe('project.updated');
    expect(SUBSCRIPTION_CHANNELS.BIBLE_UPDATED).toBe('bible.updated');
    expect(SUBSCRIPTION_CHANNELS.STRUCTURE_UPDATED).toBe('structure.updated');
    expect(SUBSCRIPTION_CHANNELS.CONTENT_UPDATED).toBe('content.updated');
    expect(SUBSCRIPTION_CHANNELS.GENERATION_PROGRESS).toBe('generation.progress');
    expect(SUBSCRIPTION_CHANNELS.GENERATION_COMPLETE).toBe('generation.complete');
    expect(SUBSCRIPTION_CHANNELS.GENERATION_ERROR).toBe('generation.error');
    expect(SUBSCRIPTION_CHANNELS.REVIEW_UPDATED).toBe('review.updated');
  });

  it('should have all error codes', () => {
    expect(ErrorCode.PARSE_ERROR).toBe(-32700);
    expect(ErrorCode.INVALID_REQUEST).toBe(-32600);
    expect(ErrorCode.METHOD_NOT_FOUND).toBe(-32601);
    expect(ErrorCode.INVALID_PARAMS).toBe(-32602);
    expect(ErrorCode.INTERNAL_ERROR).toBe(-32603);
    expect(ErrorCode.PROJECT_NOT_FOUND).toBe(-32000);
    expect(ErrorCode.ENTITY_NOT_FOUND).toBe(-32001);
    expect(ErrorCode.VALIDATION_ERROR).toBe(-32002);
    expect(ErrorCode.GENERATION_ERROR).toBe(-32003);
    expect(ErrorCode.REVIEW_ERROR).toBe(-32004);
    expect(ErrorCode.CONTENT_LOCKED).toBe(-32005);
    expect(ErrorCode.DATABASE_ERROR).toBe(-32006);
    expect(ErrorCode.LLM_ERROR).toBe(-32007);
    expect(ErrorCode.SUBSCRIPTION_ERROR).toBe(-32008);
    expect(ErrorCode.UNAUTHORIZED).toBe(-32009);
    expect(ErrorCode.RATE_LIMITED).toBe(-32010);
  });
});
