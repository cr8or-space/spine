import { describe, expect, it } from 'vitest';

import type { Character, Faction, Location, PlotThread, Structure, WorldRule } from '@repo/types';

import {
  scoreCharacter,
  scoreLocation,
  scoreFaction,
  scoreWorldRule,
  scorePlotThread,
  scoreAllEntities,
  filterByRelevance,
  topNByRelevance,
  toEntityReference,
} from './relevance';
import type { RelevanceContext } from './types';

// Test fixtures
const createCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'char-1',
  name: 'Test Character',
  aliases: ['TC', 'Testy'],
  description: 'A test character for unit tests.',
  traits: [{ category: 'personality', name: 'Brave', description: 'Very brave' }],
  relationships: [],
  voiceSamples: [],
  appearances: [],
  role: 'supporting',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createLocation = (overrides: Partial<Location> = {}): Location => ({
  id: 'loc-1',
  name: 'Test Location',
  aliases: ['TL'],
  description: 'A test location.',
  type: 'city',
  relations: [],
  features: [],
  associatedCharacters: [],
  status: 'accessible',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createFaction = (overrides: Partial<Faction> = {}): Faction => ({
  id: 'fac-1',
  name: 'Test Faction',
  aliases: ['TF'],
  description: 'A test faction.',
  type: 'guild',
  goals: ['Test goal'],
  ranks: [],
  members: [],
  relations: [],
  locations: [],
  status: 'active',
  influence: 'moderate',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createWorldRule = (overrides: Partial<WorldRule> = {}): WorldRule => ({
  id: 'rule-1',
  name: 'Test Rule',
  description: 'A test world rule.',
  category: 'magic',
  rule: 'Magic requires concentration.',
  exceptions: [],
  publicKnowledge: true,
  relatedRules: [],
  priority: 50,
  established: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createPlotThread = (overrides: Partial<PlotThread> = {}): PlotThread => ({
  id: 'thread-1',
  name: 'Test Thread',
  description: 'A test plot thread.',
  type: 'subplot',
  status: 'active',
  scope: 'arc',
  priority: 50,
  involvedCharacters: [],
  relatedLocations: [],
  promises: [],
  touches: [],
  childThreads: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createStructure = (overrides: Partial<Structure> = {}): Structure => ({
  id: 'struct-1',
  type: 'chapter',
  title: 'Test Chapter',
  summary: 'A test chapter about Test Character going to Test Location.',
  beats: [{ id: 'beat-1', description: 'Test Character arrives', completed: false, order: 0 }],
  order: 0,
  children: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('scoreCharacter', () => {
  it('assigns base score by role', () => {
    const protagonist = createCharacter({ role: 'protagonist' });
    const minor = createCharacter({ role: 'minor' });

    const protScore = scoreCharacter(protagonist, {});
    const minorScore = scoreCharacter(minor, {});

    expect(protScore.score).toBeGreaterThan(minorScore.score);
    expect(protScore.entityType).toBe('character');
  });

  it('boosts score for explicit mentions', () => {
    const character = createCharacter();
    const context: RelevanceContext = {
      explicitMentions: [{ id: character.id, type: 'character', name: character.name }],
    };

    const withMention = scoreCharacter(character, context);
    const withoutMention = scoreCharacter(character, {});

    expect(withMention.score).toBeGreaterThan(withoutMention.score);
    // Score should be boosted by explicit mention
    expect(withMention.score).toBeGreaterThanOrEqual(withoutMention.score + 20);
  });

  it('boosts score when mentioned in current structure', () => {
    const character = createCharacter({ name: 'Alice' });
    const structure = createStructure({ summary: 'Alice goes to the market.' });
    const context: RelevanceContext = { currentStructure: structure };

    const withMention = scoreCharacter(character, context);
    const withoutMention = scoreCharacter(character, {});

    // Score should be boosted when mentioned in structure
    expect(withMention.score).toBeGreaterThan(withoutMention.score);
  });

  it('boosts score for active arc', () => {
    const charWithArc = createCharacter({
      arc: {
        type: 'redemption',
        startingPoint: 'Fallen hero',
        destination: 'Redeemed hero',
        progress: 50,
        milestones: [],
      },
    });
    const charWithoutArc = createCharacter();

    const withArc = scoreCharacter(charWithArc, {});
    const withoutArc = scoreCharacter(charWithoutArc, {});

    expect(withArc.score).toBeGreaterThan(withoutArc.score);
  });

  it('caps score at 100', () => {
    const protagonist = createCharacter({ role: 'protagonist', name: 'Hero' });
    const structure = createStructure({
      summary: 'Hero saves the day.',
      beats: [{ id: 'b1', description: 'Hero arrives', completed: false, order: 0 }],
      notes: 'Focus on Hero',
    });
    const context: RelevanceContext = {
      currentStructure: structure,
      explicitMentions: [{ id: protagonist.id, type: 'character', name: 'Hero' }],
      activePlotThreads: [createPlotThread({ involvedCharacters: [protagonist.id] })],
    };

    const score = scoreCharacter(protagonist, context);

    expect(score.score).toBeLessThanOrEqual(100);
  });
});

describe('scoreLocation', () => {
  it('assigns base score by status', () => {
    const accessible = createLocation({ status: 'accessible' });
    const destroyed = createLocation({ status: 'destroyed' });

    const accessibleScore = scoreLocation(accessible, {});
    const destroyedScore = scoreLocation(destroyed, {});

    expect(accessibleScore.score).toBeGreaterThan(destroyedScore.score);
  });

  it('boosts score when mentioned in structure', () => {
    const location = createLocation({ name: 'Castle' });
    const structure = createStructure({ summary: 'The party approaches the Castle.' });
    const context: RelevanceContext = { currentStructure: structure };

    const withMention = scoreLocation(location, context);
    const withoutMention = scoreLocation(location, {});

    // Score should be boosted when mentioned in structure
    expect(withMention.score).toBeGreaterThan(withoutMention.score);
  });
});

describe('scoreFaction', () => {
  it('assigns base score by influence', () => {
    const dominant = createFaction({ influence: 'dominant' });
    const negligible = createFaction({ influence: 'negligible' });

    const dominantScore = scoreFaction(dominant, {});
    const negligibleScore = scoreFaction(negligible, {});

    expect(dominantScore.score).toBeGreaterThan(negligibleScore.score);
  });
});

describe('scoreWorldRule', () => {
  it('gives higher score to established rules', () => {
    const established = createWorldRule({ established: true });
    const unestablished = createWorldRule({ established: false });

    const estScore = scoreWorldRule(established, {});
    const unestScore = scoreWorldRule(unestablished, {});

    expect(estScore.score).toBeGreaterThan(unestScore.score);
  });

  it('boosts high priority rules', () => {
    const highPriority = createWorldRule({ priority: 80 });
    const lowPriority = createWorldRule({ priority: 30 });

    const highScore = scoreWorldRule(highPriority, {});
    const lowScore = scoreWorldRule(lowPriority, {});

    expect(highScore.score).toBeGreaterThan(lowScore.score);
  });

  it('boosts magic and physics rules', () => {
    const magicRule = createWorldRule({ category: 'magic' });
    const socialRule = createWorldRule({ category: 'social' });

    const magicScore = scoreWorldRule(magicRule, {});
    const socialScore = scoreWorldRule(socialRule, {});

    expect(magicScore.score).toBeGreaterThan(socialScore.score);
  });
});

describe('scorePlotThread', () => {
  it('gives higher score to main plot threads', () => {
    const mainPlot = createPlotThread({ type: 'main-plot' });
    const subplot = createPlotThread({ type: 'subplot' });

    const mainScore = scorePlotThread(mainPlot, {});
    const subScore = scorePlotThread(subplot, {});

    expect(mainScore.score).toBeGreaterThan(subScore.score);
  });

  it('boosts active threads', () => {
    const active = createPlotThread({ status: 'active' });
    const dormant = createPlotThread({ status: 'dormant' });

    const activeScore = scorePlotThread(active, {});
    const dormantScore = scorePlotThread(dormant, {});

    expect(activeScore.score).toBeGreaterThan(dormantScore.score);
  });

  it('boosts threads with pending promises', () => {
    const withPromises = createPlotThread({
      promises: [
        {
          id: 'p1',
          description: 'Hero will save the day',
          madeAt: { contentId: 'c1' },
          expectedPayoff: 'short-term',
          status: 'pending',
        },
      ],
    });
    const withoutPromises = createPlotThread({ promises: [] });

    const withScore = scorePlotThread(withPromises, {});
    const withoutScore = scorePlotThread(withoutPromises, {});

    expect(withScore.score).toBeGreaterThan(withoutScore.score);
  });
});

describe('scoreAllEntities', () => {
  it('scores and sorts all entity types', () => {
    const entities = {
      characters: [
        createCharacter({ id: 'c1', role: 'protagonist' }),
        createCharacter({ id: 'c2', role: 'minor' }),
      ],
      locations: [createLocation()],
      factions: [createFaction()],
      worldRules: [createWorldRule()],
      plotThreads: [createPlotThread()],
    };

    const scored = scoreAllEntities(entities, {});

    // Characters should be sorted by score (protagonist first)
    expect(scored.characters[0].entity.id).toBe('c1');
    expect(scored.characters[0].score.score).toBeGreaterThan(scored.characters[1].score.score);

    // All types should be present
    expect(scored.locations).toHaveLength(1);
    expect(scored.factions).toHaveLength(1);
    expect(scored.worldRules).toHaveLength(1);
    expect(scored.plotThreads).toHaveLength(1);
  });
});

describe('filterByRelevance', () => {
  it('filters entities below threshold', () => {
    const scored = [
      { entity: { id: 'e1' }, score: { entityId: 'e1', entityType: 'character' as const, score: 80, reasons: [] } },
      { entity: { id: 'e2' }, score: { entityId: 'e2', entityType: 'character' as const, score: 40, reasons: [] } },
      { entity: { id: 'e3' }, score: { entityId: 'e3', entityType: 'character' as const, score: 20, reasons: [] } },
    ];

    const filtered = filterByRelevance(scored, 30);

    expect(filtered).toHaveLength(2);
    expect(filtered.map((e) => e.entity.id)).toEqual(['e1', 'e2']);
  });
});

describe('topNByRelevance', () => {
  it('returns top N entities', () => {
    const scored = [
      { entity: { id: 'e1' }, score: { entityId: 'e1', entityType: 'character' as const, score: 80, reasons: [] } },
      { entity: { id: 'e2' }, score: { entityId: 'e2', entityType: 'character' as const, score: 60, reasons: [] } },
      { entity: { id: 'e3' }, score: { entityId: 'e3', entityType: 'character' as const, score: 40, reasons: [] } },
    ];

    const top2 = topNByRelevance(scored, 2);

    expect(top2).toHaveLength(2);
    expect(top2.map((e) => e.entity.id)).toEqual(['e1', 'e2']);
  });
});

describe('toEntityReference', () => {
  it('creates entity reference from character', () => {
    const character = createCharacter({ id: 'char-1', name: 'Alice', aliases: ['Al'] });
    const ref = toEntityReference(character, 'character');

    expect(ref).toEqual({
      id: 'char-1',
      type: 'character',
      name: 'Alice',
      aliases: ['Al'],
    });
  });

  it('creates entity reference from world rule (no aliases)', () => {
    const rule = createWorldRule({ id: 'rule-1', name: 'Magic Rule' });
    const ref = toEntityReference(rule, 'worldRule');

    expect(ref).toEqual({
      id: 'rule-1',
      type: 'worldRule',
      name: 'Magic Rule',
      aliases: undefined,
    });
  });
});
