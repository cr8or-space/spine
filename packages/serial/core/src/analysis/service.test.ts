/**
 * Tests for analysis service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createAnalysisService } from './service';
import type { AnalysisInput } from './types';
import type { LLMClient } from '@repo/framework-llm';
import type { Bible, Content, Structure } from '@repo/serial-types';

// Mock LLM client
function createMockClient(responseMap: Record<string, string> = {}): LLMClient {
  return {
    chat: vi.fn().mockImplementation(async ({ messages }) => {
      const userMessage = messages.find((m: { role: string }) => m.role === 'user')?.content || '';

      // Determine response based on prompt content
      let content = '{}';
      if (userMessage.includes('narrative tension')) {
        content = responseMap.tension || JSON.stringify({
          score: {
            score: 65,
            explanation: 'Moderate tension with good conflict',
            factors: [
              { name: 'conflict', impact: 15, detail: 'Strong interpersonal conflict' },
              { name: 'stakes', impact: 10, detail: 'Clear consequences' },
            ],
          },
          tensionMoments: [
            {
              description: 'Confrontation between protagonist and antagonist',
              position: 45,
              type: 'conflict',
              intensity: 75,
            },
          ],
        });
      } else if (userMessage.includes('chapter ending')) {
        content = responseMap.hook || JSON.stringify({
          score: {
            score: 80,
            explanation: 'Strong cliffhanger ending',
            factors: [
              { name: 'suspense', impact: 20, detail: 'Leaves reader wanting more' },
            ],
          },
          hookType: 'cliffhanger',
          improvements: ['Could add more emotional stakes'],
        });
      } else if (userMessage.includes('pacing') || userMessage.includes('flow')) {
        content = responseMap.pacing || JSON.stringify({
          score: {
            score: 70,
            explanation: 'Good pacing with varied rhythm',
            factors: [
              { name: 'variety', impact: 15, detail: 'Good mix of action and dialogue' },
            ],
          },
          segments: [
            { startPosition: 0, endPosition: 30, type: 'dialogue', speed: 'moderate' },
            { startPosition: 30, endPosition: 70, type: 'action', speed: 'fast' },
            { startPosition: 70, endPosition: 100, type: 'introspection', speed: 'slow' },
          ],
          profile: 'varied',
        });
      } else if (userMessage.includes('continuity')) {
        content = responseMap.continuity || JSON.stringify({
          issues: [
            {
              type: 'character-inconsistency',
              severity: 'minor',
              description: 'Character uses unfamiliar phrase',
              conflictsWith: {
                type: 'character',
                id: 'char-1',
                detail: 'Voice sample shows different speech pattern',
              },
              suggestion: 'Use more formal language',
            },
          ],
          characterMentions: [
            {
              characterId: 'char-1',
              characterName: 'Elena',
              appearanceType: 'pov',
              dialogueLines: 5,
              consistent: true,
            },
          ],
          locationMentions: [
            {
              locationId: 'loc-1',
              locationName: 'The Market',
              consistent: true,
            },
          ],
          relevantRules: ['rule-1'],
          score: 85,
        });
      }

      return {
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 500, completion_tokens: 300, total_tokens: 800 },
      };
    }),
    chatStream: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      endpoint: 'http://localhost',
      defaultModel: 'test-model',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      retryMultiplier: 2,
    }),
    updateConfig: vi.fn(),
  };
}

// Create test fixtures
function createTestBible(): Bible {
  return {
    id: 'bible-1',
    characters: [
      {
        id: 'char-1',
        name: 'Elena',
        aliases: ['The Seeker'],
        description: 'A determined young woman searching for ancient artifacts',
        traits: [
          { category: 'personality', name: 'Determined', description: 'Never gives up' },
          { category: 'skill', name: 'Archaeological knowledge', description: 'Expert in ancient history' },
        ],
        relationships: [],
        voiceSamples: ['I will find the truth, no matter the cost.', 'The ancient ones left clues for those who know where to look.'],
        appearances: [],
        role: 'protagonist',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    locations: [
      {
        id: 'loc-1',
        name: 'The Market',
        aliases: ['Old Town Market'],
        description: 'A bustling marketplace in the old quarter',
        type: 'district',
        relations: [],
        features: [{ name: 'Crowded streets', description: 'Always full of people', significance: 'atmospheric' }],
        associatedCharacters: [],
        status: 'accessible',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    factions: [],
    worldRules: [
      {
        id: 'rule-1',
        name: 'Artifact Activation',
        description: 'Ancient artifacts require specific conditions to activate',
        category: 'magic',
        rule: 'Artifacts only respond to those with the ancient bloodline',
        exceptions: [],
        publicKnowledge: false,
        relatedRules: [],
        priority: 80,
        established: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    plotThreads: [],
    timelineEvents: [],
    timelineSpans: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTestStructure(): Structure {
  return {
    id: 'structure-1',
    type: 'chapter',
    title: 'Chapter 1: The Discovery',
    summary: 'Elena finds the artifact in the market',
    beats: [],
    tensionTarget: 60,
    chapterType: 'action',
    hook: {
      type: 'cliffhanger',
      description: 'The artifact activates',
    },
    order: 0,
    children: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTestContent(): Content {
  return {
    id: 'content-1',
    structureId: 'structure-1',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        text: 'Elena walked through the crowded market.',
        wordCount: 7,
        source: 'generated',
        createdAt: new Date().toISOString(),
      },
    ],
    text: `Elena walked through the crowded market, her eyes scanning each stall with practiced precision.

"Looking for something special?" the old merchant asked, his voice gravelly.

"Perhaps," she replied, her gaze fixed on a glint of bronze in the corner.

The artifact was hidden beneath dusty cloths and forgotten trinkets. When her fingers touched it, a shock ran through her body.

"What is this?" she breathed.

The merchant's face went pale. "That shouldn't be here. You shouldn't have found that."

Before she could respond, the symbols on the artifact began to glow. A warm light pulsed through the metal, growing brighter with each heartbeat.

The entire market seemed to freeze as the light intensified. Elena knew, in that moment, that nothing would ever be the same.

And then she heard the voice.`,
    status: 'draft',
    reviews: [],
    generationHistory: [],
    locked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTestInput(): AnalysisInput {
  return {
    content: createTestContent(),
    structure: createTestStructure(),
    bible: createTestBible(),
  };
}

describe('createAnalysisService', () => {
  let mockClient: LLMClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('analyzeTension', () => {
    it('should analyze tension levels', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.analyzeTension(input);

      expect(result.score.score).toBe(65);
      expect(result.score.explanation).toContain('tension');
      expect(result.tensionMoments).toHaveLength(1);
      expect(result.tensionMoments[0].type).toBe('conflict');
    });

    it('should calculate divergence when tension target exists', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();
      input.structure.tensionTarget = 70;

      const result = await service.analyzeTension(input);

      expect(result.divergence).toBeDefined();
      expect(result.divergence).toBe(-5); // 65 - 70
    });

    it('should not include divergence when no target', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();
      input.structure.tensionTarget = undefined;

      const result = await service.analyzeTension(input);

      expect(result.divergence).toBeUndefined();
    });
  });

  describe('analyzeHook', () => {
    it('should analyze hook strength', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.analyzeHook(input);

      expect(result.score.score).toBe(80);
      expect(result.hookType).toBe('cliffhanger');
      expect(result.improvements).toHaveLength(1);
    });

    it('should identify hook type', async () => {
      const client = createMockClient({
        hook: JSON.stringify({
          score: { score: 60, explanation: 'Emotional ending' },
          hookType: 'emotional',
          improvements: [],
        }),
      });

      const service = createAnalysisService(client);
      const input = createTestInput();

      const result = await service.analyzeHook(input);

      expect(result.hookType).toBe('emotional');
    });
  });

  describe('analyzePacing', () => {
    it('should analyze pacing', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.analyzePacing(input);

      expect(result.score.score).toBe(70);
      expect(result.profile).toBe('varied');
      expect(result.segments).toHaveLength(3);
    });

    it('should identify pacing segments', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.analyzePacing(input);

      expect(result.segments[0].type).toBe('dialogue');
      expect(result.segments[1].type).toBe('action');
      expect(result.segments[1].speed).toBe('fast');
    });
  });

  describe('checkContinuity', () => {
    it('should check for continuity issues', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.checkContinuity(input);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('character-inconsistency');
      expect(result.issues[0].severity).toBe('minor');
      expect(result.score).toBe(85);
    });

    it('should track character mentions', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.checkContinuity(input);

      expect(result.characterMentions).toHaveLength(1);
      expect(result.characterMentions[0].characterName).toBe('Elena');
      expect(result.characterMentions[0].appearanceType).toBe('pov');
    });

    it('should track location mentions', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.checkContinuity(input);

      expect(result.locationMentions).toHaveLength(1);
      expect(result.locationMentions[0].locationName).toBe('The Market');
    });

    it('should identify relevant world rules', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.checkContinuity(input);

      expect(result.relevantRules).toContain('rule-1');
    });
  });

  describe('analyzeContent', () => {
    it('should run full analysis', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.analyzeContent(input);

      expect(result.tension).toBeDefined();
      expect(result.hook).toBeDefined();
      expect(result.pacing).toBeDefined();
      expect(result.continuity).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.readingTime).toBeGreaterThan(0);
      expect(result.analyzedAt).toBeDefined();
    });

    it('should skip hook analysis for non-chapters', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();
      input.structure.type = 'scene';

      const result = await service.analyzeContent(input);

      expect(result.hook).toBeUndefined();
    });

    it('should include hook analysis for chapters', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();
      input.structure.type = 'chapter';

      const result = await service.analyzeContent(input);

      expect(result.hook).toBeDefined();
    });

    it('should calculate word count correctly', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const result = await service.analyzeContent(input);

      // Count words in the test content
      const expectedWords = input.content.text.trim().split(/\s+/).filter(Boolean).length;
      expect(result.wordCount).toBe(expectedWords);
    });
  });

  describe('toContentAnalysis', () => {
    it('should convert full analysis to ContentAnalysis', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const fullResult = await service.analyzeContent(input);
      const contentAnalysis = service.toContentAnalysis('content-1', 1, fullResult);

      expect(contentAnalysis.id).toBeDefined();
      expect(contentAnalysis.contentId).toBe('content-1');
      expect(contentAnalysis.contentVersion).toBe(1);
      expect(contentAnalysis.tensionScore).toEqual(fullResult.tension.score);
      expect(contentAnalysis.paceScore).toEqual(fullResult.pacing.score);
      expect(contentAnalysis.hookStrength).toEqual(fullResult.hook?.score);
      expect(contentAnalysis.wordCount).toBe(fullResult.wordCount);
      expect(contentAnalysis.readingTime).toBe(fullResult.readingTime);
      expect(contentAnalysis.continuityIssues).toEqual(fullResult.continuity.issues);
    });

    it('should include character appearances', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const fullResult = await service.analyzeContent(input);
      const contentAnalysis = service.toContentAnalysis('content-1', 1, fullResult);

      expect(contentAnalysis.characterAppearances).toHaveLength(1);
      expect(contentAnalysis.characterAppearances[0].characterId).toBe('char-1');
    });

    it('should include location appearances', async () => {
      const service = createAnalysisService(mockClient);
      const input = createTestInput();

      const fullResult = await service.analyzeContent(input);
      const contentAnalysis = service.toContentAnalysis('content-1', 1, fullResult);

      expect(contentAnalysis.locationAppearances).toContain('loc-1');
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON responses', async () => {
      const client = createMockClient();
      (client.chat as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Not valid JSON' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }));

      const service = createAnalysisService(client);
      const input = createTestInput();

      // Should not throw, should return defaults
      const result = await service.analyzeTension(input);
      expect(result.score.score).toBe(50); // Default
      expect(result.tensionMoments).toHaveLength(0);
    });

    it('should handle partial JSON responses', async () => {
      const client = createMockClient();
      (client.chat as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Analysis: { "score": { "score": 75, "explanation": "Good" } }',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }));

      const service = createAnalysisService(client);
      const input = createTestInput();

      const result = await service.analyzeTension(input);
      expect(result.score.score).toBe(75);
    });
  });
});
