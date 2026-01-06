/**
 * Bible management module for Spine
 *
 * Provides comprehensive CRUD operations and services for managing
 * story bible entities including characters, locations, factions,
 * world rules, plot threads, timeline events, and their relationships.
 */

// Main facade service
export {
  createBibleService,
  createBibleServiceFromRepositories,
  type BibleService,
} from './bible-service';

// Individual entity services
export { createCharacterService, type CharacterService } from './character-service';
export { createLocationService, type LocationService } from './location-service';
export { createFactionService, type FactionService } from './faction-service';
export { createWorldRuleService, type WorldRuleService } from './world-rule-service';
export { createPlotThreadService, type PlotThreadService } from './plot-thread-service';
export { createTimelineService, type TimelineService } from './timeline-service';

// Relationship graph
export {
  createRelationshipGraphService,
  type RelationshipGraphService,
  type GraphNode,
  type GraphEdge,
  type GraphPath,
} from './relationship-graph';

// Cross-reference tracking
export {
  createCrossReferenceRepository,
  type CrossReferenceRepository,
  type CreateCrossReferenceData,
} from './cross-reference-repository';
