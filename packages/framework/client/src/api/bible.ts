/**
 * Bible API methods
 */

import type { SpineClient } from '../client';
import type {
  Bible,
  Character,
  Location,
  Faction,
  WorldRule,
  PlotThread,
  TimelineEvent
} from '@repo/serial-types';

export interface BibleApi {
  get(projectId: string): Promise<Bible>;
  character: EntityApi<Character, CharacterCreate, CharacterUpdate>;
  location: EntityApi<Location, LocationCreate, LocationUpdate>;
  faction: EntityApi<Faction, FactionCreate, FactionUpdate>;
  worldRule: EntityApi<WorldRule, WorldRuleCreate, WorldRuleUpdate>;
  plotThread: EntityApi<PlotThread, PlotThreadCreate, PlotThreadUpdate>;
  timelineEvent: EntityApi<TimelineEvent, TimelineEventCreate, TimelineEventUpdate>;
}

interface EntityApi<T, TCreate, TUpdate> {
  list(projectId: string): Promise<T[]>;
  get(projectId: string, id: string): Promise<T>;
  create(projectId: string, data: TCreate): Promise<T>;
  update(projectId: string, id: string, data: TUpdate): Promise<T>;
  delete(projectId: string, id: string): Promise<{ success: boolean }>;
}

// Create types
export interface CharacterCreate {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  description?: string;
  traits?: string[];
  goals?: string[];
  backstory?: string;
  voiceNotes?: string;
  arcSummary?: string;
}

export interface LocationCreate {
  name: string;
  type: 'city' | 'building' | 'region' | 'landmark' | 'other';
  description?: string;
  atmosphere?: string;
  significance?: string;
  parentLocationId?: string;
}

export interface FactionCreate {
  name: string;
  type: 'organization' | 'government' | 'religion' | 'criminal' | 'military' | 'other';
  description?: string;
  goals?: string[];
  values?: string[];
  structure?: string;
}

export interface WorldRuleCreate {
  name: string;
  category: 'magic' | 'physics' | 'social' | 'economic' | 'other';
  description?: string;
  constraints?: string[];
  exceptions?: string[];
}

export interface PlotThreadCreate {
  name: string;
  type: 'main' | 'subplot' | 'character_arc' | 'mystery' | 'romance';
  description?: string;
  status?: 'setup' | 'active' | 'climax' | 'resolved';
  startChapter?: number;
  endChapter?: number;
}

export interface TimelineEventCreate {
  name: string;
  date: string;
  description?: string;
  significance?: 'major' | 'moderate' | 'minor';
  relatedCharacterIds?: string[];
  relatedLocationIds?: string[];
}

// Update types (all fields optional)
export type CharacterUpdate = Partial<CharacterCreate>;
export type LocationUpdate = Partial<LocationCreate> & { parentLocationId?: string | null };
export type FactionUpdate = Partial<FactionCreate>;
export type WorldRuleUpdate = Partial<WorldRuleCreate>;
export type PlotThreadUpdate = Partial<PlotThreadCreate> & { endChapter?: number | null };
export type TimelineEventUpdate = Partial<TimelineEventCreate>;

function createEntityApi<T, TCreate, TUpdate>(
  client: SpineClient,
  entityType: string
): EntityApi<T, TCreate, TUpdate> {
  return {
    async list(projectId: string): Promise<T[]> {
      return client.request<T[]>(`bible.${entityType}.list`, { projectId });
    },

    async get(projectId: string, id: string): Promise<T> {
      return client.request<T>(`bible.${entityType}.get`, { projectId, id });
    },

    async create(projectId: string, data: TCreate): Promise<T> {
      return client.request<T>(`bible.${entityType}.create`, { projectId, data });
    },

    async update(projectId: string, id: string, data: TUpdate): Promise<T> {
      return client.request<T>(`bible.${entityType}.update`, { projectId, id, data });
    },

    async delete(projectId: string, id: string): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>(`bible.${entityType}.delete`, { projectId, id });
    }
  };
}

export function createBibleApi(client: SpineClient): BibleApi {
  return {
    async get(projectId: string): Promise<Bible> {
      return client.request<Bible>('bible.get', { projectId });
    },

    character: createEntityApi<Character, CharacterCreate, CharacterUpdate>(client, 'character'),
    location: createEntityApi<Location, LocationCreate, LocationUpdate>(client, 'location'),
    faction: createEntityApi<Faction, FactionCreate, FactionUpdate>(client, 'faction'),
    worldRule: createEntityApi<WorldRule, WorldRuleCreate, WorldRuleUpdate>(client, 'worldRule'),
    plotThread: createEntityApi<PlotThread, PlotThreadCreate, PlotThreadUpdate>(client, 'plotThread'),
    timelineEvent: createEntityApi<TimelineEvent, TimelineEventCreate, TimelineEventUpdate>(client, 'timelineEvent')
  };
}
