/**
 * Structure management module for Spine
 *
 * Provides operations for managing the hierarchical story structure:
 * Book -> Arc -> Chapter -> Scene
 *
 * Includes beat sheet management, hook specifications, tension targets,
 * chapter types, and tree navigation operations.
 */

export {
  createStructureService,
  type StructureService,
  type StructureSummary,
  type StructureStats,
} from './structure-service';
