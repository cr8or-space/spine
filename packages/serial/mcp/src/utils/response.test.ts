/**
 * Tests for MCP response utilities
 */

import { describe, expect, it } from 'vitest';

import { emptyListResponse, listResponse, textResponse } from './response';

describe('textResponse', () => {
  it('should create a text response', () => {
    const result = textResponse('Hello world');
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Hello world' }],
    });
  });

  it('should handle empty string', () => {
    const result = textResponse('');
    expect(result).toEqual({
      content: [{ type: 'text', text: '' }],
    });
  });

  it('should handle multiline text', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const result = textResponse(text);
    expect(result.content[0].text).toBe(text);
  });
});

describe('emptyListResponse', () => {
  it('should create empty list response without tool hint', () => {
    const result = emptyListResponse('characters');
    expect(result.content[0].text).toBe('No characters found.');
  });

  it('should create empty list response with tool hint', () => {
    const result = emptyListResponse('characters', 'spine_bible_character_create');
    expect(result.content[0].text).toBe(
      'No characters found. Use `spine_bible_character_create` to add characters.'
    );
  });

  it('should handle plural entity names', () => {
    const result = emptyListResponse('plot threads', 'spine_bible_thread_create');
    expect(result.content[0].text).toBe(
      'No plot threads found. Use `spine_bible_thread_create` to add plot threads.'
    );
  });
});

describe('listResponse', () => {
  interface TestItem {
    id: string;
    name: string;
  }

  const formatItem = (item: TestItem) => `**${item.name}** (${item.id})`;

  it('should return empty response for empty list', () => {
    const result = listResponse<TestItem>([], 'items', formatItem);
    expect(result.content[0].text).toBe('No items found.');
  });

  it('should return empty response with create tool hint', () => {
    const result = listResponse<TestItem>([], 'items', formatItem, {
      createTool: 'create_item',
    });
    expect(result.content[0].text).toBe('No items found. Use `create_item` to add items.');
  });

  it('should format list with default separator', () => {
    const items: TestItem[] = [
      { id: '1', name: 'First' },
      { id: '2', name: 'Second' },
    ];
    const result = listResponse(items, 'items', formatItem);
    expect(result.content[0].text).toBe(
      '# Items (2)\n\n**First** (1)\n\n---\n\n**Second** (2)'
    );
  });

  it('should format list with custom separator', () => {
    const items: TestItem[] = [
      { id: '1', name: 'First' },
      { id: '2', name: 'Second' },
    ];
    const result = listResponse(items, 'items', formatItem, {
      separator: '\n',
    });
    expect(result.content[0].text).toBe('# Items (2)\n\n**First** (1)\n**Second** (2)');
  });

  it('should format list with custom title', () => {
    const items: TestItem[] = [{ id: '1', name: 'First' }];
    const result = listResponse(items, 'items', formatItem, {
      title: '## Custom Title',
    });
    expect(result.content[0].text).toBe('## Custom Title\n\n**First** (1)');
  });

  it('should capitalize entity name in default title', () => {
    const items: TestItem[] = [{ id: '1', name: 'Test' }];
    const result = listResponse(items, 'characters', formatItem);
    expect(result.content[0].text).toContain('# Characters (1)');
  });

  it('should handle single item', () => {
    const items: TestItem[] = [{ id: '1', name: 'Only' }];
    const result = listResponse(items, 'items', formatItem);
    expect(result.content[0].text).toBe('# Items (1)\n\n**Only** (1)');
  });
});
