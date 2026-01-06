/**
 * Tests for repository utilities.
 */

import { describe, it, expect } from 'vitest';

import {
  generateId,
  nowTimestamp,
  parseJson,
  boolToInt,
  intToBool,
  wrapResult,
  mapRow,
  mapRows,
} from './repository';

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('generates non-empty strings', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('nowTimestamp', () => {
  it('returns ISO timestamp string', () => {
    const ts = nowTimestamp();
    expect(typeof ts).toBe('string');
    // Should be parseable as a date
    const date = new Date(ts);
    expect(date.getTime()).not.toBeNaN();
  });
});

describe('parseJson', () => {
  it('parses valid JSON', () => {
    const result = parseJson('{"a": 1}', {});
    expect(result).toEqual({ a: 1 });
  });

  it('returns default for null', () => {
    const result = parseJson(null, { default: true });
    expect(result).toEqual({ default: true });
  });

  it('returns default for undefined', () => {
    const result = parseJson(undefined, { default: true });
    expect(result).toEqual({ default: true });
  });

  it('returns default for invalid JSON', () => {
    const result = parseJson('not json', { default: true });
    expect(result).toEqual({ default: true });
  });

  it('returns default for empty string', () => {
    const result = parseJson('', { default: true });
    expect(result).toEqual({ default: true });
  });
});

describe('boolToInt', () => {
  it('converts true to 1', () => {
    expect(boolToInt(true)).toBe(1);
  });

  it('converts false to 0', () => {
    expect(boolToInt(false)).toBe(0);
  });
});

describe('intToBool', () => {
  it('converts 1 to true', () => {
    expect(intToBool(1)).toBe(true);
  });

  it('converts 0 to false', () => {
    expect(intToBool(0)).toBe(false);
  });

  it('converts null to false', () => {
    expect(intToBool(null)).toBe(false);
  });

  it('converts undefined to false', () => {
    expect(intToBool(undefined)).toBe(false);
  });

  it('converts other numbers to false', () => {
    expect(intToBool(2)).toBe(false);
    expect(intToBool(-1)).toBe(false);
  });
});

describe('wrapResult', () => {
  it('wraps successful operation', () => {
    const result = wrapResult(() => 42);
    expect(result).toEqual({ success: true, data: 42 });
  });

  it('wraps failed operation with Error', () => {
    const result = wrapResult(() => {
      throw new Error('test error');
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('test error');
    }
  });

  it('wraps failed operation with string', () => {
    const result = wrapResult(() => {
      throw 'string error';
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('string error');
    }
  });
});

describe('mapRow', () => {
  it('maps defined row', () => {
    const row = { id: '1', name: 'test' };
    const result = mapRow(row, (r) => ({ ...r, mapped: true }));
    expect(result).toEqual({ id: '1', name: 'test', mapped: true });
  });

  it('returns undefined for undefined row', () => {
    const result = mapRow(undefined, (r) => r);
    expect(result).toBeUndefined();
  });
});

describe('mapRows', () => {
  it('maps all rows', () => {
    const rows = [{ id: '1' }, { id: '2' }];
    const result = mapRows(rows, (r) => ({ ...r, mapped: true }));
    expect(result).toEqual([
      { id: '1', mapped: true },
      { id: '2', mapped: true },
    ]);
  });

  it('returns empty array for empty input', () => {
    const result = mapRows([], (r) => r);
    expect(result).toEqual([]);
  });
});
