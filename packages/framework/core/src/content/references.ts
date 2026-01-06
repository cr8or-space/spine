/**
 * Content Reference Management - Entity reference extraction and indexing.
 *
 * References track where entities are mentioned in content:
 * - Character appearances
 * - Location mentions
 * - Concept usage (for techbooks)
 */

import type Database from 'libsql';

import type { Reference } from '@repo/framework-types';

import { generateId, nowTimestamp } from '../storage/repository';

/**
 * Database row for a content reference.
 */
interface ReferenceRow {
  id: string;
  content_id: string;
  entity_id: string;
  entity_type: string;
  position_start: number;
  position_end: number;
  created_at: string;
}

/**
 * Stored reference with metadata.
 */
export interface StoredReference extends Reference {
  id: string;
  contentId: string;
  createdAt: string;
}

/**
 * Reference extractor interface.
 * Domains implement this to extract references from their content.
 */
export interface ReferenceExtractor {
  /**
   * Extract references from content text.
   *
   * @param text - The content text to analyze
   * @param entities - Available entities to match against
   * @returns Array of extracted references
   */
  extract(
    text: string,
    entities: Array<{ id: string; type: string; name: string }>
  ): Reference[];
}

/**
 * Content reference repository.
 */
export interface ContentReferenceRepository {
  /**
   * Get all references for content.
   */
  getByContent(contentId: string): StoredReference[];

  /**
   * Get all references to an entity.
   */
  getByEntity(entityId: string): StoredReference[];

  /**
   * Add a reference.
   */
  add(contentId: string, reference: Reference): StoredReference;

  /**
   * Replace all references for content.
   * Used when re-extracting references after content update.
   */
  replaceForContent(contentId: string, references: Reference[]): StoredReference[];

  /**
   * Delete all references for content.
   */
  deleteByContent(contentId: string): number;

  /**
   * Delete all references to an entity.
   */
  deleteByEntity(entityId: string): number;
}

/**
 * Create a content reference repository.
 *
 * @param db - Database connection
 */
export function createContentReferenceRepository(db: Database.Database): ContentReferenceRepository {
  // Prepared statements
  const getByContentStmt = db.prepare(`
    SELECT * FROM content_references WHERE content_id = ?
    ORDER BY position_start
  `);

  const getByEntityStmt = db.prepare(`
    SELECT * FROM content_references WHERE entity_id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO content_references (
      id, content_id, entity_id, entity_type, position_start, position_end, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteByContentStmt = db.prepare(`
    DELETE FROM content_references WHERE content_id = ?
  `);

  const deleteByEntityStmt = db.prepare(`
    DELETE FROM content_references WHERE entity_id = ?
  `);

  /**
   * Convert row to stored reference.
   */
  function rowToReference(row: ReferenceRow): StoredReference {
    return {
      id: row.id,
      contentId: row.content_id,
      entityId: row.entity_id,
      entityType: row.entity_type,
      position: {
        start: row.position_start,
        end: row.position_end,
      },
      createdAt: row.created_at,
    };
  }

  return {
    getByContent(contentId: string): StoredReference[] {
      const rows = getByContentStmt.all(contentId) as ReferenceRow[];
      return rows.map(rowToReference);
    },

    getByEntity(entityId: string): StoredReference[] {
      const rows = getByEntityStmt.all(entityId) as ReferenceRow[];
      return rows.map(rowToReference);
    },

    add(contentId: string, reference: Reference): StoredReference {
      const id = generateId();
      const now = nowTimestamp();

      insertStmt.run(
        id,
        contentId,
        reference.entityId,
        reference.entityType,
        reference.position.start,
        reference.position.end,
        now
      );

      return {
        id,
        contentId,
        ...reference,
        createdAt: now,
      };
    },

    replaceForContent(contentId: string, references: Reference[]): StoredReference[] {
      // Delete existing references
      deleteByContentStmt.run(contentId);

      // Add new references
      const stored: StoredReference[] = [];
      const now = nowTimestamp();

      for (const ref of references) {
        const id = generateId();
        insertStmt.run(
          id,
          contentId,
          ref.entityId,
          ref.entityType,
          ref.position.start,
          ref.position.end,
          now
        );
        stored.push({
          id,
          contentId,
          ...ref,
          createdAt: now,
        });
      }

      return stored;
    },

    deleteByContent(contentId: string): number {
      const result = deleteByContentStmt.run(contentId);
      return result.changes;
    },

    deleteByEntity(entityId: string): number {
      const result = deleteByEntityStmt.run(entityId);
      return result.changes;
    },
  };
}

/**
 * Create a simple name-based reference extractor.
 *
 * This basic extractor finds entity names in text using case-insensitive matching.
 * Domains may want to implement more sophisticated extractors using NLP or LLM.
 */
export function createSimpleReferenceExtractor(): ReferenceExtractor {
  return {
    extract(
      text: string,
      entities: Array<{ id: string; type: string; name: string }>
    ): Reference[] {
      const references: Reference[] = [];
      const textLower = text.toLowerCase();

      for (const entity of entities) {
        const nameLower = entity.name.toLowerCase();
        let searchStart = 0;

        while (true) {
          const index = textLower.indexOf(nameLower, searchStart);
          if (index === -1) break;

          // Check word boundaries
          const before = index === 0 || !isWordChar(text[index - 1]);
          const after =
            index + entity.name.length >= text.length ||
            !isWordChar(text[index + entity.name.length]);

          if (before && after) {
            references.push({
              entityId: entity.id,
              entityType: entity.type,
              position: {
                start: index,
                end: index + entity.name.length,
              },
            });
          }

          searchStart = index + 1;
        }
      }

      // Sort by position and remove overlapping references (keep longest)
      return dedupeOverlappingReferences(references);
    },
  };
}

/**
 * Check if character is a word character.
 */
function isWordChar(char: string | undefined): boolean {
  if (!char) return false;
  return /\w/.test(char);
}

/**
 * Remove overlapping references, keeping the longest match.
 */
function dedupeOverlappingReferences(references: Reference[]): Reference[] {
  if (references.length < 2) return references;

  // Sort by start position
  const sorted = [...references].sort((a, b) => a.position.start - b.position.start);
  const result: Reference[] = [];

  for (const ref of sorted) {
    // Check if this reference overlaps with the last added
    if (result.length === 0) {
      result.push(ref);
      continue;
    }

    const last = result[result.length - 1];
    if (ref.position.start < last.position.end) {
      // Overlapping - keep the longer one
      const lastLength = last.position.end - last.position.start;
      const refLength = ref.position.end - ref.position.start;
      if (refLength > lastLength) {
        result[result.length - 1] = ref;
      }
    } else {
      result.push(ref);
    }
  }

  return result;
}
