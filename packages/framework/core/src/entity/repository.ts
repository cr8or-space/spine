/**
 * Entity Repository - CRUD operations for entities stored in SQLite.
 *
 * Provides generic entity storage that works with any domain entity type.
 * Entity data is stored as JSON in the data_json column.
 */

import type Database from 'libsql';

import type { BaseEntity, SpinePosition, EntityLifecycle, EntityRegistry } from '@repo/framework-types';

import { generateId, nowTimestamp, parseJson } from '../storage/repository';

/**
 * Database row for an entity.
 */
interface EntityRow {
  id: string;
  project_id: string;
  type: string;
  data_json: string;
  introduced_at_node: string | null;
  introduced_at_order: number | null;
  retired_at_node: string | null;
  retired_at_order: number | null;
  lifecycle: string;
  created_at: string;
  updated_at: string;
}

/**
 * Stored entity with metadata.
 */
export interface StoredEntity<T extends BaseEntity = BaseEntity> {
  entity: T;
  projectId: string;
  lifecycle: EntityLifecycle;
  createdAt: string;
  updatedAt: string;
}

/**
 * Query options for finding entities.
 */
export interface EntityQueryOptions {
  /** Filter by entity type */
  type?: string;
  /** Filter by lifecycle state */
  lifecycle?: EntityLifecycle;
  /** Include retired entities (default: false) */
  includeRetired?: boolean;
  /** Include archived entities (default: false) */
  includeArchived?: boolean;
}

/**
 * Entity repository for CRUD operations.
 */
export interface EntityRepository {
  /**
   * Find an entity by ID.
   */
  findById<T extends BaseEntity>(projectId: string, id: string): StoredEntity<T> | undefined;

  /**
   * Find all entities in a project.
   */
  findByProject<T extends BaseEntity>(projectId: string, options?: EntityQueryOptions): StoredEntity<T>[];

  /**
   * Find entities by type.
   */
  findByType<T extends BaseEntity>(projectId: string, type: string): StoredEntity<T>[];

  /**
   * Create a new entity.
   */
  create<T extends BaseEntity>(projectId: string, entity: T): StoredEntity<T>;

  /**
   * Update an existing entity.
   */
  update<T extends BaseEntity>(projectId: string, id: string, updates: Partial<T>): StoredEntity<T> | undefined;

  /**
   * Update entity lifecycle.
   */
  updateLifecycle(
    projectId: string,
    id: string,
    lifecycle: EntityLifecycle,
    position?: SpinePosition
  ): boolean;

  /**
   * Delete an entity.
   */
  delete(projectId: string, id: string): boolean;

  /**
   * Delete all entities for a project.
   */
  deleteByProject(projectId: string): number;
}

/**
 * Create an entity repository.
 *
 * @param db - Database connection
 * @param registry - Entity registry for validation
 */
export function createEntityRepository(db: Database.Database, registry?: EntityRegistry): EntityRepository {
  // Prepared statements
  const findByIdStmt = db.prepare(`
    SELECT * FROM entities WHERE project_id = ? AND id = ?
  `);

  const findByProjectStmt = db.prepare(`
    SELECT * FROM entities WHERE project_id = ?
  `);

  const findByProjectAndTypeStmt = db.prepare(`
    SELECT * FROM entities WHERE project_id = ? AND type = ?
  `);

  const findActiveByProjectStmt = db.prepare(`
    SELECT * FROM entities WHERE project_id = ? AND lifecycle = 'active'
  `);

  const insertStmt = db.prepare(`
    INSERT INTO entities (
      id, project_id, type, data_json,
      introduced_at_node, introduced_at_order,
      retired_at_node, retired_at_order,
      lifecycle, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE entities SET data_json = ?, updated_at = ? WHERE project_id = ? AND id = ?
  `);

  const updateLifecycleStmt = db.prepare(`
    UPDATE entities SET
      lifecycle = ?,
      retired_at_node = ?,
      retired_at_order = ?,
      updated_at = ?
    WHERE project_id = ? AND id = ?
  `);

  const deleteStmt = db.prepare(`
    DELETE FROM entities WHERE project_id = ? AND id = ?
  `);

  const deleteByProjectStmt = db.prepare(`
    DELETE FROM entities WHERE project_id = ?
  `);

  /**
   * Convert database row to stored entity.
   */
  function rowToStoredEntity<T extends BaseEntity>(row: EntityRow): StoredEntity<T> {
    const data = parseJson<Record<string, unknown>>(row.data_json, {});

    // Reconstruct the entity with spine positions
    const entity: BaseEntity = {
      id: row.id,
      type: row.type,
      ...data,
    };

    if (row.introduced_at_node !== null) {
      entity.introducedAt = {
        nodeId: row.introduced_at_node,
        order: row.introduced_at_order ?? 0,
      };
    }

    if (row.retired_at_node !== null) {
      entity.retiredAt = {
        nodeId: row.retired_at_node,
        order: row.retired_at_order ?? 0,
      };
    }

    return {
      entity: entity as T,
      projectId: row.project_id,
      lifecycle: row.lifecycle as EntityLifecycle,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Filter entities by query options.
   */
  function filterEntities<T extends BaseEntity>(
    entities: StoredEntity<T>[],
    options: EntityQueryOptions = {}
  ): StoredEntity<T>[] {
    return entities.filter((stored) => {
      if (options.type && stored.entity.type !== options.type) {
        return false;
      }
      if (options.lifecycle && stored.lifecycle !== options.lifecycle) {
        return false;
      }
      if (!options.includeRetired && stored.lifecycle === 'retired') {
        return false;
      }
      if (!options.includeArchived && stored.lifecycle === 'archived') {
        return false;
      }
      return true;
    });
  }

  return {
    findById<T extends BaseEntity>(projectId: string, id: string): StoredEntity<T> | undefined {
      const row = findByIdStmt.get(projectId, id) as EntityRow | undefined;
      return row ? rowToStoredEntity<T>(row) : undefined;
    },

    findByProject<T extends BaseEntity>(projectId: string, options?: EntityQueryOptions): StoredEntity<T>[] {
      const rows = (
        options?.lifecycle === 'active'
          ? findActiveByProjectStmt.all(projectId)
          : findByProjectStmt.all(projectId)
      ) as EntityRow[];

      const entities = rows.map((row) => rowToStoredEntity<T>(row));
      return filterEntities(entities, options);
    },

    findByType<T extends BaseEntity>(projectId: string, type: string): StoredEntity<T>[] {
      const rows = findByProjectAndTypeStmt.all(projectId, type) as EntityRow[];
      return rows.map((row) => rowToStoredEntity<T>(row));
    },

    create<T extends BaseEntity>(projectId: string, entity: T): StoredEntity<T> {
      // Validate if registry is available
      if (registry) {
        const errors = registry.validate(entity);
        if (errors.length > 0) {
          throw new Error(`Invalid entity: ${errors.join(', ')}`);
        }
      }

      const id = entity.id || generateId();
      const now = nowTimestamp();

      // Extract spine positions
      const introducedAt = entity.introducedAt;
      const retiredAt = entity.retiredAt;

      // Store everything except id, type, and spine positions in data_json
      const { id: _id, type: _type, introducedAt: _intro, retiredAt: _retired, ...data } = entity;

      insertStmt.run(
        id,
        projectId,
        entity.type,
        JSON.stringify(data),
        introducedAt?.nodeId ?? null,
        introducedAt?.order ?? null,
        retiredAt?.nodeId ?? null,
        retiredAt?.order ?? null,
        'active',
        now,
        now
      );

      return {
        entity: { ...entity, id } as T,
        projectId,
        lifecycle: 'active',
        createdAt: now,
        updatedAt: now,
      };
    },

    update<T extends BaseEntity>(projectId: string, id: string, updates: Partial<T>): StoredEntity<T> | undefined {
      const existing = this.findById<T>(projectId, id);
      if (!existing) {
        return undefined;
      }

      // Merge updates
      const updatedEntity = { ...existing.entity, ...updates } as T;

      // Validate if registry is available
      if (registry) {
        const errors = registry.validate(updatedEntity);
        if (errors.length > 0) {
          throw new Error(`Invalid entity update: ${errors.join(', ')}`);
        }
      }

      const now = nowTimestamp();

      // Extract non-stored fields
      const { id: _id, type: _type, introducedAt: _intro, retiredAt: _retired, ...data } = updatedEntity;

      updateStmt.run(JSON.stringify(data), now, projectId, id);

      return {
        ...existing,
        entity: updatedEntity,
        updatedAt: now,
      };
    },

    updateLifecycle(
      projectId: string,
      id: string,
      lifecycle: EntityLifecycle,
      position?: SpinePosition
    ): boolean {
      const now = nowTimestamp();
      const result = updateLifecycleStmt.run(
        lifecycle,
        lifecycle === 'retired' ? (position?.nodeId ?? null) : null,
        lifecycle === 'retired' ? (position?.order ?? null) : null,
        now,
        projectId,
        id
      );
      return result.changes > 0;
    },

    delete(projectId: string, id: string): boolean {
      const result = deleteStmt.run(projectId, id);
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = deleteByProjectStmt.run(projectId);
      return result.changes;
    },
  };
}
