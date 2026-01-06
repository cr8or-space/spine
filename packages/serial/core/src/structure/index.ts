/**
 * Structure management module for Spine
 *
 * Provides operations for managing the hierarchical story structure:
 * Book -> Arc -> Chapter -> Scene
 *
 * Includes beat sheet management, hook specifications, tension targets,
 * chapter types, and tree navigation operations.
 */

// Main structure service
export {
  createStructureService,
  type StructureService,
  type StructureSummary,
  type StructureStats,
} from './structure-service';

// Tree hierarchy operations
export {
  calculateDepth,
  canMoveTo,
  countByType,
  findByType,
  findCommonAncestor,
  getAncestors,
  getDescendants,
  getLeafNodes,
  getNextInReadingOrder,
  getNextSibling,
  getPath,
  getPathString,
  getPreviousInReadingOrder,
  getPreviousSibling,
  getSiblings,
  getTypeDepth,
  getValidChildTypes,
  isAncestorOf,
  isLeafNode,
  isValidParentChild,
  linearize,
  STRUCTURE_DEPTH,
  VALID_CHILD_TYPES,
  validateTree,
  type PathSegment,
  type TraversalOptions,
  type TreeValidationIssue,
  type TreeValidationResult,
} from './tree';

// Beat management operations
export {
  addBeat,
  cloneBeats,
  createBeat,
  distributeWordCount,
  estimateTotalWordCount,
  findBeatById,
  findBeatByOrder,
  getAggregatedBeatStats,
  getBeatStats,
  getCompletedBeats,
  getIncompleteBeats,
  getNextIncompleteBeat,
  insertBeatAt,
  markAllBeatsCompleted,
  markAllBeatsIncomplete,
  markBeatCompleted,
  moveBeat,
  normalizeOrders,
  removeBeat,
  reorderBeats,
  searchBeats,
  updateBeat,
  validateBeats,
  type BeatStats,
  type BeatValidationIssue,
  type CreateBeatInput,
  type UpdateBeatInput,
} from './beats';

// Hook specification operations
export {
  checkHookVariety,
  cloneHook,
  createHook,
  extractHooksInOrder,
  findStructuresNeedingHooks,
  getHookRecommendations,
  getHookStats,
  getHookSummary,
  getHookTypeDescription,
  getRecentHooks,
  getRecentHookTypes,
  HOOK_TYPE_DESCRIPTIONS,
  HOOK_TYPES,
  hooksEqual,
  RECOMMENDED_HOOKS_BY_CHAPTER_TYPE,
  shouldHaveHook,
  suggestTargetStrength,
  validateHook,
  type HookRecommendation,
  type HookStats,
  type HookValidationIssue,
  type HookValidationResult,
} from './hooks';
