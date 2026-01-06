/**
 * Spine module - Linear and tree spine implementations with checkpoints.
 */

// Linear spine
export {
  createLinearSpine,
  createEmptyLinearSpine,
  createLinearSpineBuilder,
  type LinearSpineConfig,
  type LinearSpineBuilder,
} from './linear';

// Tree spine
export {
  createTreeSpine,
  createEmptyTreeSpine,
  createTreeSpineBuilder,
  pathToRoot,
  lowestCommonAncestor,
  getLeafNodes,
  getNodesAtDepth,
  type TreeSpineConfig,
  type TreeSpineBuilder,
} from './tree';

// Checkpoints
export {
  createCheckpointRepository,
  getNodesBeforeCheckpoint,
  isBeforeOrAtCheckpoint,
  type Checkpoint,
  type CheckpointRepository,
} from './checkpoints';
