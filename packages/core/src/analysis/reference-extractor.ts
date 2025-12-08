import type { Reference } from '@repo/types';

/**
 * Extracts entity references from content.
 *
 * Reference extractors scan content for mentions of entities (characters,
 * locations, factions, etc.) and return structured references with their
 * positions in the text.
 *
 * @typeParam Content - The type of content to extract references from
 *
 * @example
 * ```typescript
 * const extractor: ReferenceExtractor<string> = {
 *   extract(text) {
 *     // Find all character mentions
 *     const references: Reference[] = [];
 *     for (const character of characters) {
 *       let index = text.indexOf(character.name);
 *       while (index !== -1) {
 *         references.push({
 *           entityId: character.id,
 *           entityType: 'character',
 *           position: { start: index, end: index + character.name.length },
 *         });
 *         index = text.indexOf(character.name, index + 1);
 *       }
 *     }
 *     return references;
 *   },
 * };
 * ```
 */
export interface ReferenceExtractor<Content> {
  /**
   * Extract entity references from content.
   *
   * @param content - The content to scan for entity references
   * @returns Array of references found in the content
   */
  extract(content: Content): Reference[];
}

/**
 * Entity registry for looking up entity names and aliases.
 *
 * Used by reference extractors to find entities by their names.
 */
export interface EntityRegistry {
  /**
   * Get all entities of a specific type with their names and aliases.
   */
  getEntitiesByType(type: string): EntityInfo[];

  /**
   * Get all entity types registered in the system.
   */
  getEntityTypes(): string[];
}

/**
 * Basic entity info for reference extraction.
 */
export interface EntityInfo {
  /** Unique identifier */
  id: string;
  /** Entity type (character, location, faction, etc.) */
  type: string;
  /** Primary name */
  name: string;
  /** Alternative names/aliases */
  aliases: string[];
}

/**
 * Configuration for prose reference extraction.
 */
export interface ProseExtractorConfig {
  /**
   * Whether to use case-insensitive matching.
   * @default false
   */
  caseInsensitive?: boolean;

  /**
   * Whether to match whole words only (not substrings).
   * @default true
   */
  wholeWordOnly?: boolean;

  /**
   * Minimum name length to consider for matching.
   * Prevents matching very short names that might cause false positives.
   * @default 2
   */
  minNameLength?: number;

  /**
   * Entity types to extract. If empty, extracts all types.
   * @default []
   */
  entityTypes?: string[];
}

/**
 * Default configuration for prose extraction.
 */
export const DEFAULT_PROSE_EXTRACTOR_CONFIG: Required<ProseExtractorConfig> = {
  caseInsensitive: false,
  wholeWordOnly: true,
  minNameLength: 2,
  entityTypes: [],
};

/**
 * Reference extractor for prose content.
 *
 * Scans text content for mentions of registered entities and their aliases.
 */
export class ProseReferenceExtractor implements ReferenceExtractor<string> {
  private readonly config: Required<ProseExtractorConfig>;

  constructor(
    private readonly registry: EntityRegistry,
    config: ProseExtractorConfig = {}
  ) {
    this.config = { ...DEFAULT_PROSE_EXTRACTOR_CONFIG, ...config };
  }

  /**
   * Extract entity references from prose text.
   *
   * @param text - The prose text to scan
   * @returns Array of references found in the text
   */
  extract(text: string): Reference[] {
    const references: Reference[] = [];
    const entityTypes =
      this.config.entityTypes.length > 0
        ? this.config.entityTypes
        : this.registry.getEntityTypes();

    for (const type of entityTypes) {
      const entities = this.registry.getEntitiesByType(type);

      for (const entity of entities) {
        // Get all names to search for (primary + aliases)
        const names = [entity.name, ...entity.aliases].filter(
          (n) => n.length >= this.config.minNameLength
        );

        for (const name of names) {
          const matches = this.findMatches(text, name);
          for (const match of matches) {
            references.push({
              entityId: entity.id,
              entityType: type,
              position: match,
            });
          }
        }
      }
    }

    // Sort by position and remove overlapping references
    return this.deduplicateReferences(references);
  }

  /**
   * Find all occurrences of a name in text.
   */
  private findMatches(text: string, name: string): { start: number; end: number }[] {
    const matches: { start: number; end: number }[] = [];
    const searchText = this.config.caseInsensitive ? text.toLowerCase() : text;
    const searchName = this.config.caseInsensitive ? name.toLowerCase() : name;

    let index = searchText.indexOf(searchName);
    while (index !== -1) {
      const end = index + name.length;

      // Check for whole word match if configured
      if (this.config.wholeWordOnly) {
        const charBefore = index > 0 ? searchText[index - 1] : ' ';
        const charAfter = end < searchText.length ? searchText[end] : ' ';

        if (this.isWordBoundary(charBefore) && this.isWordBoundary(charAfter)) {
          matches.push({ start: index, end });
        }
      } else {
        matches.push({ start: index, end });
      }

      index = searchText.indexOf(searchName, index + 1);
    }

    return matches;
  }

  /**
   * Check if a character is a word boundary.
   */
  private isWordBoundary(char: string): boolean {
    return /[\s.,!?;:'"()[\]{}<>/\\-]/.test(char);
  }

  /**
   * Remove duplicate and overlapping references.
   * Keeps the longest match when references overlap.
   */
  private deduplicateReferences(references: Reference[]): Reference[] {
    if (references.length === 0) return [];

    // Sort by start position, then by length (descending)
    const sorted = [...references].sort((a, b) => {
      const startDiff = a.position.start - b.position.start;
      if (startDiff !== 0) return startDiff;
      return (
        b.position.end - b.position.start - (a.position.end - a.position.start)
      );
    });

    const result: Reference[] = [];
    let lastEnd = -1;

    for (const ref of sorted) {
      // Skip if this reference overlaps with the previous one
      if (ref.position.start < lastEnd) continue;

      result.push(ref);
      lastEnd = ref.position.end;
    }

    return result;
  }
}

/**
 * Composite reference extractor that combines multiple extractors.
 *
 * Useful when content has different sections that require different
 * extraction strategies.
 */
export class CompositeReferenceExtractor<Content>
  implements ReferenceExtractor<Content>
{
  constructor(private readonly extractors: ReferenceExtractor<Content>[]) {}

  /**
   * Extract references using all registered extractors.
   */
  extract(content: Content): Reference[] {
    const allReferences: Reference[] = [];

    for (const extractor of this.extractors) {
      const refs = extractor.extract(content);
      allReferences.push(...refs);
    }

    // Deduplicate by entityId + position
    return this.deduplicateReferences(allReferences);
  }

  /**
   * Remove duplicate references (same entity at same position).
   */
  private deduplicateReferences(references: Reference[]): Reference[] {
    const seen = new Set<string>();
    const result: Reference[] = [];

    for (const ref of references) {
      const key = `${ref.entityId}:${ref.position.start}:${ref.position.end}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ref);
      }
    }

    return result.sort((a, b) => a.position.start - b.position.start);
  }
}
