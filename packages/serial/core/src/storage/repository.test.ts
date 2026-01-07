import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

import { parseJsonWithSchema, updateOptionalJson, updateOptionalValue, updateRequiredJson } from './repository';

describe('parseJsonWithSchema', () => {
  const StringSchema = z.string();
  const NumberSchema = z.number();
  const ObjectSchema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const ArraySchema = z.array(z.string());

  it('returns parsed and validated value for valid JSON', () => {
    const result = parseJsonWithSchema('"hello"', StringSchema, 'default');
    expect(result).toBe('hello');
  });

  it('returns default for null input', () => {
    const result = parseJsonWithSchema(null, StringSchema, 'default');
    expect(result).toBe('default');
  });

  it('returns default for undefined input', () => {
    const result = parseJsonWithSchema(undefined, StringSchema, 'default');
    expect(result).toBe('default');
  });

  it('returns default for empty string input', () => {
    const result = parseJsonWithSchema('', StringSchema, 'default');
    expect(result).toBe('default');
  });

  it('returns default for invalid JSON syntax', () => {
    const result = parseJsonWithSchema('not valid json', StringSchema, 'default');
    expect(result).toBe('default');
  });

  it('returns default when JSON is valid but fails schema validation', () => {
    const result = parseJsonWithSchema('123', StringSchema, 'default');
    expect(result).toBe('default');
  });

  it('parses objects correctly', () => {
    const result = parseJsonWithSchema('{"name":"Alice","age":30}', ObjectSchema, { name: '', age: 0 });
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('returns default for object with missing required fields', () => {
    const result = parseJsonWithSchema('{"name":"Alice"}', ObjectSchema, { name: '', age: 0 });
    expect(result).toEqual({ name: '', age: 0 });
  });

  it('parses arrays correctly', () => {
    const result = parseJsonWithSchema('["a","b","c"]', ArraySchema, []);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('returns default for array with wrong element types', () => {
    const result = parseJsonWithSchema('[1,2,3]', ArraySchema, ['default']);
    expect(result).toEqual(['default']);
  });

  it('parses numbers correctly', () => {
    const result = parseJsonWithSchema('42', NumberSchema, 0);
    expect(result).toBe(42);
  });

  it('logs validation errors in non-production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    parseJsonWithSchema('123', StringSchema, 'default', 'testField');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[parseJsonWithSchema] Validation failed for field 'testField'"),
      expect.any(Array)
    );

    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('does not log in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    parseJsonWithSchema('123', StringSchema, 'default', 'testField');

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('handles optional schemas correctly', () => {
    const OptionalSchema = z.string().optional();
    const result = parseJsonWithSchema('null', OptionalSchema, undefined);
    expect(result).toBeUndefined();
  });

  it('works with nested objects', () => {
    const NestedSchema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    });
    const valid = '{"user":{"name":"Bob","email":"bob@example.com"}}';
    const result = parseJsonWithSchema(valid, NestedSchema, { user: { name: '', email: '' } });
    expect(result).toEqual({ user: { name: 'Bob', email: 'bob@example.com' } });
  });

  it('returns default for nested object with invalid email', () => {
    const NestedSchema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    });
    const invalid = '{"user":{"name":"Bob","email":"not-an-email"}}';
    const result = parseJsonWithSchema(invalid, NestedSchema, { user: { name: '', email: '' } });
    expect(result).toEqual({ user: { name: '', email: '' } });
  });
});

describe('updateOptionalJson', () => {
  it('returns stringified update when update is provided', () => {
    const result = updateOptionalJson({ foo: 'bar' }, { existing: 'value' });
    expect(result).toBe('{"foo":"bar"}');
  });

  it('returns null when update is null (explicit clear)', () => {
    const result = updateOptionalJson(null, { existing: 'value' });
    expect(result).toBe(null);
  });

  it('returns stringified existing when update is undefined', () => {
    const result = updateOptionalJson(undefined, { existing: 'value' });
    expect(result).toBe('{"existing":"value"}');
  });

  it('returns null when update is undefined and existing is null', () => {
    const result = updateOptionalJson(undefined, null);
    expect(result).toBe(null);
  });

  it('returns null when update is undefined and existing is undefined', () => {
    const result = updateOptionalJson(undefined, undefined);
    expect(result).toBe(null);
  });

  it('works with arrays', () => {
    const result = updateOptionalJson(['a', 'b'], ['x']);
    expect(result).toBe('["a","b"]');
  });

  it('preserves existing array when update is undefined', () => {
    const result = updateOptionalJson(undefined, ['x', 'y']);
    expect(result).toBe('["x","y"]');
  });
});

describe('updateOptionalValue', () => {
  it('returns update when update is provided', () => {
    const result = updateOptionalValue('new', 'existing');
    expect(result).toBe('new');
  });

  it('returns null when update is null (explicit clear)', () => {
    const result = updateOptionalValue(null, 'existing');
    expect(result).toBe(null);
  });

  it('returns existing when update is undefined', () => {
    const result = updateOptionalValue(undefined, 'existing');
    expect(result).toBe('existing');
  });

  it('returns null when update is undefined and existing is null', () => {
    const result = updateOptionalValue(undefined, null);
    expect(result).toBe(null);
  });

  it('returns null when update is undefined and existing is undefined', () => {
    const result = updateOptionalValue(undefined, undefined);
    expect(result).toBe(null);
  });

  it('works with numbers', () => {
    const result = updateOptionalValue(42, 10);
    expect(result).toBe(42);
  });

  it('returns 0 when update is 0 (falsy but valid)', () => {
    const result = updateOptionalValue(0, 10);
    expect(result).toBe(0);
  });

  it('returns empty string when update is empty string (falsy but valid)', () => {
    const result = updateOptionalValue('', 'existing');
    expect(result).toBe('');
  });
});

describe('updateRequiredJson', () => {
  it('returns stringified update when update is provided', () => {
    const result = updateRequiredJson({ foo: 'bar' }, { existing: 'value' });
    expect(result).toBe('{"foo":"bar"}');
  });

  it('returns stringified existing when update is undefined', () => {
    const result = updateRequiredJson(undefined, { existing: 'value' });
    expect(result).toBe('{"existing":"value"}');
  });

  it('works with arrays', () => {
    const result = updateRequiredJson(['a', 'b'], ['x']);
    expect(result).toBe('["a","b"]');
  });

  it('preserves existing array when update is undefined', () => {
    const result = updateRequiredJson(undefined, ['x', 'y']);
    expect(result).toBe('["x","y"]');
  });

  it('returns stringified empty array when both are empty', () => {
    const result = updateRequiredJson([], []);
    expect(result).toBe('[]');
  });

  it('uses existing when update is undefined even for empty array', () => {
    const result = updateRequiredJson(undefined, []);
    expect(result).toBe('[]');
  });
});
