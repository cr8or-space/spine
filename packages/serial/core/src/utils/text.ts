/**
 * Text utility functions
 *
 * Common text processing functions used across the serial domain.
 * Extracted from generation/draft.ts, generation/pipeline.ts,
 * analysis/service.ts, and storage/repositories/content-repository.ts.
 */

/**
 * Count the number of words in a text string.
 *
 * Splits on whitespace and filters out empty segments.
 *
 * @param text - The text to count words in
 * @returns The number of words
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Split text into paragraphs.
 *
 * Paragraphs are separated by one or more blank lines.
 *
 * @param text - The text to split
 * @returns Array of non-empty paragraphs
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Truncate text to a maximum length.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default 100)
 * @param addEllipsis - Whether to add '...' when truncated (default false)
 * @returns Truncated text
 */
export function truncateText(
  text: string,
  maxLength: number = 100,
  addEllipsis: boolean = false
): string {
  if (text.length <= maxLength) {
    return text;
  }
  if (addEllipsis) {
    return text.substring(0, maxLength - 3) + '...';
  }
  return text.substring(0, maxLength);
}

/**
 * Escape a query string for FTS5 full-text search.
 *
 * Double-quotes are escaped by doubling them.
 *
 * @param query - The search query
 * @returns Escaped query safe for FTS5
 */
export function escapeFts5Query(query: string): string {
  return query.replace(/"/g, '""');
}

/**
 * Format a query for FTS5 prefix search.
 *
 * @param query - The search query
 * @returns Formatted query for FTS5 prefix matching
 */
export function formatFts5PrefixQuery(query: string): string {
  const escaped = escapeFts5Query(query);
  return `"${escaped}"*`;
}
