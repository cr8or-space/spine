/**
 * Checkpoint manager for TechBook domain.
 *
 * Provides CRUD operations for checkpoints - named, validated states
 * of the tangled codebase. Each checkpoint represents a point in the
 * book where all code must compile and tests must pass.
 */

import { nanoid } from 'nanoid';

import type {
  Checkpoint,
  CheckpointStatus,
  CheckpointSummary,
  CompileResult,
  TestResult,
} from '@repo/techbook-types';

/**
 * Data required to create a checkpoint.
 */
export type CreateCheckpointData = Pick<Checkpoint, 'name' | 'chapterId'> &
  Partial<Pick<Checkpoint, 'description'>>;

/**
 * Data for updating a checkpoint.
 * Note: Released checkpoints cannot be updated (see immutability module).
 */
export type UpdateCheckpointData = Partial<
  Pick<Checkpoint, 'name' | 'description' | 'status' | 'compileResult' | 'testResult'>
>;

/**
 * Options for listing checkpoints
 */
export interface ListCheckpointsOptions {
  /** Filter by chapter ID */
  chapterId?: string;
  /** Filter by status */
  status?: CheckpointStatus;
}

/**
 * Result of checkpoint validation transition
 */
export interface ValidationTransitionResult {
  /** Whether the transition was successful */
  success: boolean;
  /** The updated checkpoint (if successful) */
  checkpoint?: Checkpoint;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Checkpoint manager interface
 */
export interface CheckpointManager {
  /** Get a checkpoint by ID */
  get(id: string): Checkpoint | undefined;

  /** Get a checkpoint by name */
  getByName(name: string): Checkpoint | undefined;

  /** Get all checkpoints */
  getAll(): Checkpoint[];

  /** Get checkpoints by chapter */
  getByChapter(chapterId: string): Checkpoint[];

  /** List checkpoints with optional filters */
  list(options?: ListCheckpointsOptions): Checkpoint[];

  /** Create a new checkpoint */
  create(data: CreateCheckpointData): Checkpoint;

  /** Update a checkpoint */
  update(id: string, data: UpdateCheckpointData): Checkpoint | undefined;

  /** Delete a checkpoint */
  delete(id: string): boolean;

  /** Check if a checkpoint exists */
  has(id: string): boolean;

  /** Check if a name is already taken */
  nameExists(name: string, excludeId?: string): boolean;

  /** Get checkpoint summary for listings */
  getSummary(id: string): CheckpointSummary | undefined;

  /** Get all checkpoint summaries */
  getAllSummaries(): CheckpointSummary[];

  /**
   * Get checkpoints in order (by chapter order).
   */
  getInOrder(chapterOrder: string[]): Checkpoint[];

  /**
   * Record compile result for a checkpoint.
   * Updates the checkpoint's compileResult and potentially its status.
   */
  recordCompileResult(id: string, result: CompileResult): Checkpoint | undefined;

  /**
   * Record test result for a checkpoint.
   * Updates the checkpoint's testResult and potentially its status.
   */
  recordTestResult(id: string, result: TestResult): Checkpoint | undefined;

  /**
   * Mark a checkpoint as validated.
   * Only succeeds if compile and test results are both successful.
   */
  markValidated(id: string): ValidationTransitionResult;

  /**
   * Mark a checkpoint as failed.
   */
  markFailed(id: string): Checkpoint | undefined;

  /**
   * Reset a checkpoint to pending.
   * Only allowed if the checkpoint is not released.
   */
  resetToPending(id: string): Checkpoint | undefined;

  /** Clear all checkpoints */
  clear(): void;

  /** Get the number of checkpoints */
  size(): number;
}

/**
 * Generate a timestamp string
 */
function nowTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return nanoid();
}

/**
 * Convert a checkpoint to a summary
 */
function toSummary(checkpoint: Checkpoint): CheckpointSummary {
  return {
    id: checkpoint.id,
    name: checkpoint.name,
    chapterId: checkpoint.chapterId,
    status: checkpoint.status,
    compilePassed: checkpoint.compileResult?.success,
    testsPassed: checkpoint.testResult?.success,
  };
}

/**
 * Valid status transitions for checkpoints
 */
const validTransitions: Record<CheckpointStatus, CheckpointStatus[]> = {
  pending: ['validated', 'failed'],
  validated: ['released', 'pending'], // Can reset to pending for re-validation
  failed: ['pending'], // Can only go back to pending for re-validation
  released: [], // Terminal state - no transitions allowed
};

/**
 * Check if a status transition is valid
 */
export function canTransition(from: CheckpointStatus, to: CheckpointStatus): boolean {
  return validTransitions[from].includes(to);
}

/**
 * Get valid next statuses for a checkpoint
 */
export function getValidNextStatuses(status: CheckpointStatus): CheckpointStatus[] {
  return [...validTransitions[status]];
}

/**
 * Check if a checkpoint status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: CheckpointStatus): boolean {
  return validTransitions[status].length === 0;
}

/**
 * Create an in-memory checkpoint manager
 */
export function createCheckpointManager(): CheckpointManager {
  const checkpoints = new Map<string, Checkpoint>();
  const byName = new Map<string, string>(); // name -> id

  return {
    get(id: string): Checkpoint | undefined {
      return checkpoints.get(id);
    },

    getByName(name: string): Checkpoint | undefined {
      const id = byName.get(name);
      return id ? checkpoints.get(id) : undefined;
    },

    getAll(): Checkpoint[] {
      return Array.from(checkpoints.values());
    },

    getByChapter(chapterId: string): Checkpoint[] {
      return this.getAll().filter((c) => c.chapterId === chapterId);
    },

    list(options?: ListCheckpointsOptions): Checkpoint[] {
      let result = this.getAll();

      if (options?.chapterId) {
        result = result.filter((c) => c.chapterId === options.chapterId);
      }
      if (options?.status) {
        result = result.filter((c) => c.status === options.status);
      }

      return result;
    },

    create(data: CreateCheckpointData): Checkpoint {
      const now = nowTimestamp();
      const checkpoint: Checkpoint = {
        id: generateId(),
        entityType: 'checkpoint',
        name: data.name,
        description: data.description ?? '',
        chapterId: data.chapterId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      checkpoints.set(checkpoint.id, checkpoint);
      byName.set(checkpoint.name, checkpoint.id);
      return checkpoint;
    },

    update(id: string, data: UpdateCheckpointData): Checkpoint | undefined {
      const existing = checkpoints.get(id);
      if (!existing) return undefined;

      // Check if released - released checkpoints cannot be updated
      if (existing.status === 'released') {
        return undefined;
      }

      // Handle name change
      if (data.name && data.name !== existing.name) {
        byName.delete(existing.name);
        byName.set(data.name, id);
      }

      const updated: Checkpoint = {
        ...existing,
        ...data,
        id: existing.id, // Ensure ID cannot be changed
        entityType: 'checkpoint', // Ensure entityType cannot be changed
        chapterId: existing.chapterId, // Chapter cannot be changed after creation
        createdAt: existing.createdAt, // Ensure createdAt cannot be changed
        updatedAt: nowTimestamp(),
      };

      checkpoints.set(id, updated);
      return updated;
    },

    delete(id: string): boolean {
      const checkpoint = checkpoints.get(id);
      if (!checkpoint) return false;

      // Released checkpoints cannot be deleted
      if (checkpoint.status === 'released') {
        return false;
      }

      byName.delete(checkpoint.name);
      return checkpoints.delete(id);
    },

    has(id: string): boolean {
      return checkpoints.has(id);
    },

    nameExists(name: string, excludeId?: string): boolean {
      const existingId = byName.get(name);
      if (!existingId) return false;
      return excludeId ? existingId !== excludeId : true;
    },

    getSummary(id: string): CheckpointSummary | undefined {
      const checkpoint = this.get(id);
      return checkpoint ? toSummary(checkpoint) : undefined;
    },

    getAllSummaries(): CheckpointSummary[] {
      return this.getAll().map(toSummary);
    },

    getInOrder(chapterOrder: string[]): Checkpoint[] {
      const chapterIndex = new Map<string, number>();
      chapterOrder.forEach((id, index) => chapterIndex.set(id, index));

      return this.getAll()
        .filter((c) => chapterIndex.has(c.chapterId))
        .sort((a, b) => {
          const aChapter = chapterIndex.get(a.chapterId) ?? 0;
          const bChapter = chapterIndex.get(b.chapterId) ?? 0;
          return aChapter - bChapter;
        });
    },

    recordCompileResult(id: string, result: CompileResult): Checkpoint | undefined {
      const existing = checkpoints.get(id);
      if (!existing) return undefined;

      // Cannot update released checkpoints
      if (existing.status === 'released') {
        return undefined;
      }

      const updated: Checkpoint = {
        ...existing,
        compileResult: result,
        validatedAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      };

      checkpoints.set(id, updated);
      return updated;
    },

    recordTestResult(id: string, result: TestResult): Checkpoint | undefined {
      const existing = checkpoints.get(id);
      if (!existing) return undefined;

      // Cannot update released checkpoints
      if (existing.status === 'released') {
        return undefined;
      }

      const updated: Checkpoint = {
        ...existing,
        testResult: result,
        validatedAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      };

      checkpoints.set(id, updated);
      return updated;
    },

    markValidated(id: string): ValidationTransitionResult {
      const existing = checkpoints.get(id);
      if (!existing) {
        return { success: false, error: 'Checkpoint not found' };
      }

      // Check if released
      if (existing.status === 'released') {
        return { success: false, error: 'Cannot modify released checkpoint' };
      }

      // Check if compile and test results exist and are successful
      if (!existing.compileResult) {
        return { success: false, error: 'No compile result recorded' };
      }
      if (!existing.compileResult.success) {
        return { success: false, error: 'Compilation failed' };
      }
      if (!existing.testResult) {
        return { success: false, error: 'No test result recorded' };
      }
      if (!existing.testResult.success) {
        return { success: false, error: 'Tests failed' };
      }

      const updated: Checkpoint = {
        ...existing,
        status: 'validated',
        validatedAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      };

      checkpoints.set(id, updated);
      return { success: true, checkpoint: updated };
    },

    markFailed(id: string): Checkpoint | undefined {
      const existing = checkpoints.get(id);
      if (!existing) return undefined;

      // Cannot update released checkpoints
      if (existing.status === 'released') {
        return undefined;
      }

      const updated: Checkpoint = {
        ...existing,
        status: 'failed',
        updatedAt: nowTimestamp(),
      };

      checkpoints.set(id, updated);
      return updated;
    },

    resetToPending(id: string): Checkpoint | undefined {
      const existing = checkpoints.get(id);
      if (!existing) return undefined;

      // Cannot reset released checkpoints
      if (existing.status === 'released') {
        return undefined;
      }

      const updated: Checkpoint = {
        ...existing,
        status: 'pending',
        // Clear validation results when resetting
        compileResult: undefined,
        testResult: undefined,
        validatedAt: undefined,
        updatedAt: nowTimestamp(),
      };

      checkpoints.set(id, updated);
      return updated;
    },

    clear(): void {
      checkpoints.clear();
      byName.clear();
    },

    size(): number {
      return checkpoints.size;
    },
  };
}
