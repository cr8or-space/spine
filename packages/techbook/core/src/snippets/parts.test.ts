/**
 * Tests for named part management
 */

import { describe, expect, it, beforeEach } from 'vitest';

import type { Snippet, SnippetOperation } from '@repo/techbook-types';

import {
  createPartManager,
  parsePartName,
  getPartHierarchy,
  isChildPart,
  validatePartHierarchy,
  processSnippetsForFile,
  type PartManager,
} from './parts';

describe('parsePartName', () => {
  it('should parse simple part names', () => {
    expect(parsePartName('init')).toEqual({ parent: undefined, child: 'init' });
    expect(parsePartName('parseExpression')).toEqual({
      parent: undefined,
      child: 'parseExpression',
    });
  });

  it('should parse nested part names', () => {
    expect(parsePartName('parse.setup')).toEqual({ parent: 'parse', child: 'setup' });
    expect(parsePartName('a.b.c')).toEqual({ parent: 'a.b', child: 'c' });
  });
});

describe('getPartHierarchy', () => {
  it('should return single-element array for simple names', () => {
    expect(getPartHierarchy('init')).toEqual(['init']);
  });

  it('should return full hierarchy for nested names', () => {
    expect(getPartHierarchy('a.b.c')).toEqual(['a', 'a.b', 'a.b.c']);
    expect(getPartHierarchy('parse.setup.vars')).toEqual([
      'parse',
      'parse.setup',
      'parse.setup.vars',
    ]);
  });
});

describe('isChildPart', () => {
  it('should detect direct children', () => {
    expect(isChildPart('parse.setup', 'parse')).toBe(true);
    expect(isChildPart('a.b', 'a')).toBe(true);
  });

  it('should detect nested children', () => {
    expect(isChildPart('a.b.c', 'a')).toBe(true);
    expect(isChildPart('a.b.c.d', 'a.b')).toBe(true);
  });

  it('should not detect non-children', () => {
    expect(isChildPart('parse', 'parse')).toBe(false); // same part
    expect(isChildPart('parseExpr', 'parse')).toBe(false); // prefix but not child
    expect(isChildPart('other.setup', 'parse')).toBe(false); // different parent
  });
});

describe('validatePartHierarchy', () => {
  it('should return empty for top-level parts', () => {
    const existing = new Set(['other']);
    expect(validatePartHierarchy('newPart', existing)).toEqual([]);
  });

  it('should return missing parents for nested parts', () => {
    const existing = new Set<string>();
    expect(validatePartHierarchy('a.b.c', existing)).toEqual(['a', 'a.b']);
  });

  it('should only return actually missing parents', () => {
    const existing = new Set(['a']);
    expect(validatePartHierarchy('a.b.c', existing)).toEqual(['a.b']);
  });
});

describe('PartManager', () => {
  let manager: PartManager;
  const file = 'src/main.ts';

  beforeEach(() => {
    manager = createPartManager(file);
  });

  const createSnippet = (
    overrides: Partial<Snippet> & { operation: SnippetOperation }
  ): Snippet => ({
    id: `snippet-${Math.random().toString(36).substring(7)}`,
    entityType: 'snippet',
    name: 'Test Snippet',
    file,
    language: 'typescript',
    code: 'const x = 1;',
    chapterId: 'chapter-1',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  describe('File-level operations', () => {
    it('should introduce file content', () => {
      const snippet = createSnippet({
        operation: 'introduce',
        code: 'const x = 1;',
      });

      const error = manager.applySnippet(snippet);

      expect(error).toBeUndefined();
      expect(manager.assemble()).toBe('const x = 1;');
    });

    it('should append to file content', () => {
      manager.applySnippet(createSnippet({ operation: 'introduce', code: 'line1' }));
      manager.applySnippet(createSnippet({ operation: 'append', code: 'line2' }));

      expect(manager.assemble()).toBe('line1\nline2');
    });

    it('should prepend to file content', () => {
      manager.applySnippet(createSnippet({ operation: 'introduce', code: 'line2' }));
      manager.applySnippet(createSnippet({ operation: 'prepend', code: 'line1' }));

      expect(manager.assemble()).toBe('line1\nline2');
    });

    it('should replace file content', () => {
      manager.applySnippet(createSnippet({ operation: 'introduce', code: 'old' }));
      manager.applySnippet(createSnippet({ operation: 'replace', code: 'new' }));

      expect(manager.assemble()).toBe('new');
    });

    it('should delete file content', () => {
      manager.applySnippet(createSnippet({ operation: 'introduce', code: 'content' }));
      manager.applySnippet(createSnippet({ operation: 'delete', code: '' }));

      expect(manager.assemble()).toBe('');
    });
  });

  describe('Part operations', () => {
    it('should introduce a part', () => {
      const snippet = createSnippet({
        operation: 'introduce',
        part: 'init',
        code: 'function init() {}',
      });

      const error = manager.applySnippet(snippet);

      expect(error).toBeUndefined();
      expect(manager.hasPart('init')).toBe(true);
      expect(manager.getPart('init')?.content).toBe('function init() {}');
    });

    it('should error when introducing existing part', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'init', code: 'first' })
      );
      const error = manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'init', code: 'second' })
      );

      expect(error).toBeDefined();
      expect(error?.message).toContain('already exists');
    });

    it('should append to a part', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'init', code: 'line1' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'append', part: 'init', code: 'line2' })
      );

      expect(manager.getPart('init')?.content).toBe('line1\nline2');
    });

    it('should prepend to a part', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'init', code: 'line2' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'prepend', part: 'init', code: 'line1' })
      );

      expect(manager.getPart('init')?.content).toBe('line1\nline2');
    });

    it('should replace a part', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'init', code: 'old' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'replace', part: 'init', code: 'new' })
      );

      expect(manager.getPart('init')?.content).toBe('new');
    });

    it('should delete a part', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'init', code: 'content' })
      );
      manager.applySnippet(createSnippet({ operation: 'delete', part: 'init', code: '' }));

      expect(manager.hasPart('init')).toBe(false);
      expect(manager.getPart('init')?.deleted).toBe(true);
    });

    it('should error when operating on non-existent part', () => {
      const appendError = manager.applySnippet(
        createSnippet({ operation: 'append', part: 'nonexistent', code: 'x' })
      );
      expect(appendError?.message).toContain('does not exist');

      const replaceError = manager.applySnippet(
        createSnippet({ operation: 'replace', part: 'nonexistent', code: 'x' })
      );
      expect(replaceError?.message).toContain('does not exist');

      const prependError = manager.applySnippet(
        createSnippet({ operation: 'prepend', part: 'nonexistent', code: 'x' })
      );
      expect(prependError?.message).toContain('does not exist');

      const deleteError = manager.applySnippet(
        createSnippet({ operation: 'delete', part: 'nonexistent', code: '' })
      );
      expect(deleteError?.message).toContain('does not exist');
    });
  });

  describe('Nested parts', () => {
    it('should introduce nested part when parent exists', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse', code: 'function parse() {' })
      );
      const error = manager.applySnippet(
        createSnippet({
          operation: 'introduce',
          part: 'parse.setup',
          code: 'const vars = [];',
        })
      );

      expect(error).toBeUndefined();
      expect(manager.hasPart('parse.setup')).toBe(true);
    });

    it('should error when introducing nested part without parent', () => {
      const error = manager.applySnippet(
        createSnippet({
          operation: 'introduce',
          part: 'parse.setup',
          code: 'const vars = [];',
        })
      );

      expect(error).toBeDefined();
      expect(error?.message).toContain('parent part "parse" does not exist');
    });

    it('should delete child parts when parent is deleted', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse', code: 'parent' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse.setup', code: 'child1' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse.core', code: 'child2' })
      );

      manager.applySnippet(createSnippet({ operation: 'delete', part: 'parse', code: '' }));

      expect(manager.hasPart('parse')).toBe(false);
      expect(manager.hasPart('parse.setup')).toBe(false);
      expect(manager.hasPart('parse.core')).toBe(false);
    });

    it('should delete nested child parts when parent is replaced', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse', code: 'parent' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse.setup', code: 'child' })
      );

      manager.applySnippet(
        createSnippet({ operation: 'replace', part: 'parse', code: 'new parent' })
      );

      expect(manager.hasPart('parse')).toBe(true);
      expect(manager.getPart('parse')?.content).toBe('new parent');
      expect(manager.hasPart('parse.setup')).toBe(false);
    });

    it('should get child parts', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse', code: 'parent' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse.setup', code: 'child1' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse.core', code: 'child2' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'other', code: 'other' })
      );

      const children = manager.getChildParts('parse');
      expect(children.map((c) => c.part.name).sort()).toEqual(['parse.core', 'parse.setup']);
    });
  });

  describe('Error tracking', () => {
    it('should track snippet source IDs', () => {
      const snippet1 = createSnippet({
        id: 'snippet-1',
        operation: 'introduce',
        part: 'init',
        code: 'first',
      });
      const snippet2 = createSnippet({
        id: 'snippet-2',
        operation: 'append',
        part: 'init',
        code: 'second',
      });

      manager.applySnippet(snippet1);
      manager.applySnippet(snippet2);

      const part = manager.getPart('init');
      expect(part?.sourceSnippetIds).toContain('snippet-1');
      expect(part?.sourceSnippetIds).toContain('snippet-2');
    });

    it('should collect errors', () => {
      manager.applySnippet(
        createSnippet({ operation: 'append', part: 'nonexistent', code: 'x' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'replace', part: 'another', code: 'y' })
      );

      const errors = manager.getErrors();
      expect(errors).toHaveLength(2);
    });

    it('should error when applying snippet for wrong file', () => {
      const snippet = createSnippet({ operation: 'introduce', code: 'x' });
      snippet.file = 'other/file.ts';

      const error = manager.applySnippet(snippet);
      expect(error?.message).toContain('targets file');
    });
  });

  describe('Assembly', () => {
    it('should assemble file with parts', () => {
      manager.applySnippet(createSnippet({ operation: 'introduce', code: '// Header' }));
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'init', code: 'function init() {}' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'main', code: 'function main() {}' })
      );

      const assembled = manager.assemble();
      expect(assembled).toContain('// Header');
      expect(assembled).toContain('function init() {}');
      expect(assembled).toContain('function main() {}');
    });

    it('should assemble nested parts', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'parse', code: '// parse' })
      );
      manager.applySnippet(
        createSnippet({
          operation: 'introduce',
          part: 'parse.setup',
          code: '// setup',
        })
      );

      const assembled = manager.assemble();
      expect(assembled).toContain('// parse');
      expect(assembled).toContain('// setup');
    });

    it('should not include deleted parts in assembly', () => {
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'keep', code: 'keep me' })
      );
      manager.applySnippet(
        createSnippet({ operation: 'introduce', part: 'remove', code: 'remove me' })
      );
      manager.applySnippet(createSnippet({ operation: 'delete', part: 'remove', code: '' }));

      const assembled = manager.assemble();
      expect(assembled).toContain('keep me');
      expect(assembled).not.toContain('remove me');
    });
  });
});

describe('processSnippetsForFile', () => {
  const file = 'src/main.ts';

  const createSnippet = (
    overrides: Partial<Snippet> & { operation: SnippetOperation }
  ): Snippet => ({
    id: `snippet-${Math.random().toString(36).substring(7)}`,
    entityType: 'snippet',
    name: 'Test Snippet',
    file,
    language: 'typescript',
    code: 'const x = 1;',
    chapterId: 'chapter-1',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  it('should process a sequence of snippets', () => {
    const snippets = [
      createSnippet({ operation: 'introduce', part: 'init', code: 'init code' }),
      createSnippet({ operation: 'append', part: 'init', code: 'more code' }),
    ];

    const result = processSnippetsForFile(file, snippets);

    expect(result.file).toBe(file);
    expect(result.parts).toHaveLength(1);
    expect(result.parts[0]?.content).toBe('init code\nmore code');
    expect(result.errors).toHaveLength(0);
  });

  it('should collect errors during processing', () => {
    const snippets = [
      createSnippet({ operation: 'append', part: 'nonexistent', code: 'x' }),
    ];

    const result = processSnippetsForFile(file, snippets);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain('does not exist');
  });
});
