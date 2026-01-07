import { describe, it, expect } from 'vitest';

import { updateOptionalJson, updateOptionalValue, updateRequiredJson } from './repository';

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
