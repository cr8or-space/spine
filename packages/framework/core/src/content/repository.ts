/**
 * Content Repository - CRUD operations for content stored in SQLite.
 *
 * Provides generic content storage that works with any domain content type.
 * Content data is stored as JSON in the data_json column.
 */

import type Database from 'libsql';

import type { BaseContent, BaseContentStatus, Reference } from '@repo/framework-types';

import { generateId, nowTimestamp, parseJson } from '../storage/repository';

/**
 * Database row for content.
 */
interface ContentRow {
  id: string;
  project_id: string;
  spine_node_id: string;
  type: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

/**
 * Stored content with metadata.
 */
export interface StoredContent<T extends BaseContent = BaseContent> {
  content: T;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Query options for finding content.
 */
export interface ContentQueryOptions {
  /** Filter by content type */
  type?: string;
  /** Filter by status */
  status?: BaseContentStatus;
  /** Filter by spine node ID */
  spineNodeId?: string;
}

/**
 * Content repository for CRUD operations.
 */
export interface ContentRepository {
  /**
   * Find content by ID.
   */
  findById<T extends BaseContent>(projectId: string, id: string): StoredContent<T> | undefined;

  /**
   * Find content by spine node.
   */
  findBySpineNode<T extends BaseContent>(projectId: string, spineNodeId: string): StoredContent<T>[];

  /**
   * Find all content in a project.
   */
  findByProject<T extends BaseContent>(projectId: string, options?: ContentQueryOptions): StoredContent<T>[];

  /**
   * Create new content.
   */
  create<T extends BaseContent>(projectId: string, content: T): StoredContent<T>;

  /**
   * Update existing content.
   */
  update<T extends BaseContent>(
    projectId: string,
    id: string,
    updates: Partial<T>
  ): StoredContent<T> | undefined;

  /**
   * Update content status.
   */
  updateStatus(projectId: string, id: string, status: BaseContentStatus): boolean;

  /**
   * Delete content.
   */
  delete(projectId: string, id: string): boolean;

  /**
   * Delete all content for a spine node.
   */
  deleteBySpineNode(projectId: string, spineNodeId: string): number;

  /**
   * Delete all content for a project.
   */
  deleteByProject(projectId: string): number;
}

/**
 * Create a content repository.
 *
 * @param db - Database connection
 */
export function createContentRepository(db: Database.Database): ContentRepository {
  // Prepared statements
  const findByIdStmt = db.prepare(`
    SELECT * FROM content WHERE project_id = ? AND id = ?
  `);

  const findBySpineNodeStmt = db.prepare(`
    SELECT * FROM content WHERE project_id = ? AND spine_node_id = ?
  `);

  const findByProjectStmt = db.prepare(`
    SELECT * FROM content WHERE project_id = ?
  `);

  const findByProjectAndTypeStmt = db.prepare(`
    SELECT * FROM content WHERE project_id = ? AND type = ?
  `);

  const findByProjectAndStatusStmt = db.prepare(`
    SELECT * FROM content WHERE project_id = ? AND status = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO content (
      id, project_id, spine_node_id, type, status, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE content SET data_json = ?, updated_at = ? WHERE project_id = ? AND id = ?
  `);

  const updateStatusStmt = db.prepare(`
    UPDATE content SET status = ?, updated_at = ? WHERE project_id = ? AND id = ?
  `);

  const deleteStmt = db.prepare(`
    DELETE FROM content WHERE project_id = ? AND id = ?
  `);

  const deleteBySpineNodeStmt = db.prepare(`
    DELETE FROM content WHERE project_id = ? AND spine_node_id = ?
  `);

  const deleteByProjectStmt = db.prepare(`
    DELETE FROM content WHERE project_id = ?
  `);

  /**
   * Convert database row to stored content.
   */
  function rowToStoredContent<T extends BaseContent>(row: ContentRow): StoredContent<T> {
    const data = parseJson<Record<string, unknown>>(row.data_json, {});

    const content: BaseContent = {
      id: row.id,
      type: row.type,
      spineNode: row.spine_node_id,
      status: row.status as BaseContentStatus,
      references: (data.references as Reference[]) ?? [],
      ...data,
    };

    return {
      content: content as T,
      projectId: row.project_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Filter content by query options.
   */
  function filterContent<T extends BaseContent>(
    contents: StoredContent<T>[],
    options: ContentQueryOptions = {}
  ): StoredContent<T>[] {
    return contents.filter((stored) => {
      if (options.type && stored.content.type !== options.type) {
        return false;
      }
      if (options.status && stored.content.status !== options.status) {
        return false;
      }
      if (options.spineNodeId && stored.content.spineNode !== options.spineNodeId) {
        return false;
      }
      return true;
    });
  }

  return {
    findById<T extends BaseContent>(projectId: string, id: string): StoredContent<T> | undefined {
      const row = findByIdStmt.get(projectId, id) as ContentRow | undefined;
      return row ? rowToStoredContent<T>(row) : undefined;
    },

    findBySpineNode<T extends BaseContent>(projectId: string, spineNodeId: string): StoredContent<T>[] {
      const rows = findBySpineNodeStmt.all(projectId, spineNodeId) as ContentRow[];
      return rows.map((row) => rowToStoredContent<T>(row));
    },

    findByProject<T extends BaseContent>(projectId: string, options?: ContentQueryOptions): StoredContent<T>[] {
      let rows: ContentRow[];

      if (options?.type && !options.status) {
        rows = findByProjectAndTypeStmt.all(projectId, options.type) as ContentRow[];
      } else if (options?.status && !options.type) {
        rows = findByProjectAndStatusStmt.all(projectId, options.status) as ContentRow[];
      } else {
        rows = findByProjectStmt.all(projectId) as ContentRow[];
      }

      const contents = rows.map((row) => rowToStoredContent<T>(row));
      return filterContent(contents, options);
    },

    create<T extends BaseContent>(projectId: string, content: T): StoredContent<T> {
      const id = content.id || generateId();
      const now = nowTimestamp();

      // Store all data except the base fields in data_json
      const { id: _id, type: _type, spineNode: _spine, status: _status, ...data } = content;

      insertStmt.run(
        id,
        projectId,
        content.spineNode,
        content.type,
        content.status,
        JSON.stringify(data),
        now,
        now
      );

      return {
        content: { ...content, id } as T,
        projectId,
        createdAt: now,
        updatedAt: now,
      };
    },

    update<T extends BaseContent>(
      projectId: string,
      id: string,
      updates: Partial<T>
    ): StoredContent<T> | undefined {
      const existing = this.findById<T>(projectId, id);
      if (!existing) {
        return undefined;
      }

      // Merge updates
      const updatedContent = { ...existing.content, ...updates } as T;
      const now = nowTimestamp();

      // Store all data except the base fields
      const { id: _id, type: _type, spineNode: _spine, status: _status, ...data } = updatedContent;

      updateStmt.run(JSON.stringify(data), now, projectId, id);

      return {
        ...existing,
        content: updatedContent,
        updatedAt: now,
      };
    },

    updateStatus(projectId: string, id: string, status: BaseContentStatus): boolean {
      const now = nowTimestamp();
      const result = updateStatusStmt.run(status, now, projectId, id);
      return result.changes > 0;
    },

    delete(projectId: string, id: string): boolean {
      const result = deleteStmt.run(projectId, id);
      return result.changes > 0;
    },

    deleteBySpineNode(projectId: string, spineNodeId: string): number {
      const result = deleteBySpineNodeStmt.run(projectId, spineNodeId);
      return result.changes;
    },

    deleteByProject(projectId: string): number {
      const result = deleteByProjectStmt.run(projectId);
      return result.changes;
    },
  };
}
