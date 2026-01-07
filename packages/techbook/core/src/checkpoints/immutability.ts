/**
 * Release locking and immutability for TechBook checkpoints.
 *
 * Once a checkpoint is released, its behavior is frozen. This module
 * provides functionality for:
 * - Releasing checkpoints (transitioning to immutable state)
 * - Checking if modifications are allowed
 * - Validating that earlier checkpoints aren't broken
 */

import type {
  Checkpoint,
  CheckpointSnapshot,
  Snippet,
  TangledFile,
} from '@repo/techbook-types';

import { compareToSnapshot, createSnapshot, type SnapshotComparison } from './snapshots';

/**
 * Result of attempting to release a checkpoint
 */
export interface ReleaseResult {
  /** Whether the release was successful */
  success: boolean;
  /** The released checkpoint (if successful) */
  checkpoint?: Checkpoint;
  /** The snapshot created (if successful) */
  snapshot?: CheckpointSnapshot;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Violation of immutability rules
 */
export interface ImmutabilityViolation {
  /** ID of the released checkpoint that would be affected */
  checkpointId: string;
  /** Name of the checkpoint */
  checkpointName: string;
  /** Type of violation */
  type: 'file_modified' | 'file_removed' | 'behavior_changed';
  /** Files affected */
  affectedFiles: string[];
  /** Description of the violation */
  message: string;
}

/**
 * Result of checking immutability constraints
 */
export interface ImmutabilityCheckResult {
  /** Whether all constraints are satisfied */
  valid: boolean;
  /** Violations found */
  violations: ImmutabilityViolation[];
}

/**
 * Context for immutability checks
 */
export interface ImmutabilityContext {
  /** All checkpoints in order */
  checkpoints: Checkpoint[];
  /** Chapter order for sorting */
  chapterOrder: string[];
  /** Snapshots for released checkpoints */
  snapshots: Map<string, CheckpointSnapshot>;
  /** Function to tangle files for a checkpoint */
  tangleForCheckpoint: (checkpoint: Checkpoint) => TangledFile[];
}

/**
 * Check if a checkpoint can be modified.
 *
 * A checkpoint can be modified if:
 * - It is not in 'released' status
 */
export function canModifyCheckpoint(checkpoint: Checkpoint): boolean {
  return checkpoint.status !== 'released';
}

/**
 * Check if a checkpoint can be deleted.
 *
 * A checkpoint can be deleted if:
 * - It is not in 'released' status
 */
export function canDeleteCheckpoint(checkpoint: Checkpoint): boolean {
  return checkpoint.status !== 'released';
}

/**
 * Check if a checkpoint can be released.
 *
 * A checkpoint can be released if:
 * - It is in 'validated' status (must pass validation first)
 */
export function canReleaseCheckpoint(checkpoint: Checkpoint): boolean {
  return checkpoint.status === 'validated';
}

/**
 * Get all released checkpoints that occur before a given chapter.
 */
export function getReleasedCheckpointsBefore(
  targetChapterId: string,
  checkpoints: Checkpoint[],
  chapterOrder: string[]
): Checkpoint[] {
  const targetIndex = chapterOrder.indexOf(targetChapterId);
  if (targetIndex === -1) return [];

  const chapterIndex = new Map<string, number>();
  chapterOrder.forEach((id, idx) => chapterIndex.set(id, idx));

  return checkpoints.filter((cp) => {
    if (cp.status !== 'released') return false;
    const cpIndex = chapterIndex.get(cp.chapterId);
    return cpIndex !== undefined && cpIndex < targetIndex;
  });
}

/**
 * Get all released checkpoints that would be affected by changes in a chapter.
 *
 * A released checkpoint is affected if:
 * - It occurs at or after the modified chapter
 * - The modification would change its tangled output
 */
export function getAffectedReleasedCheckpoints(
  modifiedChapterId: string,
  checkpoints: Checkpoint[],
  chapterOrder: string[]
): Checkpoint[] {
  const modifiedIndex = chapterOrder.indexOf(modifiedChapterId);
  if (modifiedIndex === -1) return [];

  const chapterIndex = new Map<string, number>();
  chapterOrder.forEach((id, idx) => chapterIndex.set(id, idx));

  return checkpoints.filter((cp) => {
    if (cp.status !== 'released') return false;
    const cpIndex = chapterIndex.get(cp.chapterId);
    return cpIndex !== undefined && cpIndex >= modifiedIndex;
  });
}

/**
 * Check if adding/modifying/deleting a snippet would violate immutability.
 *
 * Returns violations for any released checkpoints that would be affected.
 */
export function checkSnippetChange(
  snippet: Snippet,
  context: ImmutabilityContext
): ImmutabilityCheckResult {
  const affectedCheckpoints = getAffectedReleasedCheckpoints(
    snippet.chapterId,
    context.checkpoints,
    context.chapterOrder
  );

  if (affectedCheckpoints.length === 0) {
    return { valid: true, violations: [] };
  }

  const violations: ImmutabilityViolation[] = [];

  for (const checkpoint of affectedCheckpoints) {
    const snapshot = context.snapshots.get(checkpoint.id);
    if (!snapshot) {
      // No snapshot for this released checkpoint - this is a warning but not a violation
      // (shouldn't happen if checkpoints are properly released)
      continue;
    }

    // Tangle current state for this checkpoint
    const currentFiles = context.tangleForCheckpoint(checkpoint);

    // Compare to snapshot
    const comparison = compareToSnapshot(snapshot, currentFiles);

    if (!comparison.matches) {
      const affectedFiles = [
        ...comparison.modifiedFiles,
        ...comparison.removedFiles,
        ...comparison.addedFiles,
      ];

      violations.push({
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        type: comparison.removedFiles.length > 0 ? 'file_removed' : 'file_modified',
        affectedFiles,
        message: formatComparisonMessage(comparison, checkpoint.name),
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Format a comparison result into a human-readable message.
 */
function formatComparisonMessage(comparison: SnapshotComparison, checkpointName: string): string {
  const parts: string[] = [];

  if (comparison.modifiedFiles.length > 0) {
    parts.push(
      `${comparison.modifiedFiles.length} file(s) would be modified: ${comparison.modifiedFiles.join(', ')}`
    );
  }
  if (comparison.removedFiles.length > 0) {
    parts.push(
      `${comparison.removedFiles.length} file(s) would be removed: ${comparison.removedFiles.join(', ')}`
    );
  }
  if (comparison.addedFiles.length > 0) {
    parts.push(
      `${comparison.addedFiles.length} file(s) would be added: ${comparison.addedFiles.join(', ')}`
    );
  }

  return `Checkpoint '${checkpointName}' would be affected: ${parts.join('; ')}`;
}

/**
 * Validate that all released checkpoints still match their snapshots.
 *
 * This is useful for checking consistency after operations.
 */
export function validateReleasedCheckpoints(
  context: ImmutabilityContext
): ImmutabilityCheckResult {
  const violations: ImmutabilityViolation[] = [];

  const releasedCheckpoints = context.checkpoints.filter((cp) => cp.status === 'released');

  for (const checkpoint of releasedCheckpoints) {
    const snapshot = context.snapshots.get(checkpoint.id);
    if (!snapshot) {
      violations.push({
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        type: 'behavior_changed',
        affectedFiles: [],
        message: `Released checkpoint '${checkpoint.name}' has no snapshot`,
      });
      continue;
    }

    const currentFiles = context.tangleForCheckpoint(checkpoint);
    const comparison = compareToSnapshot(snapshot, currentFiles);

    if (!comparison.matches) {
      violations.push({
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        type: comparison.removedFiles.length > 0 ? 'file_removed' : 'file_modified',
        affectedFiles: [
          ...comparison.modifiedFiles,
          ...comparison.removedFiles,
          ...comparison.addedFiles,
        ],
        message: formatComparisonMessage(comparison, checkpoint.name),
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Release a checkpoint, making it immutable.
 *
 * Prerequisites:
 * - Checkpoint must be in 'validated' status
 * - A tangle result must be provided to create the snapshot
 *
 * Side effects:
 * - Creates a snapshot of the current tangled state
 * - Transitions checkpoint status to 'released'
 */
export function prepareRelease(
  checkpoint: Checkpoint,
  tangleResult: { files: TangledFile[] },
  storagePath?: string
): ReleaseResult {
  if (!canReleaseCheckpoint(checkpoint)) {
    return {
      success: false,
      error: `Cannot release checkpoint in '${checkpoint.status}' status. Must be 'validated'.`,
    };
  }

  // Create snapshot
  const snapshot = createSnapshot(
    checkpoint,
    { ...tangleResult, success: true, errors: [], tangledAt: new Date().toISOString() },
    { storagePath }
  );

  // Create released checkpoint
  const releasedCheckpoint: Checkpoint = {
    ...checkpoint,
    status: 'released',
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    checkpoint: releasedCheckpoint,
    snapshot,
  };
}

/**
 * Check if a chapter can be safely modified without breaking released checkpoints.
 */
export function canModifyChapter(
  chapterId: string,
  checkpoints: Checkpoint[],
  chapterOrder: string[]
): { allowed: boolean; blockingCheckpoints: Checkpoint[] } {
  const affectedCheckpoints = getAffectedReleasedCheckpoints(
    chapterId,
    checkpoints,
    chapterOrder
  );

  return {
    allowed: affectedCheckpoints.length === 0,
    blockingCheckpoints: affectedCheckpoints,
  };
}
