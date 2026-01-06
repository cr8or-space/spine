/**
 * Entity Relationship Graph - Track relationships between entities.
 *
 * Provides graph operations for querying entity relationships:
 * - Find related entities
 * - Traverse relationships
 * - Check for relationship existence
 */

import type Database from 'libsql';

import { generateId, nowTimestamp, parseJson } from '../storage/repository';

/**
 * A relationship between two entities.
 */
export interface EntityRelationship {
  id: string;
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Database row for a relationship.
 */
interface RelationshipRow {
  id: string;
  project_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  metadata_json: string | null;
  created_at: string;
}

/**
 * Query options for finding relationships.
 */
export interface RelationshipQueryOptions {
  /** Filter by relationship type */
  type?: string;
  /** Direction of traversal */
  direction?: 'outgoing' | 'incoming' | 'both';
}

/**
 * Entity relationship graph operations.
 */
export interface EntityGraph {
  /**
   * Add a relationship between two entities.
   */
  addRelationship(
    projectId: string,
    sourceId: string,
    targetId: string,
    type: string,
    metadata?: Record<string, unknown>
  ): EntityRelationship;

  /**
   * Remove a relationship by ID.
   */
  removeRelationship(projectId: string, relationshipId: string): boolean;

  /**
   * Remove all relationships involving an entity.
   */
  removeEntityRelationships(projectId: string, entityId: string): number;

  /**
   * Find a specific relationship.
   */
  findRelationship(
    projectId: string,
    sourceId: string,
    targetId: string,
    type: string
  ): EntityRelationship | undefined;

  /**
   * Check if a relationship exists.
   */
  hasRelationship(
    projectId: string,
    sourceId: string,
    targetId: string,
    type?: string
  ): boolean;

  /**
   * Get all relationships for an entity.
   */
  getRelationships(
    projectId: string,
    entityId: string,
    options?: RelationshipQueryOptions
  ): EntityRelationship[];

  /**
   * Get related entity IDs.
   */
  getRelatedEntityIds(
    projectId: string,
    entityId: string,
    options?: RelationshipQueryOptions
  ): string[];

  /**
   * Get all relationships in a project.
   */
  getAllRelationships(projectId: string): EntityRelationship[];

  /**
   * Delete all relationships in a project.
   */
  deleteByProject(projectId: string): number;
}

/**
 * Create an entity relationship graph.
 *
 * @param db - Database connection
 */
export function createEntityGraph(db: Database.Database): EntityGraph {
  // Prepared statements
  const insertStmt = db.prepare(`
    INSERT INTO entity_relationships (
      id, project_id, source_entity_id, target_entity_id, relationship_type, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteByIdStmt = db.prepare(`
    DELETE FROM entity_relationships WHERE project_id = ? AND id = ?
  `);

  const deleteByEntityStmt = db.prepare(`
    DELETE FROM entity_relationships
    WHERE project_id = ? AND (source_entity_id = ? OR target_entity_id = ?)
  `);

  const findRelationshipStmt = db.prepare(`
    SELECT * FROM entity_relationships
    WHERE project_id = ? AND source_entity_id = ? AND target_entity_id = ? AND relationship_type = ?
  `);

  const hasRelationshipStmt = db.prepare(`
    SELECT 1 FROM entity_relationships
    WHERE project_id = ? AND source_entity_id = ? AND target_entity_id = ?
    LIMIT 1
  `);

  const hasTypedRelationshipStmt = db.prepare(`
    SELECT 1 FROM entity_relationships
    WHERE project_id = ? AND source_entity_id = ? AND target_entity_id = ? AND relationship_type = ?
    LIMIT 1
  `);

  const getOutgoingStmt = db.prepare(`
    SELECT * FROM entity_relationships WHERE project_id = ? AND source_entity_id = ?
  `);

  const getIncomingStmt = db.prepare(`
    SELECT * FROM entity_relationships WHERE project_id = ? AND target_entity_id = ?
  `);

  const getBothStmt = db.prepare(`
    SELECT * FROM entity_relationships
    WHERE project_id = ? AND (source_entity_id = ? OR target_entity_id = ?)
  `);

  const getAllStmt = db.prepare(`
    SELECT * FROM entity_relationships WHERE project_id = ?
  `);

  const deleteByProjectStmt = db.prepare(`
    DELETE FROM entity_relationships WHERE project_id = ?
  `);

  /**
   * Convert row to relationship.
   */
  function rowToRelationship(row: RelationshipRow): EntityRelationship {
    return {
      id: row.id,
      projectId: row.project_id,
      sourceEntityId: row.source_entity_id,
      targetEntityId: row.target_entity_id,
      relationshipType: row.relationship_type,
      metadata: parseJson<Record<string, unknown> | undefined>(row.metadata_json, undefined),
      createdAt: row.created_at,
    };
  }

  /**
   * Filter relationships by type.
   */
  function filterByType(relationships: EntityRelationship[], type?: string): EntityRelationship[] {
    if (!type) return relationships;
    return relationships.filter((r) => r.relationshipType === type);
  }

  return {
    addRelationship(
      projectId: string,
      sourceId: string,
      targetId: string,
      type: string,
      metadata?: Record<string, unknown>
    ): EntityRelationship {
      const id = generateId();
      const now = nowTimestamp();

      insertStmt.run(
        id,
        projectId,
        sourceId,
        targetId,
        type,
        metadata ? JSON.stringify(metadata) : null,
        now
      );

      return {
        id,
        projectId,
        sourceEntityId: sourceId,
        targetEntityId: targetId,
        relationshipType: type,
        metadata,
        createdAt: now,
      };
    },

    removeRelationship(projectId: string, relationshipId: string): boolean {
      const result = deleteByIdStmt.run(projectId, relationshipId);
      return result.changes > 0;
    },

    removeEntityRelationships(projectId: string, entityId: string): number {
      const result = deleteByEntityStmt.run(projectId, entityId, entityId);
      return result.changes;
    },

    findRelationship(
      projectId: string,
      sourceId: string,
      targetId: string,
      type: string
    ): EntityRelationship | undefined {
      const row = findRelationshipStmt.get(projectId, sourceId, targetId, type) as RelationshipRow | undefined;
      return row ? rowToRelationship(row) : undefined;
    },

    hasRelationship(
      projectId: string,
      sourceId: string,
      targetId: string,
      type?: string
    ): boolean {
      const row = type
        ? hasTypedRelationshipStmt.get(projectId, sourceId, targetId, type)
        : hasRelationshipStmt.get(projectId, sourceId, targetId);
      return row !== undefined;
    },

    getRelationships(
      projectId: string,
      entityId: string,
      options: RelationshipQueryOptions = {}
    ): EntityRelationship[] {
      const direction = options.direction ?? 'both';

      let rows: RelationshipRow[];
      switch (direction) {
        case 'outgoing':
          rows = getOutgoingStmt.all(projectId, entityId) as RelationshipRow[];
          break;
        case 'incoming':
          rows = getIncomingStmt.all(projectId, entityId) as RelationshipRow[];
          break;
        case 'both':
        default:
          rows = getBothStmt.all(projectId, entityId, entityId) as RelationshipRow[];
          break;
      }

      const relationships = rows.map(rowToRelationship);
      return filterByType(relationships, options.type);
    },

    getRelatedEntityIds(
      projectId: string,
      entityId: string,
      options: RelationshipQueryOptions = {}
    ): string[] {
      const relationships = this.getRelationships(projectId, entityId, options);
      const relatedIds = new Set<string>();

      for (const rel of relationships) {
        if (rel.sourceEntityId === entityId) {
          relatedIds.add(rel.targetEntityId);
        } else {
          relatedIds.add(rel.sourceEntityId);
        }
      }

      return Array.from(relatedIds);
    },

    getAllRelationships(projectId: string): EntityRelationship[] {
      const rows = getAllStmt.all(projectId) as RelationshipRow[];
      return rows.map(rowToRelationship);
    },

    deleteByProject(projectId: string): number {
      const result = deleteByProjectStmt.run(projectId);
      return result.changes;
    },
  };
}
