/**
 * Tests for checkpoint manager
 */

import { describe, expect, it, beforeEach } from 'vitest';

import type { CompileResult, TestResult } from '@repo/techbook-types';

import {
  createCheckpointManager,
  canTransition,
  getValidNextStatuses,
  isTerminalStatus,
  type CheckpointManager,
  type CreateCheckpointData,
} from './manager';

describe('CheckpointManager', () => {
  let manager: CheckpointManager;

  beforeEach(() => {
    manager = createCheckpointManager();
  });

  const createTestCheckpoint = (
    overrides: Partial<CreateCheckpointData> = {}
  ): CreateCheckpointData => ({
    name: 'test-checkpoint',
    chapterId: 'chapter-1',
    ...overrides,
  });

  const createSuccessfulCompileResult = (): CompileResult => ({
    success: true,
    output: 'Compilation successful',
    errors: [],
  });

  const createSuccessfulTestResult = (): TestResult => ({
    success: true,
    passed: 10,
    failed: 0,
    skipped: 0,
    output: 'All tests passed',
    failures: [],
  });

  describe('CRUD operations', () => {
    it('should create a checkpoint', () => {
      const checkpoint = manager.create(
        createTestCheckpoint({
          name: 'chapter-03-complete',
          chapterId: 'ch03',
          description: 'After implementing the lexer',
        })
      );

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.name).toBe('chapter-03-complete');
      expect(checkpoint.chapterId).toBe('ch03');
      expect(checkpoint.description).toBe('After implementing the lexer');
      expect(checkpoint.entityType).toBe('checkpoint');
      expect(checkpoint.status).toBe('pending');
      expect(checkpoint.createdAt).toBeDefined();
      expect(checkpoint.updatedAt).toBeDefined();
    });

    it('should create a checkpoint with default description', () => {
      const checkpoint = manager.create(createTestCheckpoint());
      expect(checkpoint.description).toBe('');
    });

    it('should retrieve a checkpoint by ID', () => {
      const created = manager.create(createTestCheckpoint({ name: 'find-me' }));
      const retrieved = manager.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('find-me');
    });

    it('should retrieve a checkpoint by name', () => {
      manager.create(createTestCheckpoint({ name: 'unique-name' }));
      const retrieved = manager.getByName('unique-name');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('unique-name');
    });

    it('should return undefined for non-existent checkpoint', () => {
      expect(manager.get('non-existent')).toBeUndefined();
      expect(manager.getByName('non-existent')).toBeUndefined();
    });

    it('should update a checkpoint', () => {
      const created = manager.create(createTestCheckpoint({ name: 'initial' }));
      const updated = manager.update(created.id, {
        name: 'updated',
        description: 'New description',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('updated');
      expect(updated?.description).toBe('New description');
      // updatedAt is set on update, verify it's a valid timestamp
      expect(updated?.updatedAt).toBeDefined();
      expect(new Date(updated?.updatedAt ?? '').getTime()).not.toBeNaN();
    });

    it('should update the name index when renaming', () => {
      const created = manager.create(createTestCheckpoint({ name: 'original' }));
      manager.update(created.id, { name: 'renamed' });

      expect(manager.getByName('original')).toBeUndefined();
      expect(manager.getByName('renamed')).toBeDefined();
    });

    it('should not allow updating released checkpoint', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, createSuccessfulTestResult());
      manager.markValidated(created.id);
      manager.update(created.id, { status: 'released' });

      const result = manager.update(created.id, { name: 'new-name' });
      expect(result).toBeUndefined();
    });

    it('should not allow changing chapterId on update', () => {
      const created = manager.create(createTestCheckpoint({ chapterId: 'ch01' }));
      const updated = manager.update(created.id, {
        // @ts-expect-error - testing runtime behavior
        chapterId: 'ch02',
        name: 'updated',
      });

      expect(updated?.chapterId).toBe('ch01');
    });

    it('should delete a checkpoint', () => {
      const created = manager.create(createTestCheckpoint());
      const deleted = manager.delete(created.id);

      expect(deleted).toBe(true);
      expect(manager.get(created.id)).toBeUndefined();
      expect(manager.getByName(created.name)).toBeUndefined();
    });

    it('should not delete a released checkpoint', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, createSuccessfulTestResult());
      manager.markValidated(created.id);
      manager.update(created.id, { status: 'released' });

      const deleted = manager.delete(created.id);
      expect(deleted).toBe(false);
      expect(manager.get(created.id)).toBeDefined();
    });

    it('should return false when deleting non-existent checkpoint', () => {
      expect(manager.delete('non-existent')).toBe(false);
    });

    it('should check if checkpoint exists', () => {
      const created = manager.create(createTestCheckpoint());
      expect(manager.has(created.id)).toBe(true);
      expect(manager.has('non-existent')).toBe(false);
    });

    it('should check if name exists', () => {
      const created = manager.create(createTestCheckpoint({ name: 'taken-name' }));
      expect(manager.nameExists('taken-name')).toBe(true);
      expect(manager.nameExists('available-name')).toBe(false);
      expect(manager.nameExists('taken-name', created.id)).toBe(false);
    });
  });

  describe('listing and querying', () => {
    beforeEach(() => {
      manager.create(createTestCheckpoint({ name: 'cp1', chapterId: 'ch01' }));
      manager.create(createTestCheckpoint({ name: 'cp2', chapterId: 'ch01' }));
      manager.create(createTestCheckpoint({ name: 'cp3', chapterId: 'ch02' }));
    });

    it('should get all checkpoints', () => {
      expect(manager.getAll()).toHaveLength(3);
    });

    it('should get checkpoints by chapter', () => {
      const ch01 = manager.getByChapter('ch01');
      expect(ch01).toHaveLength(2);
      expect(ch01.every((c) => c.chapterId === 'ch01')).toBe(true);
    });

    it('should list with chapter filter', () => {
      const result = manager.list({ chapterId: 'ch02' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('cp3');
    });

    it('should list with status filter', () => {
      const cp1 = manager.getByName('cp1')!;
      manager.recordCompileResult(cp1.id, createSuccessfulCompileResult());
      manager.recordTestResult(cp1.id, createSuccessfulTestResult());
      manager.markValidated(cp1.id);

      const validated = manager.list({ status: 'validated' });
      expect(validated).toHaveLength(1);
      expect(validated[0].name).toBe('cp1');
    });

    it('should get checkpoints in order', () => {
      const ordered = manager.getInOrder(['ch02', 'ch01']);
      expect(ordered).toHaveLength(3);
      expect(ordered[0].chapterId).toBe('ch02');
      expect(ordered[1].chapterId).toBe('ch01');
      expect(ordered[2].chapterId).toBe('ch01');
    });

    it('should exclude checkpoints not in chapter order', () => {
      const ordered = manager.getInOrder(['ch01']);
      expect(ordered).toHaveLength(2);
      expect(ordered.every((c) => c.chapterId === 'ch01')).toBe(true);
    });
  });

  describe('summaries', () => {
    it('should get checkpoint summary', () => {
      const created = manager.create(createTestCheckpoint({ name: 'summary-test' }));
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());

      const summary = manager.getSummary(created.id);
      expect(summary).toBeDefined();
      expect(summary?.id).toBe(created.id);
      expect(summary?.name).toBe('summary-test');
      expect(summary?.status).toBe('pending');
      expect(summary?.compilePassed).toBe(true);
      expect(summary?.testsPassed).toBeUndefined();
    });

    it('should get all summaries', () => {
      manager.create(createTestCheckpoint({ name: 'cp1' }));
      manager.create(createTestCheckpoint({ name: 'cp2' }));

      const summaries = manager.getAllSummaries();
      expect(summaries).toHaveLength(2);
      expect(summaries.every((s) => s.id && s.name && s.status)).toBe(true);
    });
  });

  describe('validation results', () => {
    it('should record compile result', () => {
      const created = manager.create(createTestCheckpoint());
      const result = createSuccessfulCompileResult();

      const updated = manager.recordCompileResult(created.id, result);

      expect(updated).toBeDefined();
      expect(updated?.compileResult).toEqual(result);
      expect(updated?.validatedAt).toBeDefined();
    });

    it('should record test result', () => {
      const created = manager.create(createTestCheckpoint());
      const result = createSuccessfulTestResult();

      const updated = manager.recordTestResult(created.id, result);

      expect(updated).toBeDefined();
      expect(updated?.testResult).toEqual(result);
      expect(updated?.validatedAt).toBeDefined();
    });

    it('should not record results on released checkpoint', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, createSuccessfulTestResult());
      manager.markValidated(created.id);
      manager.update(created.id, { status: 'released' });

      expect(
        manager.recordCompileResult(created.id, { success: false, output: '', errors: [] })
      ).toBeUndefined();
      expect(
        manager.recordTestResult(created.id, {
          success: false,
          passed: 0,
          failed: 1,
          skipped: 0,
          output: '',
          failures: [],
        })
      ).toBeUndefined();
    });
  });

  describe('status transitions', () => {
    it('should mark checkpoint as validated when both results pass', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, createSuccessfulTestResult());

      const result = manager.markValidated(created.id);

      expect(result.success).toBe(true);
      expect(result.checkpoint?.status).toBe('validated');
    });

    it('should fail to validate without compile result', () => {
      const created = manager.create(createTestCheckpoint());

      const result = manager.markValidated(created.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No compile result recorded');
    });

    it('should fail to validate with failed compilation', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, {
        success: false,
        output: 'Error',
        errors: [],
      });

      const result = manager.markValidated(created.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Compilation failed');
    });

    it('should fail to validate without test result', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());

      const result = manager.markValidated(created.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No test result recorded');
    });

    it('should fail to validate with failed tests', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, {
        success: false,
        passed: 5,
        failed: 2,
        skipped: 0,
        output: '',
        failures: [],
      });

      const result = manager.markValidated(created.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tests failed');
    });

    it('should fail to validate released checkpoint', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, createSuccessfulTestResult());
      manager.markValidated(created.id);
      manager.update(created.id, { status: 'released' });

      const result = manager.markValidated(created.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot modify released checkpoint');
    });

    it('should mark checkpoint as failed', () => {
      const created = manager.create(createTestCheckpoint());
      const updated = manager.markFailed(created.id);

      expect(updated?.status).toBe('failed');
    });

    it('should not mark released checkpoint as failed', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, createSuccessfulTestResult());
      manager.markValidated(created.id);
      manager.update(created.id, { status: 'released' });

      expect(manager.markFailed(created.id)).toBeUndefined();
    });

    it('should reset checkpoint to pending', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, createSuccessfulTestResult());
      manager.markValidated(created.id);

      const reset = manager.resetToPending(created.id);

      expect(reset?.status).toBe('pending');
      expect(reset?.compileResult).toBeUndefined();
      expect(reset?.testResult).toBeUndefined();
      expect(reset?.validatedAt).toBeUndefined();
    });

    it('should not reset released checkpoint', () => {
      const created = manager.create(createTestCheckpoint());
      manager.recordCompileResult(created.id, createSuccessfulCompileResult());
      manager.recordTestResult(created.id, createSuccessfulTestResult());
      manager.markValidated(created.id);
      manager.update(created.id, { status: 'released' });

      expect(manager.resetToPending(created.id)).toBeUndefined();
    });
  });

  describe('utility methods', () => {
    it('should clear all checkpoints', () => {
      manager.create(createTestCheckpoint({ name: 'cp1' }));
      manager.create(createTestCheckpoint({ name: 'cp2' }));

      manager.clear();

      expect(manager.size()).toBe(0);
      expect(manager.getByName('cp1')).toBeUndefined();
    });

    it('should report correct size', () => {
      expect(manager.size()).toBe(0);

      manager.create(createTestCheckpoint({ name: 'cp1' }));
      expect(manager.size()).toBe(1);

      manager.create(createTestCheckpoint({ name: 'cp2' }));
      expect(manager.size()).toBe(2);
    });
  });
});

describe('Status transition helpers', () => {
  describe('canTransition', () => {
    it('should allow pending -> validated', () => {
      expect(canTransition('pending', 'validated')).toBe(true);
    });

    it('should allow pending -> failed', () => {
      expect(canTransition('pending', 'failed')).toBe(true);
    });

    it('should allow validated -> released', () => {
      expect(canTransition('validated', 'released')).toBe(true);
    });

    it('should allow validated -> pending', () => {
      expect(canTransition('validated', 'pending')).toBe(true);
    });

    it('should allow failed -> pending', () => {
      expect(canTransition('failed', 'pending')).toBe(true);
    });

    it('should not allow transitions from released', () => {
      expect(canTransition('released', 'pending')).toBe(false);
      expect(canTransition('released', 'validated')).toBe(false);
      expect(canTransition('released', 'failed')).toBe(false);
    });

    it('should not allow invalid transitions', () => {
      expect(canTransition('pending', 'released')).toBe(false);
      expect(canTransition('failed', 'validated')).toBe(false);
      expect(canTransition('failed', 'released')).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return valid next statuses for pending', () => {
      expect(getValidNextStatuses('pending')).toEqual(['validated', 'failed']);
    });

    it('should return valid next statuses for validated', () => {
      expect(getValidNextStatuses('validated')).toEqual(['released', 'pending']);
    });

    it('should return valid next statuses for failed', () => {
      expect(getValidNextStatuses('failed')).toEqual(['pending']);
    });

    it('should return empty array for released', () => {
      expect(getValidNextStatuses('released')).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for released', () => {
      expect(isTerminalStatus('released')).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isTerminalStatus('pending')).toBe(false);
      expect(isTerminalStatus('validated')).toBe(false);
      expect(isTerminalStatus('failed')).toBe(false);
    });
  });
});
