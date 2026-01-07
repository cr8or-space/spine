/**
 * Snapshot management for TechBook checkpoints.
 *
 * Snapshots preserve the exact state of tangled files when a checkpoint
 * is released, allowing comparison with current state or restoration.
 */

import type {
  Checkpoint,
  CheckpointSnapshot,
  TangledFile,
  TangleResult,
} from '@repo/techbook-types';

/**
 * Options for creating a snapshot
 */
export interface CreateSnapshotOptions {
  /** Base path for storing snapshot files (optional for in-memory storage) */
  storagePath?: string;
}

/**
 * Result of comparing current tangled files to a snapshot
 */
export interface SnapshotComparison {
  /** Whether the current state matches the snapshot */
  matches: boolean;
  /** Files that have been added since the snapshot */
  addedFiles: string[];
  /** Files that have been removed since the snapshot */
  removedFiles: string[];
  /** Files that have been modified since the snapshot */
  modifiedFiles: string[];
  /** Files that are unchanged */
  unchangedFiles: string[];
}

/**
 * Detailed diff for a single file
 */
export interface FileDiff {
  /** File path */
  path: string;
  /** Type of change */
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  /** Hash in snapshot (if exists) */
  snapshotHash?: string;
  /** Current hash (if exists) */
  currentHash?: string;
}

/**
 * Snapshot storage interface
 */
export interface SnapshotStorage {
  /** Get a snapshot by checkpoint ID */
  get(checkpointId: string): CheckpointSnapshot | undefined;

  /** Get all snapshots */
  getAll(): CheckpointSnapshot[];

  /** Store a snapshot */
  store(snapshot: CheckpointSnapshot): void;

  /** Delete a snapshot */
  delete(checkpointId: string): boolean;

  /** Check if a snapshot exists */
  has(checkpointId: string): boolean;

  /** Clear all snapshots */
  clear(): void;

  /** Get the number of snapshots */
  size(): number;
}

/**
 * Create a simple djb2-style hash for content.
 *
 * This is a basic hash suitable for change detection.
 * For cryptographic purposes, use a proper hash function.
 */
export function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Create a combined hash from multiple file hashes.
 */
export function combineHashes(fileHashes: Record<string, string>): string {
  const sortedPaths = Object.keys(fileHashes).sort();
  const combined = sortedPaths.map((path) => `${path}:${fileHashes[path]}`).join('\n');
  return hashContent(combined);
}

/**
 * Create file hashes from tangled files.
 */
export function createFileHashes(files: TangledFile[]): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const file of files) {
    // Use the file's contentHash if available, otherwise compute it
    hashes[file.path] = file.contentHash ?? hashContent(file.content);
  }
  return hashes;
}

/**
 * Create a snapshot from tangled files.
 */
export function createSnapshot(
  checkpoint: Checkpoint,
  tangleResult: TangleResult,
  options?: CreateSnapshotOptions
): CheckpointSnapshot {
  const fileHashes = createFileHashes(tangleResult.files);
  const contentHash = combineHashes(fileHashes);

  return {
    checkpointId: checkpoint.id,
    createdAt: new Date().toISOString(),
    contentHash,
    fileHashes,
    storagePath: options?.storagePath,
  };
}

/**
 * Compare current tangled files to a snapshot.
 */
export function compareToSnapshot(
  snapshot: CheckpointSnapshot,
  currentFiles: TangledFile[]
): SnapshotComparison {
  const currentHashes = createFileHashes(currentFiles);
  const snapshotPaths = new Set(Object.keys(snapshot.fileHashes));
  const currentPaths = new Set(Object.keys(currentHashes));

  const addedFiles: string[] = [];
  const removedFiles: string[] = [];
  const modifiedFiles: string[] = [];
  const unchangedFiles: string[] = [];

  // Find added and modified files
  for (const path of currentPaths) {
    if (!snapshotPaths.has(path)) {
      addedFiles.push(path);
    } else if (currentHashes[path] !== snapshot.fileHashes[path]) {
      modifiedFiles.push(path);
    } else {
      unchangedFiles.push(path);
    }
  }

  // Find removed files
  for (const path of snapshotPaths) {
    if (!currentPaths.has(path)) {
      removedFiles.push(path);
    }
  }

  return {
    matches:
      addedFiles.length === 0 && removedFiles.length === 0 && modifiedFiles.length === 0,
    addedFiles: addedFiles.sort(),
    removedFiles: removedFiles.sort(),
    modifiedFiles: modifiedFiles.sort(),
    unchangedFiles: unchangedFiles.sort(),
  };
}

/**
 * Get detailed diffs for all files.
 */
export function getFileDiffs(
  snapshot: CheckpointSnapshot,
  currentFiles: TangledFile[]
): FileDiff[] {
  const currentHashes = createFileHashes(currentFiles);
  const allPaths = new Set([
    ...Object.keys(snapshot.fileHashes),
    ...Object.keys(currentHashes),
  ]);

  const diffs: FileDiff[] = [];

  for (const path of allPaths) {
    const snapshotHash = snapshot.fileHashes[path];
    const currentHash = currentHashes[path];

    let changeType: FileDiff['changeType'];
    if (!snapshotHash) {
      changeType = 'added';
    } else if (!currentHash) {
      changeType = 'removed';
    } else if (snapshotHash !== currentHash) {
      changeType = 'modified';
    } else {
      changeType = 'unchanged';
    }

    diffs.push({
      path,
      changeType,
      snapshotHash,
      currentHash,
    });
  }

  return diffs.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Verify that a snapshot's content hash is valid.
 *
 * Recomputes the combined hash from file hashes and compares.
 */
export function verifySnapshotIntegrity(snapshot: CheckpointSnapshot): boolean {
  const expectedHash = combineHashes(snapshot.fileHashes);
  return expectedHash === snapshot.contentHash;
}

/**
 * Create an in-memory snapshot storage.
 */
export function createSnapshotStorage(): SnapshotStorage {
  const snapshots = new Map<string, CheckpointSnapshot>();

  return {
    get(checkpointId: string): CheckpointSnapshot | undefined {
      return snapshots.get(checkpointId);
    },

    getAll(): CheckpointSnapshot[] {
      return Array.from(snapshots.values());
    },

    store(snapshot: CheckpointSnapshot): void {
      snapshots.set(snapshot.checkpointId, snapshot);
    },

    delete(checkpointId: string): boolean {
      return snapshots.delete(checkpointId);
    },

    has(checkpointId: string): boolean {
      return snapshots.has(checkpointId);
    },

    clear(): void {
      snapshots.clear();
    },

    size(): number {
      return snapshots.size;
    },
  };
}

/**
 * Summary of changes between a snapshot and current state.
 */
export interface ChangesSummary {
  /** Total number of files in snapshot */
  snapshotFileCount: number;
  /** Total number of current files */
  currentFileCount: number;
  /** Number of files added */
  addedCount: number;
  /** Number of files removed */
  removedCount: number;
  /** Number of files modified */
  modifiedCount: number;
  /** Number of files unchanged */
  unchangedCount: number;
  /** Whether current state matches snapshot */
  matches: boolean;
}

/**
 * Get a summary of changes between snapshot and current state.
 */
export function getChangesSummary(
  snapshot: CheckpointSnapshot,
  currentFiles: TangledFile[]
): ChangesSummary {
  const comparison = compareToSnapshot(snapshot, currentFiles);

  return {
    snapshotFileCount: Object.keys(snapshot.fileHashes).length,
    currentFileCount: currentFiles.length,
    addedCount: comparison.addedFiles.length,
    removedCount: comparison.removedFiles.length,
    modifiedCount: comparison.modifiedFiles.length,
    unchangedCount: comparison.unchangedFiles.length,
    matches: comparison.matches,
  };
}
