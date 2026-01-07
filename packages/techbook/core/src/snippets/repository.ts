/**
 * Snippet repository for managing code snippets.
 *
 * Provides CRUD operations for snippets - code fragments embedded in prose
 * that target specific files and parts.
 */

import { nanoid } from 'nanoid';

import type { Snippet, SnippetOperation, SnippetSummary } from '@repo/techbook-types';

/**
 * Data required to create a snippet.
 */
export type CreateSnippetData = Pick<
  Snippet,
  'name' | 'file' | 'operation' | 'language' | 'code' | 'chapterId' | 'order'
> &
  Partial<Pick<Snippet, 'part' | 'explanationId'>>;

/**
 * Data for updating a snippet
 */
export type UpdateSnippetData = Partial<
  Omit<Snippet, 'id' | 'entityType' | 'createdAt' | 'updatedAt'>
>;

/**
 * Options for listing snippets
 */
export interface ListSnippetsOptions {
  /** Filter by file path */
  file?: string;
  /** Filter by part name */
  part?: string;
  /** Filter by chapter ID */
  chapterId?: string;
  /** Filter by operation type */
  operation?: SnippetOperation;
  /** Filter by language */
  language?: string;
}

/**
 * Snippet repository interface
 */
export interface SnippetRepository {
  /** Get a snippet by ID */
  get(id: string): Snippet | undefined;

  /** Get all snippets */
  getAll(): Snippet[];

  /** Get snippets by file */
  getByFile(file: string): Snippet[];

  /** Get snippets by chapter */
  getByChapter(chapterId: string): Snippet[];

  /** Get snippets targeting a specific part */
  getByPart(file: string, part: string): Snippet[];

  /** List snippets with optional filters */
  list(options?: ListSnippetsOptions): Snippet[];

  /** Create a new snippet */
  create(data: CreateSnippetData): Snippet;

  /** Update a snippet */
  update(id: string, data: UpdateSnippetData): Snippet | undefined;

  /** Delete a snippet */
  delete(id: string): boolean;

  /** Check if a snippet exists */
  has(id: string): boolean;

  /** Get snippet summary for context assembly */
  getSummary(id: string): SnippetSummary | undefined;

  /** Get all snippet summaries */
  getAllSummaries(): SnippetSummary[];

  /**
   * Get snippets in order (by chapter order, then by order within chapter).
   * This is the order snippets should be applied during tangling.
   */
  getInOrder(chapterOrder: string[]): Snippet[];

  /**
   * Get all snippets up to and including a specific chapter.
   * Useful for tangling at a checkpoint.
   */
  getUpToChapter(chapterId: string, chapterOrder: string[]): Snippet[];

  /** Get unique files referenced by snippets */
  getFiles(): string[];

  /** Get unique parts for a file */
  getParts(file: string): string[];

  /** Clear all snippets */
  clear(): void;

  /** Get the number of snippets */
  size(): number;
}

/**
 * Generate a timestamp string
 */
function nowTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return nanoid();
}

/**
 * Count lines in code
 */
function countLines(code: string): number {
  if (code === '') return 0;
  return code.split('\n').length;
}

/**
 * Convert a snippet to a summary
 */
function toSummary(snippet: Snippet): SnippetSummary {
  return {
    id: snippet.id,
    name: snippet.name,
    file: snippet.file,
    part: snippet.part,
    operation: snippet.operation,
    language: snippet.language,
    lineCount: countLines(snippet.code),
    chapterId: snippet.chapterId,
  };
}

/**
 * Create an in-memory snippet repository
 */
export function createSnippetRepository(): SnippetRepository {
  const snippets = new Map<string, Snippet>();

  return {
    get(id: string): Snippet | undefined {
      return snippets.get(id);
    },

    getAll(): Snippet[] {
      return Array.from(snippets.values());
    },

    getByFile(file: string): Snippet[] {
      return this.getAll().filter((s) => s.file === file);
    },

    getByChapter(chapterId: string): Snippet[] {
      return this.getAll().filter((s) => s.chapterId === chapterId);
    },

    getByPart(file: string, part: string): Snippet[] {
      return this.getAll().filter((s) => s.file === file && s.part === part);
    },

    list(options?: ListSnippetsOptions): Snippet[] {
      let result = this.getAll();

      if (options?.file) {
        result = result.filter((s) => s.file === options.file);
      }
      if (options?.part) {
        result = result.filter((s) => s.part === options.part);
      }
      if (options?.chapterId) {
        result = result.filter((s) => s.chapterId === options.chapterId);
      }
      if (options?.operation) {
        result = result.filter((s) => s.operation === options.operation);
      }
      if (options?.language) {
        result = result.filter((s) => s.language === options.language);
      }

      return result;
    },

    create(data: CreateSnippetData): Snippet {
      const now = nowTimestamp();
      const snippet: Snippet = {
        id: generateId(),
        entityType: 'snippet',
        name: data.name,
        file: data.file,
        part: data.part,
        operation: data.operation,
        language: data.language,
        code: data.code,
        chapterId: data.chapterId,
        order: data.order,
        explanationId: data.explanationId,
        createdAt: now,
        updatedAt: now,
      };

      snippets.set(snippet.id, snippet);
      return snippet;
    },

    update(id: string, data: UpdateSnippetData): Snippet | undefined {
      const existing = snippets.get(id);
      if (!existing) return undefined;

      const updated: Snippet = {
        ...existing,
        ...data,
        id: existing.id, // Ensure ID cannot be changed
        entityType: 'snippet', // Ensure entityType cannot be changed
        createdAt: existing.createdAt, // Ensure createdAt cannot be changed
        updatedAt: nowTimestamp(),
      };

      snippets.set(id, updated);
      return updated;
    },

    delete(id: string): boolean {
      return snippets.delete(id);
    },

    has(id: string): boolean {
      return snippets.has(id);
    },

    getSummary(id: string): SnippetSummary | undefined {
      const snippet = this.get(id);
      return snippet ? toSummary(snippet) : undefined;
    },

    getAllSummaries(): SnippetSummary[] {
      return this.getAll().map(toSummary);
    },

    getInOrder(chapterOrder: string[]): Snippet[] {
      const chapterIndex = new Map<string, number>();
      chapterOrder.forEach((id, index) => chapterIndex.set(id, index));

      return this.getAll()
        .filter((s) => chapterIndex.has(s.chapterId))
        .sort((a, b) => {
          const aChapter = chapterIndex.get(a.chapterId) ?? 0;
          const bChapter = chapterIndex.get(b.chapterId) ?? 0;

          if (aChapter !== bChapter) {
            return aChapter - bChapter;
          }
          return a.order - b.order;
        });
    },

    getUpToChapter(chapterId: string, chapterOrder: string[]): Snippet[] {
      const chapterIndex = chapterOrder.indexOf(chapterId);
      if (chapterIndex === -1) return [];

      const validChapters = new Set(chapterOrder.slice(0, chapterIndex + 1));
      const chapterOrderMap = new Map<string, number>();
      chapterOrder.forEach((id, index) => chapterOrderMap.set(id, index));

      return this.getAll()
        .filter((s) => validChapters.has(s.chapterId))
        .sort((a, b) => {
          const aChapter = chapterOrderMap.get(a.chapterId) ?? 0;
          const bChapter = chapterOrderMap.get(b.chapterId) ?? 0;

          if (aChapter !== bChapter) {
            return aChapter - bChapter;
          }
          return a.order - b.order;
        });
    },

    getFiles(): string[] {
      const files = new Set<string>();
      for (const snippet of snippets.values()) {
        files.add(snippet.file);
      }
      return Array.from(files).sort();
    },

    getParts(file: string): string[] {
      const parts = new Set<string>();
      for (const snippet of snippets.values()) {
        if (snippet.file === file && snippet.part) {
          parts.add(snippet.part);
        }
      }
      return Array.from(parts).sort();
    },

    clear(): void {
      snippets.clear();
    },

    size(): number {
      return snippets.size;
    },
  };
}
