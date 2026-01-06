/**
 * Error handling tests
 */

import { describe, it, expect } from 'vitest';
import { SpineApiError } from '@repo/framework-client';
import { McpToolError, handleToolCall, formatError } from './errors';

describe('McpToolError', () => {
  it('creates error with code and message', () => {
    const error = new McpToolError('PROJECT_NOT_FOUND', 'Project not found');

    expect(error.code).toBe('PROJECT_NOT_FOUND');
    expect(error.message).toBe('Project not found');
    expect(error.name).toBe('McpToolError');
  });

  it('includes optional data', () => {
    const error = new McpToolError('VALIDATION_ERROR', 'Invalid input', {
      field: 'name'
    });

    expect(error.data).toEqual({ field: 'name' });
  });
});

describe('handleToolCall', () => {
  it('returns result on success', async () => {
    const result = await handleToolCall(async () => 'success');
    expect(result).toBe('success');
  });

  it('converts SpineApiError to McpToolError', async () => {
    await expect(
      handleToolCall(async () => {
        throw new SpineApiError(-32000, 'Project not found');
      })
    ).rejects.toThrow(McpToolError);

    try {
      await handleToolCall(async () => {
        throw new SpineApiError(-32000, 'Project not found');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(McpToolError);
      expect((error as McpToolError).code).toBe('PROJECT_NOT_FOUND');
    }
  });

  it('passes through McpToolError', async () => {
    const original = new McpToolError('CUSTOM', 'Custom error');

    await expect(
      handleToolCall(async () => {
        throw original;
      })
    ).rejects.toBe(original);
  });

  it('wraps generic Error in McpToolError', async () => {
    await expect(
      handleToolCall(async () => {
        throw new Error('Generic error');
      })
    ).rejects.toThrow(McpToolError);

    try {
      await handleToolCall(async () => {
        throw new Error('Generic error');
      });
    } catch (error) {
      expect(error).toBeInstanceOf(McpToolError);
      expect((error as McpToolError).code).toBe('INTERNAL_ERROR');
    }
  });
});

describe('formatError', () => {
  it('formats McpToolError with code', () => {
    const error = new McpToolError('PROJECT_NOT_FOUND', 'Not found');
    const formatted = formatError(error);

    expect(formatted.error).toBe('Not found');
    expect(formatted.code).toBe('PROJECT_NOT_FOUND');
  });

  it('formats generic Error', () => {
    const error = new Error('Something went wrong');
    const formatted = formatError(error);

    expect(formatted.error).toBe('Something went wrong');
    expect(formatted.code).toBeUndefined();
  });

  it('handles non-Error values', () => {
    const formatted = formatError('string error');

    expect(formatted.error).toBe('Unknown error occurred');
  });
});
