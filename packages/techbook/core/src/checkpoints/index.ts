/**
 * Checkpoint management for TechBook domain.
 *
 * Provides:
 * - CheckpointManager: CRUD operations for checkpoints
 * - SnapshotStorage: Snapshot creation and comparison
 * - Immutability: Release locking and validation
 *
 * @example Creating and managing checkpoints
 * ```typescript
 * import { createCheckpointManager } from '@repo/techbook-core';
 *
 * const manager = createCheckpointManager();
 *
 * // Create a checkpoint
 * const checkpoint = manager.create({
 *   name: 'chapter-03-complete',
 *   chapterId: 'ch03',
 *   description: 'After implementing the lexer',
 * });
 *
 * // Record validation results
 * manager.recordCompileResult(checkpoint.id, { success: true, output: '', errors: [] });
 * manager.recordTestResult(checkpoint.id, { success: true, passed: 10, failed: 0, output: '' });
 *
 * // Mark as validated
 * manager.markValidated(checkpoint.id);
 * ```
 *
 * @example Working with snapshots
 * ```typescript
 * import { createSnapshot, compareToSnapshot, createSnapshotStorage } from '@repo/techbook-core';
 *
 * const storage = createSnapshotStorage();
 *
 * // Create and store a snapshot when releasing
 * const snapshot = createSnapshot(checkpoint, tangleResult);
 * storage.store(snapshot);
 *
 * // Later, compare current state to snapshot
 * const comparison = compareToSnapshot(snapshot, currentFiles);
 * if (!comparison.matches) {
 *   console.log('Modified files:', comparison.modifiedFiles);
 * }
 * ```
 *
 * @example Release locking
 * ```typescript
 * import { canReleaseCheckpoint, prepareRelease } from '@repo/techbook-core';
 *
 * if (canReleaseCheckpoint(checkpoint)) {
 *   const result = prepareRelease(checkpoint, tangleResult);
 *   if (result.success) {
 *     // Store the snapshot and update the checkpoint
 *     storage.store(result.snapshot);
 *     manager.update(checkpoint.id, { status: 'released' });
 *   }
 * }
 * ```
 */

// Manager exports
export {
  createCheckpointManager,
  canTransition,
  getValidNextStatuses,
  isTerminalStatus,
  type CheckpointManager,
  type CreateCheckpointData,
  type UpdateCheckpointData,
  type ListCheckpointsOptions,
  type ValidationTransitionResult,
} from './manager';

// Snapshot exports
export {
  createSnapshot,
  createSnapshotStorage,
  compareToSnapshot,
  getFileDiffs,
  getChangesSummary,
  verifySnapshotIntegrity,
  hashContent,
  combineHashes,
  createFileHashes,
  type CreateSnapshotOptions,
  type SnapshotComparison,
  type FileDiff,
  type SnapshotStorage,
  type ChangesSummary,
} from './snapshots';

// Immutability exports
export {
  canModifyCheckpoint,
  canDeleteCheckpoint,
  canReleaseCheckpoint,
  canModifyChapter,
  getReleasedCheckpointsBefore,
  getAffectedReleasedCheckpoints,
  checkSnippetChange,
  validateReleasedCheckpoints,
  prepareRelease,
  type ReleaseResult,
  type ImmutabilityViolation,
  type ImmutabilityCheckResult,
  type ImmutabilityContext,
} from './immutability';
