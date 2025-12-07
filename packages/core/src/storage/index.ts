/**
 * Storage layer for NovelGen
 *
 * Provides:
 * - SQLite database with schema and migrations
 * - Repository pattern for all entities
 * - Project-level save/load operations
 * - File-based content export/backup
 * - Auto-save functionality
 */

// Database
export { openDatabase, createTestDatabase, type DatabaseConnection, type DatabaseOptions } from './database';

// Schema
export { SCHEMA_VERSION, CREATE_TABLES_SQL, DROP_TABLES_SQL } from './schema';

// Repository utilities
export { generateId, nowTimestamp, parseJson, boolToInt, intToBool, wrapResult } from './repository';

// Repositories
export {
  // Character
  createCharacterRepository,
  type CharacterRepository,
  type CreateCharacterData,
  type UpdateCharacterData,
  // Location
  createLocationRepository,
  type LocationRepository,
  type CreateLocationData,
  type UpdateLocationData,
  // Faction
  createFactionRepository,
  type FactionRepository,
  type CreateFactionData,
  type UpdateFactionData,
  // World Rule
  createWorldRuleRepository,
  type WorldRuleRepository,
  type CreateWorldRuleData,
  type UpdateWorldRuleData,
  // Plot Thread
  createPlotThreadRepository,
  type PlotThreadRepository,
  type CreatePlotThreadData,
  type UpdatePlotThreadData,
  // Timeline
  createTimelineEventRepository,
  createTimelineSpanRepository,
  type TimelineEventRepository,
  type TimelineSpanRepository,
  type CreateTimelineEventData,
  type UpdateTimelineEventData,
  type CreateTimelineSpanData,
  type UpdateTimelineSpanData,
  // Structure
  createStructureRepository,
  type StructureRepository,
  type CreateStructureData,
  type UpdateStructureData,
  // Content
  createContentRepository,
  type ContentRepository,
  type CreateContentData,
  type UpdateContentData,
  // Project
  createProjectRepository,
  type ProjectRepository,
  type CreateProjectRepoData,
  type UpdateProjectRepoData,
} from './repositories';

// Project service
export {
  createProjectService,
  type ProjectService,
  type ProjectRepositories,
} from './project-service';

// File storage
export {
  createFileStorage,
  type FileStorage,
  type FileStorageOptions,
  type ContentFileMetadata,
} from './file-storage';

// Auto-save
export {
  createAutoSaveController,
  createChangeTracker,
  createConflictAwareAutoSave,
  type AutoSaveController,
  type AutoSaveOptions,
  type AutoSaveState,
  type ConflictAwareAutoSave,
} from './auto-save';
