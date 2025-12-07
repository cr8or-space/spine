import { describe, expect, it } from 'vitest';

import type { Character, Faction, Location, PlotThread, TimelineEvent, WorldRule } from '@repo/types';

import {
  extractCharacterConstraints,
  extractLocationConstraints,
  extractFactionConstraints,
  extractWorldRuleConstraints,
  extractPlotThreadConstraints,
  extractTimelineConstraints,
  extractAllConstraints,
  fitConstraintsInBudget,
  formatConstraints,
} from './constraints';

// Test fixtures
const createCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'char-1',
  name: 'Elena',
  aliases: [],
  description: 'A brave warrior.',
  traits: [
    { category: 'personality', name: 'Brave', description: 'Very brave' },
    { category: 'personality', name: 'Loyal', description: 'Extremely loyal' },
  ],
  relationships: [
    {
      targetId: 'char-2',
      type: 'friend',
      description: 'Best friends',
      intensity: 90,
      mutual: true,
    },
  ],
  voiceSamples: ['For honor and glory!'],
  appearances: [],
  role: 'protagonist',
  status: 'active',
  arc: {
    type: 'redemption',
    startingPoint: 'Fallen hero',
    destination: 'Redeemed champion',
    progress: 40,
    milestones: [],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createLocation = (overrides: Partial<Location> = {}): Location => ({
  id: 'loc-1',
  name: 'Shadowkeep',
  aliases: [],
  description: 'A dark fortress.',
  type: 'building',
  relations: [],
  features: [
    {
      name: 'Hidden Passage',
      description: 'A secret tunnel to the dungeons',
      significance: 'plot-relevant',
    },
  ],
  associatedCharacters: [],
  atmosphere: 'Oppressive and foreboding, with shadows that seem to move.',
  status: 'restricted',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createFaction = (overrides: Partial<Faction> = {}): Faction => ({
  id: 'fac-1',
  name: 'The Shadow Council',
  aliases: [],
  description: 'A secret organization.',
  type: 'secret-society',
  ideology: 'Power through knowledge and secrecy.',
  goals: ['Control information'],
  ranks: [],
  members: [],
  relations: [
    {
      targetId: 'fac-2',
      type: 'hostile',
      description: 'Ancient enemies',
      public: false,
    },
  ],
  locations: [],
  status: 'underground',
  influence: 'major',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createWorldRule = (overrides: Partial<WorldRule> = {}): WorldRule => ({
  id: 'rule-1',
  name: 'Blood Magic Ban',
  description: 'Blood magic is forbidden.',
  category: 'magic',
  rule: 'Blood magic corrupts the user and is punishable by death.',
  exceptions: [
    {
      condition: 'Royal decree in times of war',
      effect: 'Temporary sanctioned use',
    },
  ],
  consequences: 'Execution by the Mage Council',
  publicKnowledge: true,
  relatedRules: [],
  priority: 90,
  established: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createPlotThread = (overrides: Partial<PlotThread> = {}): PlotThread => ({
  id: 'thread-1',
  name: 'The Lost Prince',
  description: 'Finding the missing heir to the throne.',
  type: 'main-plot',
  status: 'active',
  scope: 'book',
  priority: 95,
  involvedCharacters: [],
  relatedLocations: [],
  promises: [
    {
      id: 'promise-1',
      description: 'The prince will be found by the end of the arc',
      madeAt: { contentId: 'content-1', chapterNumber: 5 },
      expectedPayoff: 'medium-term',
      status: 'pending',
    },
  ],
  touches: [],
  childThreads: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createTimelineEvent = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: 'event-1',
  name: 'The King\'s Assassination',
  description: 'The king died under mysterious circumstances.',
  position: { approximate: false, chapterNumber: 1 },
  type: 'current',
  significance: 'critical',
  involvedCharacters: [],
  locations: [],
  relatedThreads: [],
  causes: [],
  effects: [],
  revealed: true,
  contentRefs: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('extractCharacterConstraints', () => {
  it('extracts status constraint for non-active characters', () => {
    const deceased = createCharacter({ status: 'deceased', name: 'Ghost' });
    const constraints = extractCharacterConstraints(deceased);

    const statusConstraint = constraints.find((c) => c.type === 'fact' && c.statement.includes('deceased'));
    expect(statusConstraint).toBeDefined();
    expect(statusConstraint?.critical).toBe(true);
    expect(statusConstraint?.statement).toContain('Ghost');
  });

  it('does not extract status constraint for active characters', () => {
    const active = createCharacter({ status: 'active' });
    const constraints = extractCharacterConstraints(active);

    const statusConstraint = constraints.find(
      (c) => c.type === 'fact' && c.statement.includes('currently active')
    );
    expect(statusConstraint).toBeUndefined();
  });

  it('extracts voice constraint from voice samples', () => {
    const character = createCharacter();
    const constraints = extractCharacterConstraints(character);

    const voiceConstraint = constraints.find((c) => c.type === 'voice');
    expect(voiceConstraint).toBeDefined();
    expect(voiceConstraint?.statement).toContain('For honor and glory!');
  });

  it('extracts personality trait constraint', () => {
    const character = createCharacter();
    const constraints = extractCharacterConstraints(character);

    const traitConstraint = constraints.find(
      (c) => c.type === 'fact' && c.statement.includes('personality traits')
    );
    expect(traitConstraint).toBeDefined();
    expect(traitConstraint?.statement).toContain('brave');
    expect(traitConstraint?.statement).toContain('loyal');
  });

  it('extracts intense relationship constraint', () => {
    const character = createCharacter();
    const constraints = extractCharacterConstraints(character);

    const relConstraint = constraints.find((c) => c.type === 'relationship');
    expect(relConstraint).toBeDefined();
    expect(relConstraint?.statement).toContain('extremely close');
  });

  it('extracts arc constraint', () => {
    const character = createCharacter();
    const constraints = extractCharacterConstraints(character);

    const arcConstraint = constraints.find((c) => c.statement.includes('redemption arc'));
    expect(arcConstraint).toBeDefined();
    expect(arcConstraint?.statement).toContain('40%');
  });
});

describe('extractLocationConstraints', () => {
  it('extracts status constraint for non-accessible locations', () => {
    const restricted = createLocation({ status: 'restricted' });
    const constraints = extractLocationConstraints(restricted);

    const statusConstraint = constraints.find((c) => c.statement.includes('restricted'));
    expect(statusConstraint).toBeDefined();
  });

  it('extracts critical constraint for destroyed locations', () => {
    const destroyed = createLocation({ status: 'destroyed', name: 'Ruins' });
    const constraints = extractLocationConstraints(destroyed);

    const statusConstraint = constraints.find((c) => c.statement.includes('destroyed'));
    expect(statusConstraint?.critical).toBe(true);
  });

  it('extracts atmosphere constraint', () => {
    const location = createLocation();
    const constraints = extractLocationConstraints(location);

    const atmosphereConstraint = constraints.find((c) => c.statement.includes('atmosphere'));
    expect(atmosphereConstraint).toBeDefined();
    expect(atmosphereConstraint?.statement).toContain('foreboding');
  });

  it('extracts plot-relevant feature constraints', () => {
    const location = createLocation();
    const constraints = extractLocationConstraints(location);

    const featureConstraint = constraints.find((c) => c.statement.includes('Hidden Passage'));
    expect(featureConstraint).toBeDefined();
  });
});

describe('extractFactionConstraints', () => {
  it('extracts status constraint for non-active factions', () => {
    const faction = createFaction({ status: 'underground' });
    const constraints = extractFactionConstraints(faction);

    const statusConstraint = constraints.find((c) => c.statement.includes('underground'));
    expect(statusConstraint).toBeDefined();
  });

  it('extracts ideology constraint', () => {
    const faction = createFaction();
    const constraints = extractFactionConstraints(faction);

    const ideologyConstraint = constraints.find((c) => c.statement.includes('Power through knowledge'));
    expect(ideologyConstraint).toBeDefined();
  });

  it('extracts hostile relationship constraint', () => {
    const faction = createFaction();
    const constraints = extractFactionConstraints(faction);

    const relConstraint = constraints.find((c) => c.type === 'relationship');
    expect(relConstraint).toBeDefined();
    expect(relConstraint?.statement).toContain('enemies');
    expect(relConstraint?.statement).toContain('secretly');
  });
});

describe('extractWorldRuleConstraints', () => {
  it('extracts main rule constraint', () => {
    const rule = createWorldRule();
    const constraints = extractWorldRuleConstraints(rule);

    const mainConstraint = constraints.find((c) => c.statement.includes('WORLD RULE'));
    expect(mainConstraint).toBeDefined();
    expect(mainConstraint?.type).toBe('rule');
    expect(mainConstraint?.priority).toBe(90);
    expect(mainConstraint?.critical).toBe(true); // Established rule
  });

  it('extracts consequences constraint', () => {
    const rule = createWorldRule();
    const constraints = extractWorldRuleConstraints(rule);

    const consequenceConstraint = constraints.find((c) => c.statement.includes('Execution'));
    expect(consequenceConstraint).toBeDefined();
  });

  it('extracts exception constraints', () => {
    const rule = createWorldRule();
    const constraints = extractWorldRuleConstraints(rule);

    const exceptionConstraint = constraints.find((c) => c.statement.includes('Exception'));
    expect(exceptionConstraint).toBeDefined();
    expect(exceptionConstraint?.statement).toContain('Royal decree');
  });
});

describe('extractPlotThreadConstraints', () => {
  it('extracts active thread constraint', () => {
    const thread = createPlotThread();
    const constraints = extractPlotThreadConstraints(thread);

    const threadConstraint = constraints.find((c) => c.statement.includes('Active plot thread'));
    expect(threadConstraint).toBeDefined();
    expect(threadConstraint?.priority).toBe(95);
    expect(threadConstraint?.critical).toBe(true); // main-plot
  });

  it('does not extract constraint for inactive threads', () => {
    const thread = createPlotThread({ status: 'dormant' });
    const constraints = extractPlotThreadConstraints(thread);

    const activeConstraint = constraints.find((c) => c.statement.includes('Active plot thread'));
    expect(activeConstraint).toBeUndefined();
  });

  it('extracts pending promise constraints', () => {
    const thread = createPlotThread();
    const constraints = extractPlotThreadConstraints(thread);

    const promiseConstraint = constraints.find((c) => c.statement.includes('Narrative promise'));
    expect(promiseConstraint).toBeDefined();
    expect(promiseConstraint?.statement).toContain('prince will be found');
  });
});

describe('extractTimelineConstraints', () => {
  it('extracts constraints from major events', () => {
    const events = [createTimelineEvent()];
    const constraints = extractTimelineConstraints(events);

    const eventConstraint = constraints.find((c) => c.type === 'timeline');
    expect(eventConstraint).toBeDefined();
    expect(eventConstraint?.statement).toContain('Assassination');
    expect(eventConstraint?.critical).toBe(true); // critical significance
  });

  it('filters out minor events', () => {
    const events = [
      createTimelineEvent({ significance: 'minor', name: 'Minor event' }),
    ];
    const constraints = extractTimelineConstraints(events);

    expect(constraints).toHaveLength(0);
  });
});

describe('extractAllConstraints', () => {
  it('extracts constraints from all entity types', () => {
    const entities = {
      characters: [createCharacter()],
      locations: [createLocation()],
      factions: [createFaction()],
      worldRules: [createWorldRule()],
      plotThreads: [createPlotThread()],
      timelineEvents: [createTimelineEvent()],
    };

    const constraints = extractAllConstraints(entities);

    // Should have constraints from all types
    expect(constraints.some((c) => c.sourceType === 'character')).toBe(true);
    expect(constraints.some((c) => c.sourceType === 'location')).toBe(true);
    expect(constraints.some((c) => c.sourceType === 'faction')).toBe(true);
    expect(constraints.some((c) => c.sourceType === 'worldRule')).toBe(true);
    expect(constraints.some((c) => c.sourceType === 'plotThread')).toBe(true);
    expect(constraints.some((c) => c.sourceType === 'timeline')).toBe(true);
  });

  it('sorts constraints by priority and critical flag', () => {
    const entities = {
      characters: [createCharacter({ status: 'deceased' })], // Critical
      locations: [],
      factions: [],
      worldRules: [createWorldRule({ priority: 50 })], // Lower priority
      plotThreads: [],
    };

    const constraints = extractAllConstraints(entities);

    // Critical constraints should come first
    const firstCritical = constraints.findIndex((c) => c.critical);
    const firstNonCritical = constraints.findIndex((c) => !c.critical);

    if (firstCritical !== -1 && firstNonCritical !== -1) {
      expect(firstCritical).toBeLessThan(firstNonCritical);
    }
  });
});

describe('fitConstraintsInBudget', () => {
  it('returns all constraints when under budget', () => {
    const constraints = extractAllConstraints({
      characters: [createCharacter()],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
    });

    const fitted = fitConstraintsInBudget(constraints, 10000);

    expect(fitted.length).toBe(constraints.length);
  });

  it('trims constraints to fit budget', () => {
    const entities = {
      characters: [createCharacter()],
      locations: [createLocation()],
      factions: [createFaction()],
      worldRules: [createWorldRule()],
      plotThreads: [createPlotThread()],
    };

    const constraints = extractAllConstraints(entities);
    const fitted = fitConstraintsInBudget(constraints, 100); // Very small budget

    expect(fitted.length).toBeLessThan(constraints.length);
  });

  it('always includes critical constraints', () => {
    const entities = {
      characters: [createCharacter({ status: 'deceased' })],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
    };

    const constraints = extractAllConstraints(entities);
    const fitted = fitConstraintsInBudget(constraints, 1); // Impossible budget

    // Critical constraint should still be included
    expect(fitted.some((c) => c.critical)).toBe(true);
  });
});

describe('formatConstraints', () => {
  it('returns empty string for empty constraints', () => {
    const result = formatConstraints([]);
    expect(result).toBe('');
  });

  it('groups constraints by type', () => {
    const constraints = extractAllConstraints({
      characters: [createCharacter()],
      locations: [],
      factions: [],
      worldRules: [createWorldRule()],
      plotThreads: [],
    });

    const formatted = formatConstraints(constraints);

    expect(formatted).toContain('## Constraints');
    expect(formatted).toContain('Rules');
  });

  it('marks critical constraints with warning emoji', () => {
    const entities = {
      characters: [createCharacter({ status: 'deceased' })],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
    };

    const constraints = extractAllConstraints(entities);
    const formatted = formatConstraints(constraints);

    expect(formatted).toContain('⚠️');
  });
});
