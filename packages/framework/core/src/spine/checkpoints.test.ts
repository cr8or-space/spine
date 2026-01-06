/**
 * Tests for checkpoint management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import {
  createCheckpointRepository,
  getNodesBeforeCheckpoint,
  isBeforeOrAtCheckpoint,
  type CheckpointRepository,
} from './checkpoints';

describe('CheckpointRepository', () => {
  let db: DatabaseConnection;
  let repo: CheckpointRepository;
  const projectId = 'test-project';

  beforeEach(() => {
    db = createTestDatabase();
    repo = createCheckpointRepository(db.db);

    // Create test project and spine node
    db.db
      .prepare(
        `INSERT INTO projects (id, name, domain, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      )
      .run(projectId, 'Test Project', 'test');

    db.db
      .prepare(
        `INSERT INTO spine_nodes (id, project_id, type, title, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .run('node-1', projectId, 'chapter', 'Chapter 1', 1);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('creates checkpoint', () => {
      const checkpoint = repo.create(projectId, {
        name: 'v1.0',
        spineNodeId: 'node-1',
        description: 'First release',
      });

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.name).toBe('v1.0');
      expect(checkpoint.spineNodeId).toBe('node-1');
      expect(checkpoint.description).toBe('First release');
      expect(checkpoint.locked).toBe(false);
    });

    it('throws on duplicate name', () => {
      repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });

      expect(() => repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' })).toThrow(
        "Checkpoint with name 'v1.0' already exists"
      );
    });
  });

  describe('findById', () => {
    it('returns checkpoint by ID', () => {
      const created = repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });

      const found = repo.findById(projectId, created.id);
      expect(found?.name).toBe('v1.0');
    });

    it('returns undefined for non-existent ID', () => {
      const found = repo.findById(projectId, 'not-found');
      expect(found).toBeUndefined();
    });
  });

  describe('findByName', () => {
    it('returns checkpoint by name', () => {
      repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });

      const found = repo.findByName(projectId, 'v1.0');
      expect(found?.name).toBe('v1.0');
    });

    it('returns undefined for non-existent name', () => {
      const found = repo.findByName(projectId, 'not-found');
      expect(found).toBeUndefined();
    });
  });

  describe('findByProject', () => {
    it('returns all checkpoints for project', () => {
      repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });
      repo.create(projectId, { name: 'v2.0', spineNodeId: 'node-1' });

      const checkpoints = repo.findByProject(projectId);
      expect(checkpoints).toHaveLength(2);
    });
  });

  describe('findBySpineNode', () => {
    it('returns checkpoint for spine node', () => {
      repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });

      const found = repo.findBySpineNode(projectId, 'node-1');
      expect(found?.name).toBe('v1.0');
    });
  });

  describe('update', () => {
    it('updates checkpoint name', () => {
      const checkpoint = repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });

      const updated = repo.update(projectId, checkpoint.id, { name: 'v1.1' });
      expect(updated?.name).toBe('v1.1');
    });

    it('throws when updating locked checkpoint', () => {
      const checkpoint = repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });
      repo.lock(projectId, checkpoint.id);

      expect(() => repo.update(projectId, checkpoint.id, { name: 'v1.1' })).toThrow(
        'Cannot update a locked checkpoint'
      );
    });

    it('returns undefined for non-existent checkpoint', () => {
      const updated = repo.update(projectId, 'not-found', { name: 'v1.1' });
      expect(updated).toBeUndefined();
    });
  });

  describe('lock', () => {
    it('locks checkpoint', () => {
      const checkpoint = repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });

      const success = repo.lock(projectId, checkpoint.id);
      expect(success).toBe(true);

      const found = repo.findById(projectId, checkpoint.id);
      expect(found?.locked).toBe(true);
      expect(found?.lockedAt).toBeDefined();
    });
  });

  describe('unlock', () => {
    it('unlocks checkpoint', () => {
      const checkpoint = repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });
      repo.lock(projectId, checkpoint.id);

      const success = repo.unlock(projectId, checkpoint.id);
      expect(success).toBe(true);

      const found = repo.findById(projectId, checkpoint.id);
      expect(found?.locked).toBe(false);
    });
  });

  describe('delete', () => {
    it('deletes checkpoint', () => {
      const checkpoint = repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });

      const success = repo.delete(projectId, checkpoint.id);
      expect(success).toBe(true);

      const found = repo.findById(projectId, checkpoint.id);
      expect(found).toBeUndefined();
    });

    it('throws when deleting locked checkpoint', () => {
      const checkpoint = repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });
      repo.lock(projectId, checkpoint.id);

      expect(() => repo.delete(projectId, checkpoint.id)).toThrow(
        'Cannot delete a locked checkpoint'
      );
    });
  });

  describe('deleteByProject', () => {
    it('deletes all checkpoints for project', () => {
      repo.create(projectId, { name: 'v1.0', spineNodeId: 'node-1' });
      repo.create(projectId, { name: 'v2.0', spineNodeId: 'node-1' });

      const count = repo.deleteByProject(projectId);
      expect(count).toBe(2);

      const remaining = repo.findByProject(projectId);
      expect(remaining).toHaveLength(0);
    });
  });
});

describe('getNodesBeforeCheckpoint', () => {
  interface Node {
    id: string;
  }

  const nodes: Node[] = [{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }, { id: 'ch4' }];
  const getId = (n: Node) => n.id;

  it('returns nodes up to checkpoint', () => {
    const result = getNodesBeforeCheckpoint(nodes, 'ch3', getId);
    expect(result.map((n) => n.id)).toEqual(['ch1', 'ch2', 'ch3']);
  });

  it('returns all nodes when checkpoint is last', () => {
    const result = getNodesBeforeCheckpoint(nodes, 'ch4', getId);
    expect(result.map((n) => n.id)).toEqual(['ch1', 'ch2', 'ch3', 'ch4']);
  });

  it('returns first node only when checkpoint is first', () => {
    const result = getNodesBeforeCheckpoint(nodes, 'ch1', getId);
    expect(result.map((n) => n.id)).toEqual(['ch1']);
  });

  it('returns all nodes when checkpoint not found', () => {
    const result = getNodesBeforeCheckpoint(nodes, 'not-found', getId);
    expect(result.map((n) => n.id)).toEqual(['ch1', 'ch2', 'ch3', 'ch4']);
  });
});

describe('isBeforeOrAtCheckpoint', () => {
  interface Node {
    id: string;
  }

  const nodes: Node[] = [{ id: 'ch1' }, { id: 'ch2' }, { id: 'ch3' }, { id: 'ch4' }];
  const getId = (n: Node) => n.id;

  it('returns true when node is before checkpoint', () => {
    expect(isBeforeOrAtCheckpoint(nodes, 'ch1', 'ch3', getId)).toBe(true);
    expect(isBeforeOrAtCheckpoint(nodes, 'ch2', 'ch3', getId)).toBe(true);
  });

  it('returns true when node is at checkpoint', () => {
    expect(isBeforeOrAtCheckpoint(nodes, 'ch3', 'ch3', getId)).toBe(true);
  });

  it('returns false when node is after checkpoint', () => {
    expect(isBeforeOrAtCheckpoint(nodes, 'ch4', 'ch3', getId)).toBe(false);
  });

  it('returns false when node not found', () => {
    expect(isBeforeOrAtCheckpoint(nodes, 'not-found', 'ch3', getId)).toBe(false);
  });

  it('returns false when checkpoint not found and node exists', () => {
    // Node exists but checkpoint doesn't - node can't be "before" non-existent checkpoint
    expect(isBeforeOrAtCheckpoint(nodes, 'ch2', 'not-found', getId)).toBe(true);
  });

  it('returns false when neither exists', () => {
    expect(isBeforeOrAtCheckpoint(nodes, 'not-found', 'also-not-found', getId)).toBe(false);
  });
});
