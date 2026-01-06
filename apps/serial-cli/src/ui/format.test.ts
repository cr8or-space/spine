/**
 * Tests for output formatting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config to control output format
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(() => ({
    serverUrl: 'ws://localhost:8080',
    outputFormat: 'table',
    color: false // Disable color for easier testing
  }))
}));

// Mock cli-table3 to avoid ESM compatibility issues in vitest
vi.mock('cli-table3', () => ({
  default: class MockTable {
    private options: { head: string[] };
    private rows: string[][] = [];
    constructor(options: { head: string[] }) {
      this.options = options;
    }
    push(row: string[]) {
      this.rows.push(row);
    }
    toString() {
      const header = this.options.head.join(' | ');
      const body = this.rows.map((r) => r.join(' | ')).join('\n');
      return header + '\n' + body;
    }
  }
}));

import {
  formatTable,
  formatKeyValue,
  success,
  error,
  warning,
  info,
  header,
  dim,
  truncate
} from './format.js';
import { loadConfig } from '../config.js';

describe('format', () => {
  beforeEach(() => {
    vi.mocked(loadConfig).mockReturnValue({
      serverUrl: 'ws://localhost:8080',
      outputFormat: 'table',
      color: false
    });
  });

  describe('formatTable', () => {
    it('should format rows as table', () => {
      const rows = [
        ['a', 'b', 'c'],
        ['1', '2', '3']
      ];

      const result = formatTable(rows, { head: ['Col1', 'Col2', 'Col3'] });

      expect(result).toContain('Col1');
      expect(result).toContain('Col2');
      expect(result).toContain('Col3');
      expect(result).toContain('a');
      expect(result).toContain('b');
      expect(result).toContain('c');
    });

    it('should format as JSON when output format is json', () => {
      vi.mocked(loadConfig).mockReturnValue({
        serverUrl: 'ws://localhost:8080',
        outputFormat: 'json',
        color: false
      });

      const rows = [['a', 'b']];
      const result = formatTable(rows, { head: ['A', 'B'] });

      expect(JSON.parse(result)).toEqual([['a', 'b']]);
    });

    it('should format as plain text when output format is plain', () => {
      vi.mocked(loadConfig).mockReturnValue({
        serverUrl: 'ws://localhost:8080',
        outputFormat: 'plain',
        color: false
      });

      const rows = [
        ['a', 'b'],
        ['c', 'd']
      ];
      const result = formatTable(rows, { head: ['A', 'B'] });

      expect(result).toBe('a\tb\nc\td');
    });
  });

  describe('formatKeyValue', () => {
    it('should format object as key-value table', () => {
      const data = {
        name: 'Test',
        value: 123
      };

      const result = formatKeyValue(data);

      expect(result).toContain('Property');
      expect(result).toContain('Value');
      expect(result).toContain('name');
      expect(result).toContain('Test');
    });

    it('should format as JSON when output format is json', () => {
      vi.mocked(loadConfig).mockReturnValue({
        serverUrl: 'ws://localhost:8080',
        outputFormat: 'json',
        color: false
      });

      const data = { key: 'value' };
      const result = formatKeyValue(data);

      expect(JSON.parse(result)).toEqual({ key: 'value' });
    });
  });

  describe('message formatting', () => {
    it('should format success message', () => {
      const result = success('Operation completed');
      expect(result).toContain('OK');
      expect(result).toContain('Operation completed');
    });

    it('should format error message', () => {
      const result = error('Something failed');
      expect(result).toContain('ERROR');
      expect(result).toContain('Something failed');
    });

    it('should format warning message', () => {
      const result = warning('Be careful');
      expect(result).toContain('WARN');
      expect(result).toContain('Be careful');
    });

    it('should format info message', () => {
      const result = info('For your information');
      expect(result).toContain('INFO');
      expect(result).toContain('For your information');
    });

    it('should format header', () => {
      const result = header('My Header');
      expect(result).toContain('My Header');
      expect(result).toContain('===');
    });

    it('should format dim text', () => {
      const result = dim('Secondary text');
      expect(result).toBe('Secondary text'); // No color, just returns text
    });
  });

  describe('truncate', () => {
    it('should not truncate short text', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long text with ellipsis', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    it('should handle exact length', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });
  });
});
