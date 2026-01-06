/**
 * Checkpoint Management - Named validation points in the spine.
 *
 * Checkpoints mark positions where validation occurs and content is locked.
 * Used for:
 * - Release points in web serials
 * - Build checkpoints in techbooks
 * - Any milestone where content should be frozen
 */

import type Database from 'libsql';

import { generateId, nowTimestamp } from '../storage/repository';

/**
 * A checkpoint in the spine.
 */
export interface Checkpoint {
  id: string;
  projectId: string;
  name: string;
  spineNodeId: string;
  description?: string;
  locked: boolean;
  lockedAt?: string;
  createdAt: string;
}

/**
 * Database row for a checkpoint.
 */
interface CheckpointRow {
  id: string;
  project_id: string;
  name: string;
  spine_node_id: string;
  description: string | null;
  locked: number;
  locked_at: string | null;
  created_at: string;
}

/**
 * Checkpoint repository for CRUD operations.
 */
export interface CheckpointRepository {
  /**
   * Find a checkpoint by ID.
   */
  findById(projectId: string, id: string): Checkpoint | undefined;

  /**
   * Find a checkpoint by name.
   */
  findByName(projectId: string, name: string): Checkpoint | undefined;

  /**
   * Find all checkpoints for a project.
   */
  findByProject(projectId: string): Checkpoint[];

  /**
   * Find the checkpoint for a spine node.
   */
  findBySpineNode(projectId: string, spineNodeId: string): Checkpoint | undefined;

  /**
   * Create a new checkpoint.
   */
  create(
    projectId: string,
    data: { name: string; spineNodeId: string; description?: string }
  ): Checkpoint;

  /**
   * Update a checkpoint.
   */
  update(
    projectId: string,
    id: string,
    data: { name?: string; description?: string }
  ): Checkpoint | undefined;

  /**
   * Lock a checkpoint.
   */
  lock(projectId: string, id: string): boolean;

  /**
   * Unlock a checkpoint.
   */
  unlock(projectId: string, id: string): boolean;

  /**
   * Delete a checkpoint.
   */
  delete(projectId: string, id: string): boolean;

  /**
   * Delete all checkpoints for a project.
   */
  deleteByProject(projectId: string): number;
}

/**
 * Create a checkpoint repository.
 *
 * @param db - Database connection
 */
export function createCheckpointRepository(db: Database.Database): CheckpointRepository {
  // Prepared statements
  const findByIdStmt = db.prepare(`
    SELECT * FROM checkpoints WHERE project_id = ? AND id = ?
  `);

  const findByNameStmt = db.prepare(`
    SELECT * FROM checkpoints WHERE project_id = ? AND name = ?
  `);

  const findByProjectStmt = db.prepare(`
    SELECT * FROM checkpoints WHERE project_id = ?
    ORDER BY created_at
  `);

  const findBySpineNodeStmt = db.prepare(`
    SELECT * FROM checkpoints WHERE project_id = ? AND spine_node_id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO checkpoints (
      id, project_id, name, spine_node_id, description, locked, locked_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE checkpoints SET name = ?, description = ?
    WHERE project_id = ? AND id = ?
  `);

  const lockStmt = db.prepare(`
    UPDATE checkpoints SET locked = 1, locked_at = ?
    WHERE project_id = ? AND id = ?
  `);

  const unlockStmt = db.prepare(`
    UPDATE checkpoints SET locked = 0, locked_at = NULL
    WHERE project_id = ? AND id = ?
  `);

  const deleteStmt = db.prepare(`
    DELETE FROM checkpoints WHERE project_id = ? AND id = ?
  `);

  const deleteByProjectStmt = db.prepare(`
    DELETE FROM checkpoints WHERE project_id = ?
  `);

  /**
   * Convert row to checkpoint.
   */
  function rowToCheckpoint(row: CheckpointRow): Checkpoint {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      spineNodeId: row.spine_node_id,
      description: row.description ?? undefined,
      locked: row.locked === 1,
      lockedAt: row.locked_at ?? undefined,
      createdAt: row.created_at,
    };
  }

  return {
    findById(projectId: string, id: string): Checkpoint | undefined {
      const row = findByIdStmt.get(projectId, id) as CheckpointRow | undefined;
      return row ? rowToCheckpoint(row) : undefined;
    },

    findByName(projectId: string, name: string): Checkpoint | undefined {
      const row = findByNameStmt.get(projectId, name) as CheckpointRow | undefined;
      return row ? rowToCheckpoint(row) : undefined;
    },

    findByProject(projectId: string): Checkpoint[] {
      const rows = findByProjectStmt.all(projectId) as CheckpointRow[];
      return rows.map(rowToCheckpoint);
    },

    findBySpineNode(projectId: string, spineNodeId: string): Checkpoint | undefined {
      const row = findBySpineNodeStmt.get(projectId, spineNodeId) as CheckpointRow | undefined;
      return row ? rowToCheckpoint(row) : undefined;
    },

    create(
      projectId: string,
      data: { name: string; spineNodeId: string; description?: string }
    ): Checkpoint {
      // Check for duplicate name
      const existing = this.findByName(projectId, data.name);
      if (existing) {
        throw new Error(`Checkpoint with name '${data.name}' already exists`);
      }

      const id = generateId();
      const now = nowTimestamp();

      insertStmt.run(
        id,
        projectId,
        data.name,
        data.spineNodeId,
        data.description ?? null,
        0, // not locked
        null, // no locked_at
        now
      );

      return {
        id,
        projectId,
        name: data.name,
        spineNodeId: data.spineNodeId,
        description: data.description,
        locked: false,
        createdAt: now,
      };
    },

    update(
      projectId: string,
      id: string,
      data: { name?: string; description?: string }
    ): Checkpoint | undefined {
      const existing = this.findById(projectId, id);
      if (!existing) {
        return undefined;
      }

      if (existing.locked) {
        throw new Error('Cannot update a locked checkpoint');
      }

      const name = data.name ?? existing.name;
      const description = data.description ?? existing.description;

      // Check for duplicate name if changing
      if (data.name && data.name !== existing.name) {
        const duplicate = this.findByName(projectId, data.name);
        if (duplicate) {
          throw new Error(`Checkpoint with name '${data.name}' already exists`);
        }
      }

      updateStmt.run(name, description ?? null, projectId, id);

      return {
        ...existing,
        name,
        description,
      };
    },

    lock(projectId: string, id: string): boolean {
      const now = nowTimestamp();
      const result = lockStmt.run(now, projectId, id);
      return result.changes > 0;
    },

    unlock(projectId: string, id: string): boolean {
      const result = unlockStmt.run(projectId, id);
      return result.changes > 0;
    },

    delete(projectId: string, id: string): boolean {
      const existing = this.findById(projectId, id);
      if (existing?.locked) {
        throw new Error('Cannot delete a locked checkpoint');
      }

      const result = deleteStmt.run(projectId, id);
      return result.changes > 0;
    },

    deleteByProject(projectId: string): number {
      const result = deleteByProjectStmt.run(projectId);
      return result.changes;
    },
  };
}

/**
 * Get all spine nodes up to and including a checkpoint.
 */
export function getNodesBeforeCheckpoint<Node>(
  linearizedNodes: Node[],
  checkpointNodeId: string,
  getId: (node: Node) => string
): Node[] {
  const result: Node[] = [];
  for (const node of linearizedNodes) {
    result.push(node);
    if (getId(node) === checkpointNodeId) {
      break;
    }
  }
  return result;
}

/**
 * Check if a spine node is before or at a checkpoint.
 *
 * Returns true if nodeId appears at or before checkpointNodeId in the linearized list.
 * Returns false if nodeId appears after checkpointNodeId, or if either is not found.
 */
export function isBeforeOrAtCheckpoint<Node>(
  linearizedNodes: Node[],
  nodeId: string,
  checkpointNodeId: string,
  getId: (node: Node) => string
): boolean {
  for (const node of linearizedNodes) {
    const currentId = getId(node);
    if (currentId === nodeId) {
      // Found the node - it's before or at the checkpoint
      // (if nodeId === checkpointNodeId, this still correctly returns true)
      return true;
    }
    if (currentId === checkpointNodeId) {
      // Found checkpoint first without finding the node
      // Node must come after the checkpoint (or doesn't exist)
      return false;
    }
  }
  // Neither node nor checkpoint found in the list
  return false;
}
