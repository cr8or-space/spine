/**
 * Bible API handlers - Characters, Locations, Factions, WorldRules, PlotThreads, TimelineEvents
 *
 * Note: Uses simplified request/response types that map to the actual domain types.
 * The handlers translate between the WebSocket API format and internal domain types.
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import {
  API_METHODS,
  BibleGetParamsSchema,
  type BibleGetParams,
  BibleEntityListParamsSchema,
  type BibleEntityListParams,
  BibleEntityGetParamsSchema,
  type BibleEntityGetParams,
  BibleEntityDeleteParamsSchema,
  type BibleEntityDeleteParams
} from '../protocol';
import type {
  Bible,
  Character,
  Location,
  Faction,
  WorldRule,
  PlotThread,
  TimelineEvent
} from '@repo/types';

/**
 * Register bible handlers on the router.
 */
export function registerBibleHandlers(router: Router, services: Services): void {
  // bible.get - Get full bible for a project
  router.register<BibleGetParams, Bible>(
    API_METHODS.BIBLE_GET,
    (params) => {
      const bible = services.project.loadBible(params.projectId);
      if (!bible) {
        throw ApiError.projectNotFound(params.projectId);
      }
      return bible;
    },
    BibleGetParamsSchema
  );

  // ============ CHARACTER HANDLERS ============

  router.register<BibleEntityListParams, Character[]>(
    API_METHODS.BIBLE_CHARACTER_LIST,
    (params) => {
      const bible = services.bible(params.projectId);
      return bible.characters.getAll();
    },
    BibleEntityListParamsSchema
  );

  router.register<BibleEntityGetParams, Character>(
    API_METHODS.BIBLE_CHARACTER_GET,
    (params) => {
      const bible = services.bible(params.projectId);
      const character = bible.characters.get(params.id);
      if (!character) {
        throw ApiError.entityNotFound('Character', params.id);
      }
      return character;
    },
    BibleEntityGetParamsSchema
  );

  // Note: Character create/update handlers would need proper type mapping
  // Registering simplified versions that return the entity
  router.register<{ projectId: string; data: Record<string, unknown> }, Character>(
    API_METHODS.BIBLE_CHARACTER_CREATE,
    (params) => {
      const bible = services.bible(params.projectId);
      const data = params.data as {
        name: string;
        role: Character['role'];
        description?: string;
      };
      return bible.characters.create({
        type: 'character',
        name: data.name,
        aliases: [],
        role: data.role,
        status: 'active',
        description: data.description || '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: []
      });
    }
  );

  router.register<BibleEntityDeleteParams, { success: boolean }>(
    API_METHODS.BIBLE_CHARACTER_DELETE,
    (params) => {
      const bible = services.bible(params.projectId);
      const success = bible.characters.delete(params.id);
      return { success };
    },
    BibleEntityDeleteParamsSchema
  );

  // ============ LOCATION HANDLERS ============

  router.register<BibleEntityListParams, Location[]>(
    API_METHODS.BIBLE_LOCATION_LIST,
    (params) => {
      const bible = services.bible(params.projectId);
      return bible.locations.getAll();
    },
    BibleEntityListParamsSchema
  );

  router.register<BibleEntityGetParams, Location>(
    API_METHODS.BIBLE_LOCATION_GET,
    (params) => {
      const bible = services.bible(params.projectId);
      const location = bible.locations.get(params.id);
      if (!location) {
        throw ApiError.entityNotFound('Location', params.id);
      }
      return location;
    },
    BibleEntityGetParamsSchema
  );

  router.register<BibleEntityDeleteParams, { success: boolean }>(
    API_METHODS.BIBLE_LOCATION_DELETE,
    (params) => {
      const bible = services.bible(params.projectId);
      const success = bible.locations.delete(params.id);
      return { success };
    },
    BibleEntityDeleteParamsSchema
  );

  // ============ FACTION HANDLERS ============

  router.register<BibleEntityListParams, Faction[]>(
    API_METHODS.BIBLE_FACTION_LIST,
    (params) => {
      const bible = services.bible(params.projectId);
      return bible.factions.getAll();
    },
    BibleEntityListParamsSchema
  );

  router.register<BibleEntityGetParams, Faction>(
    API_METHODS.BIBLE_FACTION_GET,
    (params) => {
      const bible = services.bible(params.projectId);
      const faction = bible.factions.get(params.id);
      if (!faction) {
        throw ApiError.entityNotFound('Faction', params.id);
      }
      return faction;
    },
    BibleEntityGetParamsSchema
  );

  router.register<BibleEntityDeleteParams, { success: boolean }>(
    API_METHODS.BIBLE_FACTION_DELETE,
    (params) => {
      const bible = services.bible(params.projectId);
      const success = bible.factions.delete(params.id);
      return { success };
    },
    BibleEntityDeleteParamsSchema
  );

  // ============ WORLD RULE HANDLERS ============

  router.register<BibleEntityListParams, WorldRule[]>(
    API_METHODS.BIBLE_WORLD_RULE_LIST,
    (params) => {
      const bible = services.bible(params.projectId);
      return bible.worldRules.getAll();
    },
    BibleEntityListParamsSchema
  );

  router.register<BibleEntityGetParams, WorldRule>(
    API_METHODS.BIBLE_WORLD_RULE_GET,
    (params) => {
      const bible = services.bible(params.projectId);
      const rule = bible.worldRules.get(params.id);
      if (!rule) {
        throw ApiError.entityNotFound('WorldRule', params.id);
      }
      return rule;
    },
    BibleEntityGetParamsSchema
  );

  router.register<BibleEntityDeleteParams, { success: boolean }>(
    API_METHODS.BIBLE_WORLD_RULE_DELETE,
    (params) => {
      const bible = services.bible(params.projectId);
      const success = bible.worldRules.delete(params.id);
      return { success };
    },
    BibleEntityDeleteParamsSchema
  );

  // ============ PLOT THREAD HANDLERS ============

  router.register<BibleEntityListParams, PlotThread[]>(
    API_METHODS.BIBLE_PLOT_THREAD_LIST,
    (params) => {
      const bible = services.bible(params.projectId);
      return bible.plotThreads.getAll();
    },
    BibleEntityListParamsSchema
  );

  router.register<BibleEntityGetParams, PlotThread>(
    API_METHODS.BIBLE_PLOT_THREAD_GET,
    (params) => {
      const bible = services.bible(params.projectId);
      const thread = bible.plotThreads.get(params.id);
      if (!thread) {
        throw ApiError.entityNotFound('PlotThread', params.id);
      }
      return thread;
    },
    BibleEntityGetParamsSchema
  );

  router.register<BibleEntityDeleteParams, { success: boolean }>(
    API_METHODS.BIBLE_PLOT_THREAD_DELETE,
    (params) => {
      const bible = services.bible(params.projectId);
      const success = bible.plotThreads.delete(params.id);
      return { success };
    },
    BibleEntityDeleteParamsSchema
  );

  // ============ TIMELINE EVENT HANDLERS ============

  router.register<BibleEntityListParams, TimelineEvent[]>(
    API_METHODS.BIBLE_TIMELINE_EVENT_LIST,
    (params) => {
      const bible = services.bible(params.projectId);
      return bible.timeline.getAllEvents();
    },
    BibleEntityListParamsSchema
  );

  router.register<BibleEntityGetParams, TimelineEvent>(
    API_METHODS.BIBLE_TIMELINE_EVENT_GET,
    (params) => {
      const bible = services.bible(params.projectId);
      const event = bible.timeline.getEvent(params.id);
      if (!event) {
        throw ApiError.entityNotFound('TimelineEvent', params.id);
      }
      return event;
    },
    BibleEntityGetParamsSchema
  );

  router.register<BibleEntityDeleteParams, { success: boolean }>(
    API_METHODS.BIBLE_TIMELINE_EVENT_DELETE,
    (params) => {
      const bible = services.bible(params.projectId);
      const success = bible.timeline.deleteEvent(params.id);
      return { success };
    },
    BibleEntityDeleteParamsSchema
  );
}
