/**
 * Tests for snippet repository
 */

import { describe, expect, it, beforeEach } from 'vitest';

import type { SnippetOperation } from '@repo/techbook-types';

import {
  createSnippetRepository,
  type SnippetRepository,
  type CreateSnippetData,
} from './repository';

describe('SnippetRepository', () => {
  let repository: SnippetRepository;

  beforeEach(() => {
    repository = createSnippetRepository();
  });

  const createTestSnippet = (overrides: Partial<CreateSnippetData> = {}): CreateSnippetData => ({
    name: 'Test Snippet',
    file: 'src/main.ts',
    operation: 'introduce',
    language: 'typescript',
    code: 'console.log("Hello");',
    chapterId: 'chapter-1',
    order: 0,
    ...overrides,
  });

  describe('CRUD operations', () => {
    it('should create a snippet', () => {
      const snippet = repository.create(
        createTestSnippet({
          name: 'Initial Setup',
          file: 'src/index.ts',
          operation: 'introduce',
        })
      );

      expect(snippet.id).toBeDefined();
      expect(snippet.name).toBe('Initial Setup');
      expect(snippet.file).toBe('src/index.ts');
      expect(snippet.operation).toBe('introduce');
      expect(snippet.entityType).toBe('snippet');
      expect(snippet.createdAt).toBeDefined();
      expect(snippet.updatedAt).toBeDefined();
    });

    it('should retrieve a snippet by ID', () => {
      const created = repository.create(createTestSnippet({ name: 'Parser Setup' }));
      const retrieved = repository.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Parser Setup');
    });

    it('should return undefined for non-existent snippet', () => {
      const result = repository.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should update a snippet', () => {
      const created = repository.create(createTestSnippet({ name: 'Initial' }));
      const updated = repository.update(created.id, {
        name: 'Updated',
        code: 'const x = 1;',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated');
      expect(updated?.code).toBe('const x = 1;');
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should return undefined when updating non-existent snippet', () => {
      const result = repository.update('non-existent', { name: 'New Name' });
      expect(result).toBeUndefined();
    });

    it('should not allow changing ID on update', () => {
      const created = repository.create(createTestSnippet({ name: 'Test' }));
      const updated = repository.update(created.id, {
        // @ts-expect-error - testing runtime behavior
        id: 'new-id',
        name: 'Updated',
      });

      expect(updated?.id).toBe(created.id);
    });

    it('should delete a snippet', () => {
      const created = repository.create(createTestSnippet({ name: 'ToDelete' }));
      const deleted = repository.delete(created.id);

      expect(deleted).toBe(true);
      expect(repository.get(created.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent snippet', () => {
      const result = repository.delete('non-existent');
      expect(result).toBe(false);
    });

    it('should get all snippets', () => {
      repository.create(createTestSnippet({ name: 'Snippet A' }));
      repository.create(createTestSnippet({ name: 'Snippet B' }));
      repository.create(createTestSnippet({ name: 'Snippet C' }));

      const all = repository.getAll();
      expect(all).toHaveLength(3);
      expect(all.map((s) => s.name).sort()).toEqual(['Snippet A', 'Snippet B', 'Snippet C']);
    });

    it('should report correct size', () => {
      expect(repository.size()).toBe(0);

      repository.create(createTestSnippet({ name: 'One' }));
      expect(repository.size()).toBe(1);

      repository.create(createTestSnippet({ name: 'Two' }));
      expect(repository.size()).toBe(2);
    });

    it('should clear all snippets', () => {
      repository.create(createTestSnippet({ name: 'One' }));
      repository.create(createTestSnippet({ name: 'Two' }));

      repository.clear();

      expect(repository.size()).toBe(0);
      expect(repository.getAll()).toEqual([]);
    });
  });

  describe('Querying', () => {
    it('should get snippets by file', () => {
      repository.create(createTestSnippet({ name: 'A', file: 'src/parser.ts' }));
      repository.create(createTestSnippet({ name: 'B', file: 'src/lexer.ts' }));
      repository.create(createTestSnippet({ name: 'C', file: 'src/parser.ts' }));

      const parserSnippets = repository.getByFile('src/parser.ts');
      expect(parserSnippets).toHaveLength(2);
      expect(parserSnippets.map((s) => s.name).sort()).toEqual(['A', 'C']);
    });

    it('should get snippets by chapter', () => {
      repository.create(createTestSnippet({ name: 'A', chapterId: 'chapter-1' }));
      repository.create(createTestSnippet({ name: 'B', chapterId: 'chapter-2' }));
      repository.create(createTestSnippet({ name: 'C', chapterId: 'chapter-1' }));

      const chapter1 = repository.getByChapter('chapter-1');
      expect(chapter1).toHaveLength(2);
      expect(chapter1.map((s) => s.name).sort()).toEqual(['A', 'C']);
    });

    it('should get snippets by part', () => {
      repository.create(createTestSnippet({ name: 'A', file: 'src/parser.ts', part: 'init' }));
      repository.create(createTestSnippet({ name: 'B', file: 'src/parser.ts', part: 'parse' }));
      repository.create(createTestSnippet({ name: 'C', file: 'src/parser.ts', part: 'init' }));
      repository.create(createTestSnippet({ name: 'D', file: 'src/lexer.ts', part: 'init' }));

      const initSnippets = repository.getByPart('src/parser.ts', 'init');
      expect(initSnippets).toHaveLength(2);
      expect(initSnippets.map((s) => s.name).sort()).toEqual(['A', 'C']);
    });

    it('should list with filters', () => {
      repository.create(
        createTestSnippet({
          name: 'A',
          file: 'src/parser.ts',
          operation: 'introduce',
          language: 'typescript',
        })
      );
      repository.create(
        createTestSnippet({
          name: 'B',
          file: 'src/parser.ts',
          operation: 'append',
          language: 'typescript',
        })
      );
      repository.create(
        createTestSnippet({
          name: 'C',
          file: 'src/lexer.ts',
          operation: 'introduce',
          language: 'typescript',
        })
      );

      // Filter by file
      expect(repository.list({ file: 'src/parser.ts' })).toHaveLength(2);

      // Filter by operation
      expect(repository.list({ operation: 'introduce' })).toHaveLength(2);

      // Filter by multiple criteria
      expect(
        repository.list({ file: 'src/parser.ts', operation: 'introduce' })
      ).toHaveLength(1);
    });

    it('should check if snippet exists', () => {
      const snippet = repository.create(createTestSnippet({ name: 'Test' }));

      expect(repository.has(snippet.id)).toBe(true);
      expect(repository.has('non-existent')).toBe(false);
    });

    it('should get unique files', () => {
      repository.create(createTestSnippet({ file: 'src/parser.ts' }));
      repository.create(createTestSnippet({ file: 'src/lexer.ts' }));
      repository.create(createTestSnippet({ file: 'src/parser.ts' }));
      repository.create(createTestSnippet({ file: 'src/types.ts' }));

      const files = repository.getFiles();
      expect(files).toEqual(['src/lexer.ts', 'src/parser.ts', 'src/types.ts']);
    });

    it('should get unique parts for a file', () => {
      repository.create(createTestSnippet({ file: 'src/parser.ts', part: 'init' }));
      repository.create(createTestSnippet({ file: 'src/parser.ts', part: 'parse' }));
      repository.create(createTestSnippet({ file: 'src/parser.ts', part: 'init' }));
      repository.create(createTestSnippet({ file: 'src/parser.ts' })); // no part
      repository.create(createTestSnippet({ file: 'src/lexer.ts', part: 'init' }));

      const parts = repository.getParts('src/parser.ts');
      expect(parts).toEqual(['init', 'parse']);
    });
  });

  describe('Ordering', () => {
    it('should get snippets in order by chapter and position', () => {
      repository.create(createTestSnippet({ name: 'C1-O1', chapterId: 'ch-1', order: 1 }));
      repository.create(createTestSnippet({ name: 'C2-O0', chapterId: 'ch-2', order: 0 }));
      repository.create(createTestSnippet({ name: 'C1-O0', chapterId: 'ch-1', order: 0 }));
      repository.create(createTestSnippet({ name: 'C3-O0', chapterId: 'ch-3', order: 0 }));
      repository.create(createTestSnippet({ name: 'C2-O1', chapterId: 'ch-2', order: 1 }));

      const chapterOrder = ['ch-1', 'ch-2', 'ch-3'];
      const ordered = repository.getInOrder(chapterOrder);

      expect(ordered.map((s) => s.name)).toEqual([
        'C1-O0',
        'C1-O1',
        'C2-O0',
        'C2-O1',
        'C3-O0',
      ]);
    });

    it('should exclude snippets from unknown chapters', () => {
      repository.create(createTestSnippet({ name: 'Known', chapterId: 'ch-1', order: 0 }));
      repository.create(createTestSnippet({ name: 'Unknown', chapterId: 'ch-unknown', order: 0 }));

      const ordered = repository.getInOrder(['ch-1', 'ch-2']);
      expect(ordered.map((s) => s.name)).toEqual(['Known']);
    });

    it('should get snippets up to a specific chapter', () => {
      repository.create(createTestSnippet({ name: 'C1-O0', chapterId: 'ch-1', order: 0 }));
      repository.create(createTestSnippet({ name: 'C1-O1', chapterId: 'ch-1', order: 1 }));
      repository.create(createTestSnippet({ name: 'C2-O0', chapterId: 'ch-2', order: 0 }));
      repository.create(createTestSnippet({ name: 'C3-O0', chapterId: 'ch-3', order: 0 }));

      const chapterOrder = ['ch-1', 'ch-2', 'ch-3'];
      const upToC2 = repository.getUpToChapter('ch-2', chapterOrder);

      expect(upToC2.map((s) => s.name)).toEqual(['C1-O0', 'C1-O1', 'C2-O0']);
    });

    it('should return empty array for unknown chapter', () => {
      repository.create(createTestSnippet({ name: 'A', chapterId: 'ch-1', order: 0 }));

      const result = repository.getUpToChapter('ch-unknown', ['ch-1', 'ch-2']);
      expect(result).toEqual([]);
    });
  });

  describe('Summaries', () => {
    it('should get snippet summary', () => {
      const snippet = repository.create(
        createTestSnippet({
          name: 'Token Scanner',
          file: 'src/lexer.ts',
          part: 'scan',
          operation: 'introduce',
          language: 'typescript',
          code: 'function scan() {\n  return [];\n}',
          chapterId: 'chapter-3',
        })
      );

      const summary = repository.getSummary(snippet.id);

      expect(summary).toBeDefined();
      expect(summary?.id).toBe(snippet.id);
      expect(summary?.name).toBe('Token Scanner');
      expect(summary?.file).toBe('src/lexer.ts');
      expect(summary?.part).toBe('scan');
      expect(summary?.operation).toBe('introduce');
      expect(summary?.language).toBe('typescript');
      expect(summary?.lineCount).toBe(3);
      expect(summary?.chapterId).toBe('chapter-3');
    });

    it('should return undefined for non-existent snippet summary', () => {
      expect(repository.getSummary('non-existent')).toBeUndefined();
    });

    it('should get all summaries', () => {
      repository.create(createTestSnippet({ name: 'A' }));
      repository.create(createTestSnippet({ name: 'B' }));

      const summaries = repository.getAllSummaries();
      expect(summaries).toHaveLength(2);
      expect(summaries.map((s) => s.name).sort()).toEqual(['A', 'B']);
    });

    it('should count lines correctly', () => {
      // Empty code
      const empty = repository.create(createTestSnippet({ name: 'Empty', code: '' }));
      expect(repository.getSummary(empty.id)?.lineCount).toBe(0);

      // Single line
      const single = repository.create(createTestSnippet({ name: 'Single', code: 'const x = 1;' }));
      expect(repository.getSummary(single.id)?.lineCount).toBe(1);

      // Multiple lines
      const multi = repository.create(
        createTestSnippet({
          name: 'Multi',
          code: 'line 1\nline 2\nline 3',
        })
      );
      expect(repository.getSummary(multi.id)?.lineCount).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle snippets with all optional fields', () => {
      const snippet = repository.create({
        name: 'Minimal',
        file: 'src/main.ts',
        operation: 'introduce' as SnippetOperation,
        language: 'typescript',
        code: 'const x = 1;',
        chapterId: 'ch-1',
        order: 0,
      });

      expect(snippet.part).toBeUndefined();
      expect(snippet.explanationId).toBeUndefined();
    });

    it('should preserve optional fields on update', () => {
      const snippet = repository.create(
        createTestSnippet({
          name: 'Original',
          part: 'myPart',
          explanationId: 'explanation-1',
        })
      );

      const updated = repository.update(snippet.id, { name: 'Updated' });

      expect(updated?.part).toBe('myPart');
      expect(updated?.explanationId).toBe('explanation-1');
    });
  });
});
