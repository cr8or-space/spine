/**
 * Tests for beat expansion service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createBeatsService,
  type BeatsService,
  type BeatsInput,
  type ExpandedBeat,
} from './beats';
import type { LLMClient, AssembledContext } from '@repo/framework-llm';
import type { Structure, Beat } from '@repo/serial-types';

// Mock LLM client
function createMockClient(responseText: string = ''): LLMClient {
  return {
    chat: vi.fn().mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'test-model',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: responseText },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 150, completion_tokens: 300, total_tokens: 450 },
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

// Create test structure
function createTestStructure(): Structure {
  return {
    id: 'structure-1',
    type: 'chapter',
    title: 'Chapter 1: The Beginning',
    summary: 'The protagonist discovers a mysterious artifact',
    beats: [],
    tensionTarget: 60,
    chapterType: 'action',
    hook: {
      type: 'cliffhanger',
      description: 'The artifact activates unexpectedly',
    },
    order: 0,
    children: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Create test context
function createTestContext(): AssembledContext {
  return {
    taskType: 'beat-expansion',
    bible: {
      characters: [
        {
          id: 'char-1',
          name: 'Elena',
          role: 'protagonist',
        },
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Ancient Temple',
          type: 'building',
        },
      ],
      factions: [],
      worldRules: [],
      plotThreads: [],
      tokenCount: 0,
    },
    recentContent: [],
    structure: null,
    constraints: [],
    budget: {
      total: 8000,
      system: 500,
      bible: 1500,
      recentContent: 1000,
      structure: 1500,
      constraints: 500,
      task: 500,
      completion: 1500,
    },
    actualTokens: {
      bible: 0,
      recentContent: 0,
      structure: 0,
      constraints: 0,
      total: 0,
    },
  };
}

// Create test outline beats
function createOutlineBeats(): Beat[] {
  return [
    { id: 'beat-1', description: 'Elena arrives at the temple', completed: false, order: 0 },
    { id: 'beat-2', description: 'She discovers a hidden chamber', completed: false, order: 1 },
    { id: 'beat-3', description: 'The artifact activates', completed: false, order: 2 },
  ];
}

// Create test input
function createTestInput(): BeatsInput {
  return {
    structure: createTestStructure(),
    context: createTestContext(),
    outlineBeats: createOutlineBeats(),
  };
}

describe('createBeatsService', () => {
  let service: BeatsService;
  let mockClient: LLMClient;

  beforeEach(() => {
    mockClient = createMockClient(`1. Elena approaches the ancient temple, taking in its weathered stone facade (~300 words)
   - Characters: Elena
   - Location: Temple entrance
   - Tone: curious, apprehensive

2. She navigates through the main hall, noting strange symbols (~400 words)
   - Characters: Elena
   - Location: Temple interior
   - Tone: mysterious

3. Discovery of the hidden chamber beneath the altar (~500 words) [climax]
   - Characters: Elena
   - Location: Hidden chamber
   - Tone: awe, fear
   - tension: 70

4. The artifact activates with blinding light (~400 words)
   - Characters: Elena
   - Location: Hidden chamber
   - Tone: panic

5. Cliffhanger - The temple shakes as ancient mechanisms awaken (~400 words)
   - Characters: Elena
   - Location: Hidden chamber
   - Tone: terror`);
    service = createBeatsService(mockClient);
  });

  describe('expand', () => {
    it('should expand outline beats successfully', async () => {
      const input = createTestInput();
      const result = await service.expand(input);

      expect(result.success).toBe(true);
      expect(result.beats.length).toBeGreaterThan(0);
      expect(result.modelId).toBe('test-model');
    });

    it('should parse word counts from response', async () => {
      const input = createTestInput();
      const result = await service.expand(input);

      expect(result.beats[0].targetWordCount).toBe(300);
      expect(result.beats[1].targetWordCount).toBe(400);
      expect(result.beats[2].targetWordCount).toBe(500);
    });

    it('should calculate total word count', async () => {
      const input = createTestInput();
      const result = await service.expand(input);

      expect(result.totalWordCount).toBe(2000); // 300+400+500+400+400
    });

    it('should parse beat metadata', async () => {
      const input = createTestInput();
      const result = await service.expand(input);

      // Check first beat
      expect(result.beats[0].charactersInvolved).toContain('Elena');
      expect(result.beats[0].location).toBe('Temple entrance');
      expect(result.beats[0].emotionalTone).toContain('curious');
    });

    it('should parse purpose markers', async () => {
      const input = createTestInput();
      const result = await service.expand(input);

      // Beat 3 has [climax] marker
      expect(result.beats[2].purpose).toBe('climax');
    });

    it('should parse tension levels', async () => {
      const input = createTestInput();
      const result = await service.expand(input);

      // Beat 3 has tension: 70
      expect(result.beats[2].tensionLevel).toBe(70);
    });

    it('should handle LLM errors gracefully', async () => {
      mockClient.chat = vi.fn().mockRejectedValue(new Error('API error'));
      service = createBeatsService(mockClient);

      const result = await service.expand(createTestInput());

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(result.beats).toHaveLength(0);
    });

    it('should use custom config when provided', async () => {
      const input = createTestInput();
      await service.expand(input, {
        temperature: 0.8,
        maxTokens: 3000,
        model: 'custom-model',
        targetWordCount: 3000,
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom-model',
          temperature: 0.8,
          max_tokens: 3000,
        })
      );
    });

    it('should include pacing preference in prompt', async () => {
      const input: BeatsInput = {
        ...createTestInput(),
        pacingPreference: 'fast',
      };

      await service.expand(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      // The pacing guidance for 'fast' includes keywords about keeping momentum high
      expect(userMessage.content).toContain('Pacing:');
    });

    it('should include POV guidance when specified', async () => {
      const input: BeatsInput = {
        ...createTestInput(),
        povCharacterId: 'Elena',
      };

      await service.expand(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Elena');
    });
  });

  describe('parseBeats', () => {
    it('should parse numbered beats with word counts', () => {
      const text = `1. Opening scene (~300 words)
2. Middle action (~500 words)
3. Climax (~400 words)`;

      const beats = service.parseBeats(text, 1200);

      expect(beats).toHaveLength(3);
      expect(beats[0].targetWordCount).toBe(300);
      expect(beats[1].targetWordCount).toBe(500);
      expect(beats[2].targetWordCount).toBe(400);
    });

    it('should distribute word counts evenly if not specified', () => {
      const text = `1. First beat
2. Second beat
3. Third beat`;

      const beats = service.parseBeats(text, 1200);

      expect(beats).toHaveLength(3);
      expect(beats[0].targetWordCount).toBe(400);
      expect(beats[1].targetWordCount).toBe(400);
      expect(beats[2].targetWordCount).toBe(400);
    });

    it('should extract purpose markers', () => {
      const text = `1. Setup scene [setup]
2. Main action [development]
3. Big moment [climax]
4. Wind down [resolution]`;

      const beats = service.parseBeats(text);

      expect(beats[0].purpose).toBe('setup');
      expect(beats[1].purpose).toBe('development');
      expect(beats[2].purpose).toBe('climax');
      expect(beats[3].purpose).toBe('resolution');
    });

    it('should extract tension levels', () => {
      const text = `1. Low tension scene tension: 30
2. Building tension tension: 60
3. High tension moment tension: 90`;

      const beats = service.parseBeats(text);

      expect(beats[0].tensionLevel).toBe(30);
      expect(beats[1].tensionLevel).toBe(60);
      expect(beats[2].tensionLevel).toBe(90);
    });
  });

  describe('adjustWordCounts', () => {
    it('should scale word counts proportionally', () => {
      const beats: ExpandedBeat[] = [
        { id: '1', description: 'Beat 1', completed: false, order: 0, targetWordCount: 200 },
        { id: '2', description: 'Beat 2', completed: false, order: 1, targetWordCount: 300 },
        { id: '3', description: 'Beat 3', completed: false, order: 2, targetWordCount: 500 },
      ];

      const adjusted = service.adjustWordCounts(beats, 2000);

      // Original total: 1000, new total: 2000, ratio: 2
      expect(adjusted[0].targetWordCount).toBe(400);
      expect(adjusted[1].targetWordCount).toBe(600);
      expect(adjusted[2].targetWordCount).toBe(1000);
    });

    it('should distribute evenly if no word counts exist', () => {
      const beats: ExpandedBeat[] = [
        { id: '1', description: 'Beat 1', completed: false, order: 0 },
        { id: '2', description: 'Beat 2', completed: false, order: 1 },
        { id: '3', description: 'Beat 3', completed: false, order: 2 },
      ];

      const adjusted = service.adjustWordCounts(beats, 1500);

      expect(adjusted[0].targetWordCount).toBe(500);
      expect(adjusted[1].targetWordCount).toBe(500);
      expect(adjusted[2].targetWordCount).toBe(500);
    });

    it('should handle empty beats array', () => {
      const adjusted = service.adjustWordCounts([], 1000);
      expect(adjusted).toHaveLength(0);
    });
  });

  describe('reorderBeats', () => {
    it('should reorder beats according to new order', () => {
      const beats: ExpandedBeat[] = [
        { id: 'a', description: 'A', completed: false, order: 0 },
        { id: 'b', description: 'B', completed: false, order: 1 },
        { id: 'c', description: 'C', completed: false, order: 2 },
      ];

      const reordered = service.reorderBeats(beats, ['c', 'a', 'b']);

      expect(reordered[0].id).toBe('c');
      expect(reordered[0].order).toBe(0);
      expect(reordered[1].id).toBe('a');
      expect(reordered[1].order).toBe(1);
      expect(reordered[2].id).toBe('b');
      expect(reordered[2].order).toBe(2);
    });

    it('should append beats not in new order at the end', () => {
      const beats: ExpandedBeat[] = [
        { id: 'a', description: 'A', completed: false, order: 0 },
        { id: 'b', description: 'B', completed: false, order: 1 },
        { id: 'c', description: 'C', completed: false, order: 2 },
      ];

      const reordered = service.reorderBeats(beats, ['a']);

      expect(reordered).toHaveLength(3);
      expect(reordered[0].id).toBe('a');
      expect(reordered[1].id).toBe('b');
      expect(reordered[2].id).toBe('c');
    });
  });

  describe('splitBeat', () => {
    it('should split a beat into multiple beats', () => {
      const beat: ExpandedBeat = {
        id: 'original',
        description: 'Complex scene',
        completed: false,
        order: 2,
        targetWordCount: 600,
        emotionalTone: 'tense',
      };

      const splits = service.splitBeat(beat, 3);

      expect(splits).toHaveLength(3);
      expect(splits[0].description).toContain('part 1/3');
      expect(splits[0].targetWordCount).toBe(200);
      expect(splits[0].emotionalTone).toBe('tense');
    });

    it('should return original beat if splitCount < 2', () => {
      const beat: ExpandedBeat = {
        id: 'original',
        description: 'Simple scene',
        completed: false,
        order: 0,
      };

      const splits = service.splitBeat(beat, 1);

      expect(splits).toHaveLength(1);
      expect(splits[0]).toEqual(beat);
    });

    it('should preserve all properties across splits', () => {
      const beat: ExpandedBeat = {
        id: 'original',
        description: 'Scene',
        completed: false,
        order: 0,
        purpose: 'climax',
        povCharacter: 'Elena',
        tensionLevel: 80,
      };

      const splits = service.splitBeat(beat, 2);

      expect(splits[0].purpose).toBe('climax');
      expect(splits[0].povCharacter).toBe('Elena');
      expect(splits[0].tensionLevel).toBe(80);
      expect(splits[1].purpose).toBe('climax');
    });
  });

  describe('mergeBeats', () => {
    it('should merge multiple beats into one', () => {
      const beats: ExpandedBeat[] = [
        {
          id: 'a',
          description: 'First action',
          completed: false,
          order: 0,
          targetWordCount: 200,
        },
        {
          id: 'b',
          description: 'Second action',
          completed: false,
          order: 1,
          targetWordCount: 300,
        },
      ];

      const merged = service.mergeBeats(beats);

      expect(merged.description).toContain('First action');
      expect(merged.description).toContain('Second action');
      expect(merged.targetWordCount).toBe(500);
    });

    it('should collect unique characters from all beats', () => {
      const beats: ExpandedBeat[] = [
        {
          id: 'a',
          description: 'A',
          completed: false,
          order: 0,
          charactersInvolved: ['Elena', 'Marcus'],
        },
        {
          id: 'b',
          description: 'B',
          completed: false,
          order: 1,
          charactersInvolved: ['Elena', 'Sarah'],
        },
      ];

      const merged = service.mergeBeats(beats);

      expect(merged.charactersInvolved).toContain('Elena');
      expect(merged.charactersInvolved).toContain('Marcus');
      expect(merged.charactersInvolved).toContain('Sarah');
    });

    it('should use highest tension level', () => {
      const beats: ExpandedBeat[] = [
        { id: 'a', description: 'A', completed: false, order: 0, tensionLevel: 40 },
        { id: 'b', description: 'B', completed: false, order: 1, tensionLevel: 80 },
        { id: 'c', description: 'C', completed: false, order: 2, tensionLevel: 60 },
      ];

      const merged = service.mergeBeats(beats);

      expect(merged.tensionLevel).toBe(80);
    });

    it('should handle empty array', () => {
      const merged = service.mergeBeats([]);

      expect(merged.id).toBeDefined();
      expect(merged.description).toBe('');
      expect(merged.order).toBe(0);
    });

    it('should return single beat unchanged', () => {
      const beat: ExpandedBeat = {
        id: 'only',
        description: 'Only beat',
        completed: true,
        order: 5,
      };

      const merged = service.mergeBeats([beat]);

      expect(merged).toEqual(beat);
    });

    it('should mark as completed only if all beats are completed', () => {
      const beats: ExpandedBeat[] = [
        { id: 'a', description: 'A', completed: true, order: 0 },
        { id: 'b', description: 'B', completed: false, order: 1 },
      ];

      const merged = service.mergeBeats(beats);

      expect(merged.completed).toBe(false);

      const allComplete: ExpandedBeat[] = [
        { id: 'a', description: 'A', completed: true, order: 0 },
        { id: 'b', description: 'B', completed: true, order: 1 },
      ];

      const mergedComplete = service.mergeBeats(allComplete);

      expect(mergedComplete.completed).toBe(true);
    });
  });

  describe('token tracking', () => {
    it('should report token usage from response', async () => {
      const result = await service.expand(createTestInput());

      expect(result.tokens.prompt).toBe(150);
      expect(result.tokens.completion).toBe(300);
    });

    it('should track duration', async () => {
      const result = await service.expand(createTestInput());

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
