/**
 * Content Version Tracking - History and rollback support.
 *
 * Tracks changes to content over time, supporting:
 * - Version history
 * - Rollback to previous versions
 * - Source tracking (manual, generation, import)
 */

import type Database from 'libsql';

import { generateId, nowTimestamp, parseJson } from '../storage/repository';

/**
 * Source of a content version.
 */
export type ContentVersionSource = 'manual' | 'generation' | 'import' | 'rollback';

/**
 * A version of content.
 */
export interface ContentVersion {
  id: string;
  contentId: string;
  versionNumber: number;
  data: Record<string, unknown>;
  source: ContentVersionSource;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Database row for a content version.
 */
interface ContentVersionRow {
  id: string;
  content_id: string;
  version_number: number;
  data_json: string;
  source: string;
  metadata_json: string | null;
  created_at: string;
}

/**
 * Content version repository.
 */
export interface ContentVersionRepository {
  /**
   * Get all versions for content, ordered by version number descending.
   */
  getVersions(contentId: string): ContentVersion[];

  /**
   * Get a specific version by number.
   */
  getVersion(contentId: string, versionNumber: number): ContentVersion | undefined;

  /**
   * Get the latest version number for content.
   */
  getLatestVersionNumber(contentId: string): number;

  /**
   * Save a new version.
   */
  saveVersion(
    contentId: string,
    data: Record<string, unknown>,
    source: ContentVersionSource,
    metadata?: Record<string, unknown>
  ): ContentVersion;

  /**
   * Delete all versions for content.
   */
  deleteByContent(contentId: string): number;

  /**
   * Delete versions older than a given version number.
   * Returns the number of versions deleted.
   */
  deleteOldVersions(contentId: string, keepCount: number): number;
}

/**
 * Create a content version repository.
 *
 * @param db - Database connection
 */
export function createContentVersionRepository(db: Database.Database): ContentVersionRepository {
  // Prepared statements
  const getVersionsStmt = db.prepare(`
    SELECT * FROM content_versions
    WHERE content_id = ?
    ORDER BY version_number DESC
  `);

  const getVersionStmt = db.prepare(`
    SELECT * FROM content_versions
    WHERE content_id = ? AND version_number = ?
  `);

  const getLatestVersionStmt = db.prepare(`
    SELECT MAX(version_number) as latest FROM content_versions WHERE content_id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO content_versions (
      id, content_id, version_number, data_json, source, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteByContentStmt = db.prepare(`
    DELETE FROM content_versions WHERE content_id = ?
  `);

  const deleteOldVersionsStmt = db.prepare(`
    DELETE FROM content_versions
    WHERE content_id = ? AND version_number < (
      SELECT MIN(version_number) FROM (
        SELECT version_number FROM content_versions
        WHERE content_id = ?
        ORDER BY version_number DESC
        LIMIT ?
      )
    )
  `);

  /**
   * Convert row to version.
   */
  function rowToVersion(row: ContentVersionRow): ContentVersion {
    return {
      id: row.id,
      contentId: row.content_id,
      versionNumber: row.version_number,
      data: parseJson<Record<string, unknown>>(row.data_json, {}),
      source: row.source as ContentVersionSource,
      metadata: parseJson<Record<string, unknown> | undefined>(row.metadata_json, undefined),
      createdAt: row.created_at,
    };
  }

  return {
    getVersions(contentId: string): ContentVersion[] {
      const rows = getVersionsStmt.all(contentId) as ContentVersionRow[];
      return rows.map(rowToVersion);
    },

    getVersion(contentId: string, versionNumber: number): ContentVersion | undefined {
      const row = getVersionStmt.get(contentId, versionNumber) as ContentVersionRow | undefined;
      return row ? rowToVersion(row) : undefined;
    },

    getLatestVersionNumber(contentId: string): number {
      const result = getLatestVersionStmt.get(contentId) as { latest: number | null } | undefined;
      return result?.latest ?? 0;
    },

    saveVersion(
      contentId: string,
      data: Record<string, unknown>,
      source: ContentVersionSource,
      metadata?: Record<string, unknown>
    ): ContentVersion {
      const id = generateId();
      const versionNumber = this.getLatestVersionNumber(contentId) + 1;
      const now = nowTimestamp();

      insertStmt.run(
        id,
        contentId,
        versionNumber,
        JSON.stringify(data),
        source,
        metadata ? JSON.stringify(metadata) : null,
        now
      );

      return {
        id,
        contentId,
        versionNumber,
        data,
        source,
        metadata,
        createdAt: now,
      };
    },

    deleteByContent(contentId: string): number {
      const result = deleteByContentStmt.run(contentId);
      return result.changes;
    },

    deleteOldVersions(contentId: string, keepCount: number): number {
      if (keepCount < 1) {
        throw new Error('keepCount must be at least 1');
      }
      const result = deleteOldVersionsStmt.run(contentId, contentId, keepCount);
      return result.changes;
    },
  };
}

/**
 * Content rollback helper.
 */
export interface ContentRollback {
  /**
   * Rollback content to a specific version.
   * Returns the new version created from the rollback.
   */
  rollback(contentId: string, targetVersion: number): ContentVersion | undefined;
}

/**
 * Create a content rollback helper.
 */
export function createContentRollback(
  versionRepo: ContentVersionRepository,
  applyVersion: (contentId: string, data: Record<string, unknown>) => boolean
): ContentRollback {
  return {
    rollback(contentId: string, targetVersion: number): ContentVersion | undefined {
      // Get the target version
      const target = versionRepo.getVersion(contentId, targetVersion);
      if (!target) {
        return undefined;
      }

      // Apply the version data
      const applied = applyVersion(contentId, target.data);
      if (!applied) {
        return undefined;
      }

      // Save as a new version with rollback source
      return versionRepo.saveVersion(contentId, target.data, 'rollback', {
        rolledBackFrom: targetVersion,
      });
    },
  };
}
