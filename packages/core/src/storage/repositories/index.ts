/**
 * All repositories for database operations
 */

// Base repository interfaces (Spine framework preparation)
export type {
  EntityRepository,
  ExtendedEntityRepository,
  BulkEntityRepository,
  BulkOperationOptions,
  BulkOperationResult,
} from './base';

// Bible entity repositories
export {
  createCharacterRepository,
  type CharacterRepository,
  type CreateCharacterData,
  type UpdateCharacterData,
} from './character-repository';

export {
  createLocationRepository,
  type LocationRepository,
  type CreateLocationData,
  type UpdateLocationData,
} from './location-repository';

export {
  createFactionRepository,
  type FactionRepository,
  type CreateFactionData,
  type UpdateFactionData,
} from './faction-repository';

export {
  createWorldRuleRepository,
  type WorldRuleRepository,
  type CreateWorldRuleData,
  type UpdateWorldRuleData,
} from './world-rule-repository';

export {
  createPlotThreadRepository,
  type PlotThreadRepository,
  type CreatePlotThreadData,
  type UpdatePlotThreadData,
} from './plot-thread-repository';

export {
  createTimelineEventRepository,
  createTimelineSpanRepository,
  type TimelineEventRepository,
  type TimelineSpanRepository,
  type CreateTimelineEventData,
  type UpdateTimelineEventData,
  type CreateTimelineSpanData,
  type UpdateTimelineSpanData,
} from './timeline-repository';

// Structure and content repositories
export {
  createStructureRepository,
  type StructureRepository,
  type CreateStructureData,
  type UpdateStructureData,
} from './structure-repository';

export {
  createContentRepository,
  type ContentRepository,
  type CreateContentData,
  type UpdateContentData,
} from './content-repository';

// Project repository
export {
  createProjectRepository,
  type ProjectRepository,
  type CreateProjectData as CreateProjectRepoData,
  type UpdateProjectData as UpdateProjectRepoData,
} from './project-repository';

// Lock point repository
export {
  createLockPointRepository,
  type LockPointRepository,
  type CreateLockPointData,
} from './lock-point-repository';
