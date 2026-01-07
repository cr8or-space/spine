/**
 * Symbol-to-concept linking for code symbols.
 *
 * Manages bidirectional mapping between code symbols (function names,
 * type names, etc.) and the concepts that explain them.
 */

import type { Concept, SymbolLink } from '@repo/techbook-types';

/**
 * Result of validating symbol usage
 */
export interface SymbolValidationResult {
  /** Whether all symbols are properly linked and introduced */
  valid: boolean;
  /** Symbols used before their explaining concept is introduced */
  prematureUses: PrematureSymbolUse[];
  /** Symbols that appear in code but have no explaining concept */
  unexplainedSymbols: UnexplainedSymbol[];
  /** Concepts that claim symbols but those symbols don't appear in code */
  orphanedLinks: OrphanedLink[];
}

/**
 * A symbol used before its concept is introduced
 */
export interface PrematureSymbolUse {
  symbol: string;
  conceptId: string;
  conceptName: string;
  /** Chapter where the symbol is used */
  usedInChapterId: string;
  /** Chapter where the concept is introduced */
  introducedInChapterId: string;
}

/**
 * A symbol in code without an explaining concept
 */
export interface UnexplainedSymbol {
  symbol: string;
  /** Snippets where this symbol appears */
  snippetIds: string[];
  /** Chapters containing those snippets */
  chapterIds: string[];
}

/**
 * A concept claims a symbol that doesn't appear in code
 */
export interface OrphanedLink {
  symbol: string;
  conceptId: string;
  conceptName: string;
}

/**
 * Symbol registry interface for managing symbol-concept links
 */
export interface SymbolRegistry {
  /** Get all links */
  getAll(): SymbolLink[];

  /** Get the concept that explains a symbol */
  getConceptForSymbol(symbol: string): string | undefined;

  /** Get all symbols explained by a concept */
  getSymbolsForConcept(conceptId: string): string[];

  /** Get the link for a symbol */
  getLink(symbol: string): SymbolLink | undefined;

  /** Register a link between a symbol and its explaining concept */
  link(symbol: string, conceptId: string, snippetId: string): SymbolLink;

  /** Remove a link */
  unlink(symbol: string): boolean;

  /** Check if a symbol is linked */
  hasLink(symbol: string): boolean;

  /** Get all symbols from all links */
  getAllSymbols(): string[];

  /** Clear all links */
  clear(): void;

  /** Get the number of links */
  size(): number;
}

/**
 * Create an in-memory symbol registry
 */
export function createSymbolRegistry(): SymbolRegistry {
  const links = new Map<string, SymbolLink>();

  return {
    getAll(): SymbolLink[] {
      return Array.from(links.values());
    },

    getConceptForSymbol(symbol: string): string | undefined {
      return links.get(symbol)?.conceptId;
    },

    getSymbolsForConcept(conceptId: string): string[] {
      return this.getAll()
        .filter((link) => link.conceptId === conceptId)
        .map((link) => link.symbol);
    },

    getLink(symbol: string): SymbolLink | undefined {
      return links.get(symbol);
    },

    link(symbol: string, conceptId: string, snippetId: string): SymbolLink {
      const link: SymbolLink = { symbol, conceptId, snippetId };
      links.set(symbol, link);
      return link;
    },

    unlink(symbol: string): boolean {
      return links.delete(symbol);
    },

    hasLink(symbol: string): boolean {
      return links.has(symbol);
    },

    getAllSymbols(): string[] {
      return Array.from(links.keys());
    },

    clear(): void {
      links.clear();
    },

    size(): number {
      return links.size;
    },
  };
}

/**
 * Information about a snippet needed for symbol validation
 */
export interface SnippetInfo {
  id: string;
  chapterId: string;
  /** Symbols that appear in this snippet's code */
  symbols: string[];
}

/**
 * Validate symbol usage against concept introduction order
 */
export function validateSymbols(
  concepts: Concept[],
  snippets: SnippetInfo[],
  chapterOrder: string[]
): SymbolValidationResult {
  const prematureUses: PrematureSymbolUse[] = [];
  const unexplainedSymbols: UnexplainedSymbol[] = [];
  const orphanedLinks: OrphanedLink[] = [];

  // Build lookups
  const chapterIndex = new Map<string, number>();
  for (let i = 0; i < chapterOrder.length; i++) {
    chapterIndex.set(chapterOrder[i], i);
  }

  const conceptMap = new Map<string, Concept>();
  for (const concept of concepts) {
    conceptMap.set(concept.id, concept);
  }

  // Build symbol -> concept map from relatedSymbols
  const symbolToConcept = new Map<string, Concept>();
  for (const concept of concepts) {
    for (const symbol of concept.relatedSymbols) {
      symbolToConcept.set(symbol, concept);
    }
  }

  // Collect all symbols used in code
  const symbolUsages = new Map<string, { snippetIds: Set<string>; chapterIds: Set<string> }>();
  for (const snippet of snippets) {
    for (const symbol of snippet.symbols) {
      let usage = symbolUsages.get(symbol);
      if (!usage) {
        usage = { snippetIds: new Set(), chapterIds: new Set() };
        symbolUsages.set(symbol, usage);
      }
      usage.snippetIds.add(snippet.id);
      usage.chapterIds.add(snippet.chapterId);
    }
  }

  // Check for premature uses and unexplained symbols
  for (const [symbol, usage] of symbolUsages) {
    const concept = symbolToConcept.get(symbol);

    if (!concept) {
      // Symbol has no explaining concept
      unexplainedSymbols.push({
        symbol,
        snippetIds: Array.from(usage.snippetIds),
        chapterIds: Array.from(usage.chapterIds),
      });
      continue;
    }

    if (!concept.introducedAt) {
      // Concept has no introduction chapter, can't validate order
      continue;
    }

    const conceptChapterPos = chapterIndex.get(concept.introducedAt);
    if (conceptChapterPos === undefined) {
      // Concept chapter not in order list
      continue;
    }

    // Check if any usage is before the concept is introduced
    for (const chapterId of usage.chapterIds) {
      const usageChapterPos = chapterIndex.get(chapterId);
      if (usageChapterPos === undefined) continue;

      if (usageChapterPos < conceptChapterPos) {
        prematureUses.push({
          symbol,
          conceptId: concept.id,
          conceptName: concept.name,
          usedInChapterId: chapterId,
          introducedInChapterId: concept.introducedAt,
        });
      }
    }
  }

  // Check for orphaned links (concepts claim symbols that don't appear in code)
  for (const concept of concepts) {
    for (const symbol of concept.relatedSymbols) {
      if (!symbolUsages.has(symbol)) {
        orphanedLinks.push({
          symbol,
          conceptId: concept.id,
          conceptName: concept.name,
        });
      }
    }
  }

  return {
    valid: prematureUses.length === 0 && unexplainedSymbols.length === 0,
    prematureUses,
    unexplainedSymbols,
    orphanedLinks,
  };
}

/**
 * Extract symbols from TypeScript/JavaScript code.
 *
 * This is a simple regex-based extractor for common patterns.
 * A full implementation would use a proper parser.
 */
export function extractSymbolsFromCode(code: string): string[] {
  const symbols = new Set<string>();

  // Function declarations: function name(...) or name(...) =>
  const funcPattern = /(?:function\s+|(?:const|let|var)\s+)(\w+)\s*(?:=\s*(?:async\s*)?\(|[<(])/g;
  let match;
  while ((match = funcPattern.exec(code)) !== null) {
    if (match[1]) symbols.add(match[1]);
  }

  // Class declarations: class Name
  const classPattern = /class\s+(\w+)/g;
  while ((match = classPattern.exec(code)) !== null) {
    if (match[1]) symbols.add(match[1]);
  }

  // Interface declarations: interface Name
  const interfacePattern = /interface\s+(\w+)/g;
  while ((match = interfacePattern.exec(code)) !== null) {
    if (match[1]) symbols.add(match[1]);
  }

  // Type declarations: type Name =
  const typePattern = /type\s+(\w+)\s*[<=]/g;
  while ((match = typePattern.exec(code)) !== null) {
    if (match[1]) symbols.add(match[1]);
  }

  // Enum declarations: enum Name
  const enumPattern = /enum\s+(\w+)/g;
  while ((match = enumPattern.exec(code)) !== null) {
    if (match[1]) symbols.add(match[1]);
  }

  // Method definitions in classes/objects: methodName(...) { or methodName: function
  const methodPattern = /(\w+)\s*\([^)]*\)\s*[:{]/g;
  while ((match = methodPattern.exec(code)) !== null) {
    const name = match[1];
    // Exclude common keywords
    if (name && !['if', 'for', 'while', 'switch', 'catch', 'function'].includes(name)) {
      symbols.add(name);
    }
  }

  return Array.from(symbols);
}

/**
 * Find potential concept matches for a symbol based on name similarity
 */
export function suggestConceptsForSymbol(
  symbol: string,
  concepts: Concept[]
): Array<{ concept: Concept; score: number }> {
  const results: Array<{ concept: Concept; score: number }> = [];
  const lowerSymbol = symbol.toLowerCase();

  for (const concept of concepts) {
    let score = 0;

    // Exact name match (case-insensitive)
    if (concept.name.toLowerCase() === lowerSymbol) {
      score = 100;
    }
    // Name contains symbol or vice versa
    else if (
      concept.name.toLowerCase().includes(lowerSymbol) ||
      lowerSymbol.includes(concept.name.toLowerCase())
    ) {
      score = 75;
    }
    // Definition mentions the symbol
    else if (concept.definition.toLowerCase().includes(lowerSymbol)) {
      score = 50;
    }

    if (score > 0) {
      results.push({ concept, score });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}
