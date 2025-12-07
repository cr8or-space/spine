import { describe, expect, it } from 'vitest';

import type { Character, Content, Faction, Location, PlotThread, Structure, WorldRule } from '@repo/types';

import {
  summarizeCharacter,
  summarizeLocation,
  summarizeFaction,
  summarizeWorldRule,
  summarizePlotThread,
  summarizeContent,
  summarizeStructure,
  truncateContentText,
  selectEntityOrSummary,
} from './summarize';

// Test fixtures
const createCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'char-1',
  name: 'Test Character',
  aliases: ['TC', 'Testy'],
  description: 'A brave warrior from the northern lands. She has fought many battles.',
  traits: [
    { category: 'personality', name: 'Brave', description: 'Very brave in battle' },
    { category: 'physical', name: 'Tall', description: 'Stands over six feet' },
  ],
  relationships: [],
  voiceSamples: ['For honor!', 'We shall prevail.'],
  appearances: [],
  role: 'major',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createLocation = (overrides: Partial<Location> = {}): Location => ({
  id: 'loc-1',
  name: 'Crystal City',
  aliases: ['The Jewel'],
  description: 'A magnificent city built from crystalline structures. Light refracts through its towers.',
  type: 'city',
  relations: [],
  features: [],
  associatedCharacters: [],
  atmosphere: 'Ethereal and otherworldly, with prismatic light everywhere.',
  status: 'accessible',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createFaction = (overrides: Partial<Faction> = {}): Faction => ({
  id: 'fac-1',
  name: 'The Silver Order',
  aliases: ['Silvers'],
  description: 'An ancient order of knights dedicated to protecting the realm.',
  type: 'military',
  ideology: 'Honor above all else. Protect the innocent.',
  goals: ['Defend the realm', 'Maintain peace'],
  ranks: [],
  members: [],
  relations: [],
  locations: [],
  status: 'active',
  influence: 'major',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createWorldRule = (overrides: Partial<WorldRule> = {}): WorldRule => ({
  id: 'rule-1',
  name: 'Mana Conservation',
  description: 'All magic requires mana, which cannot be created or destroyed.',
  category: 'magic',
  rule: 'Magic users must draw from existing mana pools; creating mana ex nihilo is impossible.',
  exceptions: [],
  publicKnowledge: true,
  relatedRules: [],
  priority: 80,
  established: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createPlotThread = (overrides: Partial<PlotThread> = {}): PlotThread => ({
  id: 'thread-1',
  name: 'The Missing Heir',
  description: 'The rightful heir to the throne has disappeared. A search is underway.',
  type: 'main-plot',
  status: 'active',
  scope: 'book',
  priority: 90,
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
  title: 'The Arrival',
  summary: 'Our heroes arrive at Crystal City after a long journey.',
  beats: [
    { id: 'beat-1', description: 'Party enters the city gates', completed: true, order: 0 },
    { id: 'beat-2', description: 'Meet the city guard captain', completed: false, order: 1 },
  ],
  tensionTarget: 45,
  hook: { type: 'revelation', description: 'The captain reveals a secret' },
  order: 3,
  children: [],
  notes: 'Focus on world-building and character introductions.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createContent = (overrides: Partial<Content> = {}): Content => ({
  id: 'content-1',
  structureId: 'struct-1',
  currentVersion: 1,
  versions: [
    {
      version: 1,
      text: 'The sun set over the mountains. Our heroes trudged onward. They had been walking for days.',
      wordCount: 15,
      source: 'generated',
      createdAt: new Date().toISOString(),
    },
  ],
  text: 'The sun set over the mountains. Our heroes trudged onward. They had been walking for days.',
  status: 'draft',
  reviews: [],
  generationHistory: [],
  locked: false,
  chapterNumber: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('summarizeCharacter', () => {
  it('creates summary with essential fields', () => {
    const character = createCharacter();
    const summary = summarizeCharacter(character);

    expect(summary.id).toBe(character.id);
    expect(summary.name).toBe(character.name);
    expect(summary.aliases).toEqual(character.aliases);
    expect(summary.role).toBe(character.role);
    expect(summary.status).toBe(character.status);
    expect(summary.brief).toBeDefined();
  });

  it('creates brief from first sentence of description', () => {
    const character = createCharacter({
      description: 'A fierce warrior. She has won many battles.',
    });
    const summary = summarizeCharacter(character);

    expect(summary.brief).toBe('A fierce warrior.');
  });

  it('truncates very long descriptions', () => {
    const character = createCharacter({
      description: 'A'.repeat(200) + ' continues for a very long time with many details.',
    });
    const summary = summarizeCharacter(character);

    expect(summary.brief.length).toBeLessThanOrEqual(110);
  });
});

describe('summarizeLocation', () => {
  it('creates summary with essential fields', () => {
    const location = createLocation();
    const summary = summarizeLocation(location);

    expect(summary.id).toBe(location.id);
    expect(summary.name).toBe(location.name);
    expect(summary.type).toBe(location.type);
    expect(summary.brief).toBeDefined();
  });

  it('uses atmosphere for brief when description is too long', () => {
    const location = createLocation({
      description: 'A'.repeat(200) + ' very detailed description.',
      atmosphere: 'Dark and foreboding.',
    });
    const summary = summarizeLocation(location);

    expect(summary.brief).toContain('Dark and foreboding');
  });
});

describe('summarizeFaction', () => {
  it('creates summary with essential fields', () => {
    const faction = createFaction();
    const summary = summarizeFaction(faction);

    expect(summary.id).toBe(faction.id);
    expect(summary.name).toBe(faction.name);
    expect(summary.type).toBe(faction.type);
    expect(summary.influence).toBe(faction.influence);
    expect(summary.brief).toBeDefined();
  });

  it('uses ideology for brief', () => {
    const faction = createFaction({ ideology: 'Power through unity.' });
    const summary = summarizeFaction(faction);

    expect(summary.brief).toBe('Power through unity.');
  });

  it('uses first goal when no ideology', () => {
    const faction = createFaction({ ideology: undefined, goals: ['Conquer the realm'] });
    const summary = summarizeFaction(faction);

    expect(summary.brief).toContain('Conquer the realm');
  });
});

describe('summarizeWorldRule', () => {
  it('creates summary with essential fields', () => {
    const rule = createWorldRule();
    const summary = summarizeWorldRule(rule);

    expect(summary.id).toBe(rule.id);
    expect(summary.name).toBe(rule.name);
    expect(summary.category).toBe(rule.category);
    expect(summary.rule).toBe(rule.rule);
    expect(summary.priority).toBe(rule.priority);
  });
});

describe('summarizePlotThread', () => {
  it('creates summary with essential fields', () => {
    const thread = createPlotThread();
    const summary = summarizePlotThread(thread);

    expect(summary.id).toBe(thread.id);
    expect(summary.name).toBe(thread.name);
    expect(summary.type).toBe(thread.type);
    expect(summary.status).toBe(thread.status);
    expect(summary.priority).toBe(thread.priority);
    expect(summary.brief).toBeDefined();
  });
});

describe('summarizeContent', () => {
  it('creates content context with summary', () => {
    const content = createContent();
    const structure = createStructure();
    const summary = summarizeContent(content, structure);

    expect(summary.id).toBe(content.id);
    expect(summary.structureId).toBe(content.structureId);
    expect(summary.title).toBe(structure.title);
    expect(summary.chapterNumber).toBe(content.chapterNumber);
    expect(summary.summary).toBeDefined();
    expect(summary.tokenCount).toBeGreaterThan(0);
  });

  it('truncates summary to max length', () => {
    const content = createContent({
      text: 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.',
    });
    const structure = createStructure();
    const summary = summarizeContent(content, structure, { maxSummaryLength: 50 });

    expect(summary.summary.length).toBeLessThanOrEqual(53); // 50 + "..."
  });
});

describe('summarizeStructure', () => {
  it('includes title and type', () => {
    const structure = createStructure();
    const text = summarizeStructure(structure);

    expect(text).toContain('CHAPTER: The Arrival');
  });

  it('includes beats', () => {
    const structure = createStructure();
    const text = summarizeStructure(structure);

    expect(text).toContain('Beats:');
    expect(text).toContain('Party enters the city gates');
  });

  it('includes tension target', () => {
    const structure = createStructure({ tensionTarget: 75 });
    const text = summarizeStructure(structure);

    expect(text).toContain('Tension target: 75');
  });

  it('includes hook information', () => {
    const structure = createStructure();
    const text = summarizeStructure(structure);

    expect(text).toContain('Hook (revelation)');
    expect(text).toContain('captain reveals a secret');
  });

  it('includes notes', () => {
    const structure = createStructure();
    const text = summarizeStructure(structure);

    expect(text).toContain('Notes:');
    expect(text).toContain('world-building');
  });
});

describe('truncateContentText', () => {
  it('returns text unchanged if under budget', () => {
    const text = 'Short text.';
    const result = truncateContentText(text, 1000);

    expect(result).toBe(text);
  });

  it('truncates at sentence boundary when possible', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    // With 4 chars per token, 20 tokens = 80 chars
    const result = truncateContentText(text, 10);

    // Should truncate at a sentence boundary
    expect(result).toMatch(/\.($|\.\.\.)/);
  });

  it('adds ellipsis when truncating mid-sentence', () => {
    const text = 'This is one very long sentence that goes on and on without any punctuation';
    const result = truncateContentText(text, 5);

    expect(result).toContain('...');
  });
});

describe('selectEntityOrSummary', () => {
  it('selects summary when full entity exceeds budget', () => {
    const entity = createCharacter();
    const summary = summarizeCharacter(entity);

    // Very small budget that only summary can fit
    const result = selectEntityOrSummary(entity, summary, 50, false);

    expect(result.isFull).toBe(false);
  });

  it('selects full entity when preferFull is true and it fits', () => {
    const entity = createCharacter();
    const summary = summarizeCharacter(entity);

    // Large budget
    const result = selectEntityOrSummary(entity, summary, 10000, true);

    expect(result.isFull).toBe(true);
  });

  it('returns token count for selection', () => {
    const entity = createCharacter();
    const summary = summarizeCharacter(entity);

    const result = selectEntityOrSummary(entity, summary, 10000, false);

    expect(result.tokens).toBeGreaterThan(0);
  });
});
