/**
 * Tests for text utility functions
 */

import { describe, expect, it } from 'vitest';

import {
  countWords,
  escapeFts5Query,
  formatFts5PrefixQuery,
  splitParagraphs,
  truncateText,
} from './text';

describe('countWords', () => {
  it('should count words correctly', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('hello world')).toBe(2);
    expect(countWords('single')).toBe(1);
  });

  it('should handle empty and whitespace strings', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('\n\t')).toBe(0);
  });

  it('should handle multiple whitespace between words', () => {
    expect(countWords('one   two    three')).toBe(3);
    expect(countWords('  spaced  out  words  ')).toBe(3);
  });

  it('should handle newlines and tabs', () => {
    expect(countWords('line one\nline two')).toBe(4);
    expect(countWords('tab\tseparated\twords')).toBe(3);
  });
});

describe('splitParagraphs', () => {
  it('should split text by blank lines', () => {
    const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
    const result = splitParagraphs(text);
    expect(result).toEqual(['Paragraph one.', 'Paragraph two.', 'Paragraph three.']);
  });

  it('should handle single paragraph', () => {
    const text = 'Just one paragraph here.';
    expect(splitParagraphs(text)).toEqual(['Just one paragraph here.']);
  });

  it('should handle empty text', () => {
    expect(splitParagraphs('')).toEqual([]);
    expect(splitParagraphs('   ')).toEqual([]);
  });

  it('should trim paragraphs', () => {
    const text = '  Paragraph one.  \n\n  Paragraph two.  ';
    const result = splitParagraphs(text);
    expect(result).toEqual(['Paragraph one.', 'Paragraph two.']);
  });

  it('should handle multiple blank lines', () => {
    const text = 'First.\n\n\n\nSecond.';
    const result = splitParagraphs(text);
    expect(result).toEqual(['First.', 'Second.']);
  });
});

describe('truncateText', () => {
  it('should return unchanged text if under limit', () => {
    expect(truncateText('short', 100)).toBe('short');
    expect(truncateText('exactly100', 100)).toBe('exactly100');
  });

  it('should truncate without ellipsis by default', () => {
    const result = truncateText('This is a longer text that should be truncated', 20);
    expect(result.length).toBe(20);
    expect(result).toBe('This is a longer tex');
  });

  it('should truncate and add ellipsis when requested', () => {
    const result = truncateText('This is a longer text that should be truncated', 20, true);
    expect(result.length).toBe(20);
    expect(result).toBe('This is a longer ...');
  });

  it('should use default max length of 100', () => {
    const longText = 'a'.repeat(150);
    const result = truncateText(longText);
    expect(result.length).toBe(100);
    expect(result.endsWith('...')).toBe(false);
  });

  it('should add ellipsis with default max length when requested', () => {
    const longText = 'a'.repeat(150);
    const result = truncateText(longText, 100, true);
    expect(result.length).toBe(100);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle edge case of very short max length with ellipsis', () => {
    const result = truncateText('hello world', 5, true);
    expect(result).toBe('he...');
  });
});

describe('escapeFts5Query', () => {
  it('should escape double quotes', () => {
    expect(escapeFts5Query('search "term"')).toBe('search ""term""');
    expect(escapeFts5Query('"quoted"')).toBe('""quoted""');
  });

  it('should leave other characters unchanged', () => {
    expect(escapeFts5Query('simple search')).toBe('simple search');
    expect(escapeFts5Query("with 'single' quotes")).toBe("with 'single' quotes");
  });

  it('should handle empty string', () => {
    expect(escapeFts5Query('')).toBe('');
  });

  it('should handle multiple quotes', () => {
    expect(escapeFts5Query('""')).toBe('""""');
    expect(escapeFts5Query('a"b"c"d')).toBe('a""b""c""d');
  });
});

describe('formatFts5PrefixQuery', () => {
  it('should format simple query', () => {
    expect(formatFts5PrefixQuery('test')).toBe('"test"*');
    expect(formatFts5PrefixQuery('search term')).toBe('"search term"*');
  });

  it('should escape quotes in query', () => {
    expect(formatFts5PrefixQuery('search "term"')).toBe('"search ""term"""*');
  });

  it('should handle empty string', () => {
    expect(formatFts5PrefixQuery('')).toBe('""*');
  });
});
