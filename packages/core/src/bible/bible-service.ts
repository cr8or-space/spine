/**
 * Bible service facade for comprehensive story bible management
 *
 * Provides a unified interface to all bible entity services including
 * characters, locations, factions, world rules, plot threads, timeline,
 * cross-references, and relationship graphs.
 */

import type Database from 'libsql';

import type { Bible, BibleSummary, EntityRef } from '@repo/types';

import type { DrizzleDB } from '../storage/database';
import type { ProjectRepositories } from '../storage/project-service';
import {
  createCharacterRepository,
  createFactionRepository,
  createLocationRepository,
  createPlotThreadRepository,
  createTimelineEventRepository,
  createTimelineSpanRepository,
  createWorldRuleRepository,
} from '../storage/repositories';
import { nowTimestamp } from '../storage/repository';
import { createCharacterService, type CharacterService } from './character-service';
import {
  createCrossReferenceRepository,
  type CrossReferenceRepository,
} from './cross-reference-repository';
import { createFactionService, type FactionService } from './faction-service';
import { createLocationService, type LocationService } from './location-service';
import { createPlotThreadService, type PlotThreadService } from './plot-thread-service';
import {
  createRelationshipGraphService,
  type RelationshipGraphService,
} from './relationship-graph';
import { createTimelineService, type TimelineService } from './timeline-service';
import { createWorldRuleService, type WorldRuleService } from './world-rule-service';

/**
 * Complete bible service interface
 */
export interface BibleService {
  /** Character management */
  characters: CharacterService;

  /** Location management */
  locations: LocationService;

  /** Faction management */
  factions: FactionService;

  /** World rule management */
  worldRules: WorldRuleService;

  /** Plot thread management */
  plotThreads: PlotThreadService;

  /** Timeline management (events and spans) */
  timeline: TimelineService;

  /** Cross-reference tracking */
  crossRefs: CrossReferenceRepository;

  /** Relationship graph analysis */
  graph: RelationshipGraphService;

  /** Get the complete bible */
  getBible(): Bible;

  /** Get summarized bible for context assembly */
  getBibleSummary(): BibleSummary;

  /** Search across all bible entities */
  searchAll(query: string): Array<{ type: EntityRef['type']; id: string; name: string; match: string }>;

  /** Get entity by reference */
  getEntity(ref: EntityRef): unknown | undefined;

  /** Get all entities referencing a given entity */
  getReferencingEntities(entityId: string, entityType: EntityRef['type']): EntityRef[];

  /** Get all entities referenced by a given entity */
  getReferencedEntities(entityId: string, entityType: EntityRef['type']): EntityRef[];

  /** Update cross-references for a piece of content */
  updateContentReferences(
    contentId: string,
    references: Array<{ targetId: string; targetType: EntityRef['type']; context?: string }>
  ): void;

  /** Get bible statistics */
  getStats(): {
    characters: number;
    locations: number;
    factions: number;
    worldRules: number;
    plotThreads: number;
    timelineEvents: number;
    timelineSpans: number;
    crossReferences: number;
  };
}

/**
 * Create bible service
 */
export function createBibleService(db: Database.Database, drizzleDb: DrizzleDB, projectId: string): BibleService {
  // Create repositories
  const characterRepo = createCharacterRepository(db, drizzleDb);
  const locationRepo = createLocationRepository(db, drizzleDb);
  const factionRepo = createFactionRepository(db, drizzleDb);
  const worldRuleRepo = createWorldRuleRepository(db, drizzleDb);
  const plotThreadRepo = createPlotThreadRepository(db, drizzleDb);
  const timelineEventRepo = createTimelineEventRepository(db, drizzleDb);
  const timelineSpanRepo = createTimelineSpanRepository(db, drizzleDb);
  const crossRefRepo = createCrossReferenceRepository(db, drizzleDb);

  // Create services
  const characterService = createCharacterService(projectId, characterRepo);
  const locationService = createLocationService(projectId, locationRepo);
  const factionService = createFactionService(projectId, factionRepo);
  const worldRuleService = createWorldRuleService(projectId, worldRuleRepo);
  const plotThreadService = createPlotThreadService(projectId, plotThreadRepo);
  const timelineService = createTimelineService(projectId, timelineEventRepo, timelineSpanRepo);
  const graphService = createRelationshipGraphService(
    characterService,
    locationService,
    factionService,
    plotThreadService,
    timelineService
  );

  return {
    characters: characterService,
    locations: locationService,
    factions: factionService,
    worldRules: worldRuleService,
    plotThreads: plotThreadService,
    timeline: timelineService,
    crossRefs: crossRefRepo,
    graph: graphService,

    getBible(): Bible {
      const now = nowTimestamp();
      return {
        id: projectId,
        characters: characterService.getAll(),
        locations: locationService.getAll(),
        factions: factionService.getAll(),
        worldRules: worldRuleService.getAll(),
        plotThreads: plotThreadService.getAll(),
        timelineEvents: timelineService.getAllEvents(),
        timelineSpans: timelineService.getAllSpans(),
        createdAt: now,
        updatedAt: now,
      };
    },

    getBibleSummary(): BibleSummary {
      return {
        id: projectId,
        characters: characterService.getAllSummaries(),
        locations: locationService.getAllSummaries(),
        factions: factionService.getAllSummaries(),
        worldRules: worldRuleService.getAllSummaries(),
        plotThreads: plotThreadService.getAllSummaries(),
        timelineEvents: timelineService.getAllEventSummaries(),
      };
    },

    searchAll(
      query: string
    ): Array<{ type: EntityRef['type']; id: string; name: string; match: string }> {
      const results: Array<{ type: EntityRef['type']; id: string; name: string; match: string }> =
        [];
      const lowerQuery = query.toLowerCase();

      // Search characters
      for (const char of characterService.search(query)) {
        let match = char.name;
        if (char.description.toLowerCase().includes(lowerQuery)) {
          match = char.description.substring(0, 100);
        }
        results.push({ type: 'character', id: char.id, name: char.name, match });
      }

      // Search locations
      for (const loc of locationService.search(query)) {
        let match = loc.name;
        if (loc.description.toLowerCase().includes(lowerQuery)) {
          match = loc.description.substring(0, 100);
        }
        results.push({ type: 'location', id: loc.id, name: loc.name, match });
      }

      // Search factions
      for (const faction of factionService.search(query)) {
        let match = faction.name;
        if (faction.description.toLowerCase().includes(lowerQuery)) {
          match = faction.description.substring(0, 100);
        }
        results.push({ type: 'faction', id: faction.id, name: faction.name, match });
      }

      // Search world rules
      for (const rule of worldRuleService.search(query)) {
        let match = rule.name;
        if (rule.rule.toLowerCase().includes(lowerQuery)) {
          match = rule.rule.substring(0, 100);
        }
        results.push({ type: 'world-rule', id: rule.id, name: rule.name, match });
      }

      // Search plot threads
      for (const thread of plotThreadService.search(query)) {
        let match = thread.name;
        if (thread.description.toLowerCase().includes(lowerQuery)) {
          match = thread.description.substring(0, 100);
        }
        results.push({ type: 'plot-thread', id: thread.id, name: thread.name, match });
      }

      // Search timeline events
      for (const event of timelineService.searchEvents(query)) {
        let match = event.name;
        if (event.description.toLowerCase().includes(lowerQuery)) {
          match = event.description.substring(0, 100);
        }
        results.push({ type: 'timeline-event', id: event.id, name: event.name, match });
      }

      return results;
    },

    getEntity(ref: EntityRef): unknown | undefined {
      switch (ref.type) {
        case 'character':
          return characterService.get(ref.id);
        case 'location':
          return locationService.get(ref.id);
        case 'faction':
          return factionService.get(ref.id);
        case 'world-rule':
          return worldRuleService.get(ref.id);
        case 'plot-thread':
          return plotThreadService.get(ref.id);
        case 'timeline-event':
          return timelineService.getEvent(ref.id);
        default:
          return undefined;
      }
    },

    getReferencingEntities(entityId: string, entityType: EntityRef['type']): EntityRef[] {
      return crossRefRepo.findReferencingEntities(projectId, entityId, entityType);
    },

    getReferencedEntities(entityId: string, entityType: EntityRef['type']): EntityRef[] {
      return crossRefRepo.findReferencedEntities(projectId, entityId, entityType);
    },

    updateContentReferences(
      contentId: string,
      references: Array<{ targetId: string; targetType: EntityRef['type']; context?: string }>
    ): void {
      crossRefRepo.replaceSourceReferences(projectId, contentId, 'content', references);
    },

    getStats(): {
      characters: number;
      locations: number;
      factions: number;
      worldRules: number;
      plotThreads: number;
      timelineEvents: number;
      timelineSpans: number;
      crossReferences: number;
    } {
      return {
        characters: characterService.getAll().length,
        locations: locationService.getAll().length,
        factions: factionService.getAll().length,
        worldRules: worldRuleService.getAll().length,
        plotThreads: plotThreadService.getAll().length,
        timelineEvents: timelineService.getAllEvents().length,
        timelineSpans: timelineService.getAllSpans().length,
        crossReferences: crossRefRepo.findByProject(projectId).length,
      };
    },
  };
}

/**
 * Create bible service from existing project repositories
 */
export function createBibleServiceFromRepositories(
  projectId: string,
  repos: ProjectRepositories,
  db: Database.Database,
  drizzleDb: DrizzleDB
): BibleService {
  const crossRefRepo = createCrossReferenceRepository(db, drizzleDb);

  const characterService = createCharacterService(projectId, repos.characters);
  const locationService = createLocationService(projectId, repos.locations);
  const factionService = createFactionService(projectId, repos.factions);
  const worldRuleService = createWorldRuleService(projectId, repos.worldRules);
  const plotThreadService = createPlotThreadService(projectId, repos.plotThreads);
  const timelineService = createTimelineService(
    projectId,
    repos.timelineEvents,
    repos.timelineSpans
  );
  const graphService = createRelationshipGraphService(
    characterService,
    locationService,
    factionService,
    plotThreadService,
    timelineService
  );

  return {
    characters: characterService,
    locations: locationService,
    factions: factionService,
    worldRules: worldRuleService,
    plotThreads: plotThreadService,
    timeline: timelineService,
    crossRefs: crossRefRepo,
    graph: graphService,

    getBible(): Bible {
      const now = nowTimestamp();
      return {
        id: projectId,
        characters: characterService.getAll(),
        locations: locationService.getAll(),
        factions: factionService.getAll(),
        worldRules: worldRuleService.getAll(),
        plotThreads: plotThreadService.getAll(),
        timelineEvents: timelineService.getAllEvents(),
        timelineSpans: timelineService.getAllSpans(),
        createdAt: now,
        updatedAt: now,
      };
    },

    getBibleSummary(): BibleSummary {
      return {
        id: projectId,
        characters: characterService.getAllSummaries(),
        locations: locationService.getAllSummaries(),
        factions: factionService.getAllSummaries(),
        worldRules: worldRuleService.getAllSummaries(),
        plotThreads: plotThreadService.getAllSummaries(),
        timelineEvents: timelineService.getAllEventSummaries(),
      };
    },

    searchAll(
      query: string
    ): Array<{ type: EntityRef['type']; id: string; name: string; match: string }> {
      const results: Array<{ type: EntityRef['type']; id: string; name: string; match: string }> =
        [];
      const lowerQuery = query.toLowerCase();

      for (const char of characterService.search(query)) {
        let match = char.name;
        if (char.description.toLowerCase().includes(lowerQuery)) {
          match = char.description.substring(0, 100);
        }
        results.push({ type: 'character', id: char.id, name: char.name, match });
      }

      for (const loc of locationService.search(query)) {
        let match = loc.name;
        if (loc.description.toLowerCase().includes(lowerQuery)) {
          match = loc.description.substring(0, 100);
        }
        results.push({ type: 'location', id: loc.id, name: loc.name, match });
      }

      for (const faction of factionService.search(query)) {
        let match = faction.name;
        if (faction.description.toLowerCase().includes(lowerQuery)) {
          match = faction.description.substring(0, 100);
        }
        results.push({ type: 'faction', id: faction.id, name: faction.name, match });
      }

      for (const rule of worldRuleService.search(query)) {
        let match = rule.name;
        if (rule.rule.toLowerCase().includes(lowerQuery)) {
          match = rule.rule.substring(0, 100);
        }
        results.push({ type: 'world-rule', id: rule.id, name: rule.name, match });
      }

      for (const thread of plotThreadService.search(query)) {
        let match = thread.name;
        if (thread.description.toLowerCase().includes(lowerQuery)) {
          match = thread.description.substring(0, 100);
        }
        results.push({ type: 'plot-thread', id: thread.id, name: thread.name, match });
      }

      for (const event of timelineService.searchEvents(query)) {
        let match = event.name;
        if (event.description.toLowerCase().includes(lowerQuery)) {
          match = event.description.substring(0, 100);
        }
        results.push({ type: 'timeline-event', id: event.id, name: event.name, match });
      }

      return results;
    },

    getEntity(ref: EntityRef): unknown | undefined {
      switch (ref.type) {
        case 'character':
          return characterService.get(ref.id);
        case 'location':
          return locationService.get(ref.id);
        case 'faction':
          return factionService.get(ref.id);
        case 'world-rule':
          return worldRuleService.get(ref.id);
        case 'plot-thread':
          return plotThreadService.get(ref.id);
        case 'timeline-event':
          return timelineService.getEvent(ref.id);
        default:
          return undefined;
      }
    },

    getReferencingEntities(entityId: string, entityType: EntityRef['type']): EntityRef[] {
      return crossRefRepo.findReferencingEntities(projectId, entityId, entityType);
    },

    getReferencedEntities(entityId: string, entityType: EntityRef['type']): EntityRef[] {
      return crossRefRepo.findReferencedEntities(projectId, entityId, entityType);
    },

    updateContentReferences(
      contentId: string,
      references: Array<{ targetId: string; targetType: EntityRef['type']; context?: string }>
    ): void {
      crossRefRepo.replaceSourceReferences(projectId, contentId, 'content', references);
    },

    getStats(): {
      characters: number;
      locations: number;
      factions: number;
      worldRules: number;
      plotThreads: number;
      timelineEvents: number;
      timelineSpans: number;
      crossReferences: number;
    } {
      return {
        characters: characterService.getAll().length,
        locations: locationService.getAll().length,
        factions: factionService.getAll().length,
        worldRules: worldRuleService.getAll().length,
        plotThreads: plotThreadService.getAll().length,
        timelineEvents: timelineService.getAllEvents().length,
        timelineSpans: timelineService.getAllSpans().length,
        crossReferences: crossRefRepo.findByProject(projectId).length,
      };
    },
  };
}
