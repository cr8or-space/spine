/**
 * Tests for character tracking data generation
 */

import { describe, it, expect, vi } from 'vitest';

import {
  generateCharacterTrackingData,
  generateAllCharacterTracking,
  generatePresenceHeatmap,
  presenceToIntensity,
  intensityToPresence,
  getCharactersWithDecliningPresence,
  getCharactersMissingRecently,
  getCharactersWithIncompleteArcs,
  getTopCharactersByPresence,
  getCharactersByPOVCount,
  type CharacterTrackingDependencies,
} from './character-tracking';
import type { Character, ContentAnalysis, Structure, CharacterTrackingData } from '@repo/serial-types';

// Create test character
function createTestCharacter(
  id: string,
  name: string,
  overrides: Partial<Character> = {}
): Character {
  const now = new Date().toISOString();
  return {
    id,
    name,
    aliases: [],
    description: `Description for ${name}`,
    traits: [],
    relationships: [],
    voiceSamples: [],
    appearances: [],
    role: 'major',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Create test structure
function createTestStructure(overrides: Partial<Structure> = {}): Structure {
  const now = new Date().toISOString();
  return {
    id: 'book-1',
    type: 'book',
    title: 'Test Book',
    summary: 'A test book',
    beats: [],
    order: 0,
    children: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Create test chapter
function createTestChapter(
  id: string,
  order: number,
  title: string = `Chapter ${order + 1}`
): Structure {
  const now = new Date().toISOString();
  return {
    id,
    type: 'chapter',
    title,
    summary: `Summary for ${title}`,
    beats: [],
    order,
    children: [],
    parentId: 'book-1',
    createdAt: now,
    updatedAt: now,
  };
}

// Create test analysis
function createTestAnalysis(
  contentId: string,
  appearances: Array<{ characterId: string; type: 'mention' | 'scene' | 'pov'; dialogueLines?: number }>
): ContentAnalysis {
  return {
    id: `analysis-${contentId}`,
    contentId,
    contentVersion: 1,
    tensionScore: { score: 50, explanation: 'Test' },
    paceScore: { score: 50, explanation: 'Test' },
    characterVoiceScores: {},
    continuityIssues: [],
    wordCount: 2500,
    readingTime: 12,
    characterAppearances: appearances,
    locationAppearances: [],
    threadTouches: [],
    analyzedAt: new Date().toISOString(),
  };
}

// Create mock dependencies
function createMockDeps(
  contentMap: Map<string, string>, // structureId -> contentId
  analysisMap: Map<string, ContentAnalysis> // contentId -> analysis
): CharacterTrackingDependencies {
  return {
    analysisRepository: {
      findLatest: vi.fn((_projectId: string, contentId: string) => {
        return analysisMap.get(contentId);
      }),
    } as unknown as CharacterTrackingDependencies['analysisRepository'],
    contentRepository: {
      findByStructure: vi.fn((_projectId: string, structureId: string) => {
        const contentId = contentMap.get(structureId);
        if (!contentId) return undefined;
        return {
          id: contentId,
          structureId,
          status: 'approved',
          currentVersion: 1,
          text: 'Test content',
          versions: [],
          reviews: [],
          generationHistory: [],
          locked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }),
    } as unknown as CharacterTrackingDependencies['contentRepository'],
  };
}

describe('presenceToIntensity', () => {
  it('should return 0 for undefined', () => {
    expect(presenceToIntensity(undefined)).toBe(0);
  });

  it('should return 1 for mention', () => {
    expect(presenceToIntensity('mention')).toBe(1);
  });

  it('should return 2 for scene', () => {
    expect(presenceToIntensity('scene')).toBe(2);
  });

  it('should return 3 for pov', () => {
    expect(presenceToIntensity('pov')).toBe(3);
  });
});

describe('intensityToPresence', () => {
  it('should return undefined for 0', () => {
    expect(intensityToPresence(0)).toBeUndefined();
  });

  it('should return mention for 1', () => {
    expect(intensityToPresence(1)).toBe('mention');
  });

  it('should return scene for 2', () => {
    expect(intensityToPresence(2)).toBe('scene');
  });

  it('should return pov for 3', () => {
    expect(intensityToPresence(3)).toBe('pov');
  });
});

describe('generateCharacterTrackingData', () => {
  it('should generate tracking data for a character with appearances', () => {
    const character = createTestCharacter('char-1', 'Alice');
    const chapters = [
      { structureId: 'ch-1', position: 1, title: 'Chapter 1', contentId: 'content-1', analysis: createTestAnalysis('content-1', [{ characterId: 'char-1', type: 'pov', dialogueLines: 5 }]) },
      { structureId: 'ch-2', position: 2, title: 'Chapter 2', contentId: 'content-2', analysis: createTestAnalysis('content-2', [{ characterId: 'char-1', type: 'scene', dialogueLines: 3 }]) },
      { structureId: 'ch-3', position: 3, title: 'Chapter 3', contentId: 'content-3', analysis: createTestAnalysis('content-3', []) },
    ];

    const result = generateCharacterTrackingData(character, chapters, [character]);

    expect(result.characterId).toBe('char-1');
    expect(result.characterName).toBe('Alice');
    expect(result.appearances).toHaveLength(2);
    expect(result.summary.totalAppearances).toBe(2);
    expect(result.summary.povChapters).toBe(1);
    expect(result.summary.sceneAppearances).toBe(1);
    expect(result.summary.totalDialogueLines).toBe(8);
    expect(result.summary.firstAppearance).toBe(1);
    expect(result.summary.lastAppearance).toBe(2);
    expect(result.summary.appearanceDensity).toBeCloseTo(2 / 3);
  });

  it('should handle character with no appearances', () => {
    const character = createTestCharacter('char-1', 'Alice');
    const chapters = [
      { structureId: 'ch-1', position: 1, title: 'Chapter 1', contentId: 'content-1', analysis: createTestAnalysis('content-1', []) },
    ];

    const result = generateCharacterTrackingData(character, chapters, [character]);

    expect(result.appearances).toHaveLength(0);
    expect(result.summary.totalAppearances).toBe(0);
    expect(result.summary.firstAppearance).toBeUndefined();
    expect(result.summary.lastAppearance).toBeUndefined();
  });

  it('should track relationship evolution', () => {
    const alice = createTestCharacter('char-1', 'Alice', {
      relationships: [
        {
          targetId: 'char-2',
          type: 'friend',
          description: 'Best friends',
          intensity: 80,
          mutual: true,
        },
      ],
    });
    const bob = createTestCharacter('char-2', 'Bob');

    const chapters = [
      {
        structureId: 'ch-1',
        position: 1,
        title: 'Chapter 1',
        contentId: 'content-1',
        analysis: createTestAnalysis('content-1', [
          { characterId: 'char-1', type: 'scene' },
          { characterId: 'char-2', type: 'scene' },
        ]),
      },
      {
        structureId: 'ch-2',
        position: 2,
        title: 'Chapter 2',
        contentId: 'content-2',
        analysis: createTestAnalysis('content-2', [
          { characterId: 'char-1', type: 'pov' },
          { characterId: 'char-2', type: 'scene' },
        ]),
      },
    ];

    const result = generateCharacterTrackingData(alice, chapters, [alice, bob]);

    expect(result.relationshipEvolution).toHaveLength(1);
    expect(result.relationshipEvolution[0].targetCharacterId).toBe('char-2');
    expect(result.relationshipEvolution[0].targetCharacterName).toBe('Bob');
    expect(result.relationshipEvolution[0].snapshots).toHaveLength(2);
    expect(result.relationshipEvolution[0].type).toBe('friend');
  });

  it('should track arc progress', () => {
    const character = createTestCharacter('char-1', 'Alice', {
      arc: {
        type: 'positive-change',
        startingPoint: 'Afraid and unsure',
        destination: 'Confident and brave',
        progress: 50,
        milestones: [
          { description: 'First victory', chapterId: 'ch-1', achieved: true },
          { description: 'Faces fear', chapterId: 'ch-2', achieved: true },
          { description: 'Final triumph', achieved: false },
        ],
      },
    });

    const chapters = [
      { structureId: 'ch-1', position: 1, title: 'Chapter 1' },
      { structureId: 'ch-2', position: 2, title: 'Chapter 2' },
      { structureId: 'ch-3', position: 3, title: 'Chapter 3' },
    ];

    const result = generateCharacterTrackingData(character, chapters, [character]);

    expect(result.arcProgress).toBeDefined();
    expect(result.arcProgress!.arcType).toBe('positive-change');
    expect(result.arcProgress!.progress).toBe(50);
    expect(result.arcProgress!.achievedMilestones).toBe(2);
    expect(result.arcProgress!.totalMilestones).toBe(3);
    expect(result.arcProgress!.milestones[0].chapterPosition).toBe(1);
    expect(result.arcProgress!.milestones[1].chapterPosition).toBe(2);
  });
});

describe('generateAllCharacterTracking', () => {
  it('should generate tracking data for all characters', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0),
        createTestChapter('ch-2', 1),
      ],
    });

    const characters = [
      createTestCharacter('char-1', 'Alice'),
      createTestCharacter('char-2', 'Bob'),
    ];

    const contentMap = new Map([
      ['ch-1', 'content-1'],
      ['ch-2', 'content-2'],
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', [
        { characterId: 'char-1', type: 'pov' },
        { characterId: 'char-2', type: 'scene' },
      ])],
      ['content-2', createTestAnalysis('content-2', [
        { characterId: 'char-1', type: 'scene' },
      ])],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateAllCharacterTracking(
      { projectId: 'project-1', rootStructure: book, characters },
      deps
    );

    expect(result).toHaveLength(2);
    expect(result[0].characterId).toBe('char-1');
    expect(result[0].summary.totalAppearances).toBe(2);
    expect(result[1].characterId).toBe('char-2');
    expect(result[1].summary.totalAppearances).toBe(1);
  });
});

describe('generatePresenceHeatmap', () => {
  it('should generate presence heatmap matrix', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 'Chapter 1'),
        createTestChapter('ch-2', 1, 'Chapter 2'),
        createTestChapter('ch-3', 2, 'Chapter 3'),
      ],
    });

    const characters = [
      createTestCharacter('char-1', 'Alice'),
      createTestCharacter('char-2', 'Bob'),
    ];

    const contentMap = new Map([
      ['ch-1', 'content-1'],
      ['ch-2', 'content-2'],
      ['ch-3', 'content-3'],
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', [
        { characterId: 'char-1', type: 'pov' },
        { characterId: 'char-2', type: 'mention' },
      ])],
      ['content-2', createTestAnalysis('content-2', [
        { characterId: 'char-1', type: 'scene' },
      ])],
      ['content-3', createTestAnalysis('content-3', [
        { characterId: 'char-2', type: 'pov' },
      ])],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generatePresenceHeatmap(
      { projectId: 'project-1', rootStructure: book, characters },
      deps
    );

    expect(result.characterIds).toEqual(['char-1', 'char-2']);
    expect(result.characterNames).toEqual(['Alice', 'Bob']);
    expect(result.positions).toEqual([1, 2, 3]);
    expect(result.titles).toEqual(['Chapter 1', 'Chapter 2', 'Chapter 3']);

    // Alice: pov(3), scene(2), not present(0)
    expect(result.matrix[0]).toEqual([3, 2, 0]);
    // Bob: mention(1), not present(0), pov(3)
    expect(result.matrix[1]).toEqual([1, 0, 3]);
  });

  it('should handle chapters without analysis', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0),
        createTestChapter('ch-2', 1),
      ],
    });

    const characters = [createTestCharacter('char-1', 'Alice')];

    const contentMap = new Map([
      ['ch-1', 'content-1'],
      // ch-2 has no content
    ]);

    const analysisMap = new Map([
      ['content-1', createTestAnalysis('content-1', [
        { characterId: 'char-1', type: 'pov' },
      ])],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generatePresenceHeatmap(
      { projectId: 'project-1', rootStructure: book, characters },
      deps
    );

    expect(result.matrix[0]).toEqual([3, 0]);
  });
});

describe('getCharactersWithDecliningPresence', () => {
  it('should identify characters with declining presence', () => {
    const trackingData: CharacterTrackingData[] = [
      {
        characterId: 'char-1',
        characterName: 'Alice',
        role: 'major',
        appearances: [
          { structureId: 'ch-1', position: 1, title: 'Ch1', presenceType: 'pov', isPov: true },
          { structureId: 'ch-2', position: 2, title: 'Ch2', presenceType: 'pov', isPov: true },
          { structureId: 'ch-3', position: 3, title: 'Ch3', presenceType: 'pov', isPov: true },
          { structureId: 'ch-4', position: 4, title: 'Ch4', presenceType: 'pov', isPov: true },
          { structureId: 'ch-5', position: 5, title: 'Ch5', presenceType: 'pov', isPov: true },
          // No appearances in chapters 6-10
        ],
        relationshipEvolution: [],
        summary: {
          totalAppearances: 5,
          povChapters: 5,
          sceneAppearances: 0,
          mentionAppearances: 0,
          totalDialogueLines: 0,
          firstAppearance: 1,
          lastAppearance: 5,
          appearanceDensity: 0.5,
        },
      },
    ];

    const result = getCharactersWithDecliningPresence(trackingData, 5, 10);

    expect(result).toHaveLength(1);
    expect(result[0].characterId).toBe('char-1');
  });

  it('should return empty when not enough data', () => {
    const trackingData: CharacterTrackingData[] = [];
    const result = getCharactersWithDecliningPresence(trackingData, 5, 8);
    expect(result).toHaveLength(0);
  });
});

describe('getCharactersMissingRecently', () => {
  it('should identify major characters missing from recent chapters', () => {
    const trackingData: CharacterTrackingData[] = [
      {
        characterId: 'char-1',
        characterName: 'Alice',
        role: 'protagonist',
        appearances: [
          { structureId: 'ch-1', position: 1, title: 'Ch1', presenceType: 'pov', isPov: true },
          { structureId: 'ch-2', position: 2, title: 'Ch2', presenceType: 'pov', isPov: true },
          // No appearances after chapter 2
        ],
        relationshipEvolution: [],
        summary: {
          totalAppearances: 2,
          povChapters: 2,
          sceneAppearances: 0,
          mentionAppearances: 0,
          totalDialogueLines: 0,
          firstAppearance: 1,
          lastAppearance: 2,
          appearanceDensity: 0.2,
        },
      },
      {
        characterId: 'char-2',
        characterName: 'Bob',
        role: 'minor', // Should be excluded
        appearances: [],
        relationshipEvolution: [],
        summary: {
          totalAppearances: 0,
          povChapters: 0,
          sceneAppearances: 0,
          mentionAppearances: 0,
          totalDialogueLines: 0,
          appearanceDensity: 0,
        },
      },
    ];

    const result = getCharactersMissingRecently(trackingData, 5, 10);

    expect(result).toHaveLength(1);
    expect(result[0].characterId).toBe('char-1');
  });
});

describe('getCharactersWithIncompleteArcs', () => {
  it('should identify characters with incomplete arcs', () => {
    const trackingData: CharacterTrackingData[] = [
      {
        characterId: 'char-1',
        characterName: 'Alice',
        role: 'major',
        appearances: [],
        relationshipEvolution: [],
        arcProgress: {
          arcType: 'positive-change',
          startingPoint: 'Start',
          destination: 'End',
          progress: 50,
          milestones: [
            { description: 'M1', achieved: true, order: 0 },
            { description: 'M2', achieved: false, order: 1 },
          ],
          achievedMilestones: 1,
          totalMilestones: 2,
        },
        summary: {
          totalAppearances: 0,
          povChapters: 0,
          sceneAppearances: 0,
          mentionAppearances: 0,
          totalDialogueLines: 0,
          appearanceDensity: 0,
        },
      },
      {
        characterId: 'char-2',
        characterName: 'Bob',
        role: 'major',
        appearances: [],
        relationshipEvolution: [],
        arcProgress: {
          arcType: 'flat',
          startingPoint: 'Start',
          destination: 'End',
          progress: 100,
          milestones: [
            { description: 'M1', achieved: true, order: 0 },
          ],
          achievedMilestones: 1,
          totalMilestones: 1,
        },
        summary: {
          totalAppearances: 0,
          povChapters: 0,
          sceneAppearances: 0,
          mentionAppearances: 0,
          totalDialogueLines: 0,
          appearanceDensity: 0,
        },
      },
    ];

    const result = getCharactersWithIncompleteArcs(trackingData);

    expect(result).toHaveLength(1);
    expect(result[0].characterId).toBe('char-1');
  });
});

describe('getTopCharactersByPresence', () => {
  it('should return top characters by appearance count', () => {
    const trackingData: CharacterTrackingData[] = [
      {
        characterId: 'char-1',
        characterName: 'Alice',
        role: 'major',
        appearances: [],
        relationshipEvolution: [],
        summary: { totalAppearances: 10, povChapters: 5, sceneAppearances: 5, mentionAppearances: 0, totalDialogueLines: 0, appearanceDensity: 0.5 },
      },
      {
        characterId: 'char-2',
        characterName: 'Bob',
        role: 'major',
        appearances: [],
        relationshipEvolution: [],
        summary: { totalAppearances: 5, povChapters: 2, sceneAppearances: 3, mentionAppearances: 0, totalDialogueLines: 0, appearanceDensity: 0.25 },
      },
      {
        characterId: 'char-3',
        characterName: 'Charlie',
        role: 'minor',
        appearances: [],
        relationshipEvolution: [],
        summary: { totalAppearances: 15, povChapters: 0, sceneAppearances: 10, mentionAppearances: 5, totalDialogueLines: 0, appearanceDensity: 0.75 },
      },
    ];

    const result = getTopCharactersByPresence(trackingData, 2);

    expect(result).toHaveLength(2);
    expect(result[0].characterId).toBe('char-3'); // 15 appearances
    expect(result[1].characterId).toBe('char-1'); // 10 appearances
  });
});

describe('getCharactersByPOVCount', () => {
  it('should return characters sorted by POV count', () => {
    const trackingData: CharacterTrackingData[] = [
      {
        characterId: 'char-1',
        characterName: 'Alice',
        role: 'major',
        appearances: [],
        relationshipEvolution: [],
        summary: { totalAppearances: 10, povChapters: 8, sceneAppearances: 2, mentionAppearances: 0, totalDialogueLines: 0, appearanceDensity: 0.5 },
      },
      {
        characterId: 'char-2',
        characterName: 'Bob',
        role: 'major',
        appearances: [],
        relationshipEvolution: [],
        summary: { totalAppearances: 15, povChapters: 3, sceneAppearances: 12, mentionAppearances: 0, totalDialogueLines: 0, appearanceDensity: 0.75 },
      },
      {
        characterId: 'char-3',
        characterName: 'Charlie',
        role: 'minor',
        appearances: [],
        relationshipEvolution: [],
        summary: { totalAppearances: 5, povChapters: 0, sceneAppearances: 5, mentionAppearances: 0, totalDialogueLines: 0, appearanceDensity: 0.25 },
      },
    ];

    const result = getCharactersByPOVCount(trackingData);

    expect(result).toHaveLength(2); // Charlie excluded (0 POV)
    expect(result[0].characterId).toBe('char-1'); // 8 POV
    expect(result[1].characterId).toBe('char-2'); // 3 POV
  });
});
