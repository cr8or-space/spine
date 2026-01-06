/**
 * Tests for outline generation service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createOutlineService, type OutlineService, type OutlineInput } from './outline';
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
      usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
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
    taskType: 'outline',
    bible: {
      characters: [
        {
          id: 'char-1',
          name: 'Elena',
          role: 'protagonist',
          description: 'A young archaeologist',
        },
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Ancient Temple',
          type: 'building',
          description: 'A forgotten temple in the mountains',
        },
      ],
      factions: [],
      worldRules: [],
      plotThreads: [
        {
          id: 'thread-1',
          name: 'The Search',
          type: 'main-plot',
          status: 'active',
        },
      ],
      tokenCount: 0,
    },
    recentContent: [
      {
        id: 'content-prev',
        structureId: 'struct-prev',
        title: 'Prologue',
        summary: 'Elena receives a mysterious letter about her father.',
        tokenCount: 50,
      },
    ],
    structure: null,
    constraints: [
      {
        type: 'fact',
        sourceId: 'char-1',
        sourceType: 'character',
        statement: 'Elena is afraid of heights',
        priority: 70,
        critical: true,
      },
    ],
    budget: {
      total: 8000,
      system: 500,
      bible: 2000,
      recentContent: 1000,
      structure: 1000,
      constraints: 500,
      task: 500,
      completion: 2500,
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

// Create test input
function createTestInput(): OutlineInput {
  return {
    structure: createTestStructure(),
    context: createTestContext(),
  };
}

describe('createOutlineService', () => {
  let service: OutlineService;
  let mockClient: LLMClient;

  beforeEach(() => {
    mockClient = createMockClient(`1. Opening scene - Elena arrives at the ancient temple
2. Discovery - She finds a hidden chamber beneath the altar
3. The artifact - A glowing orb sits on a pedestal
4. Activation - Elena touches the orb, triggering ancient mechanisms
5. Cliffhanger - The temple begins to collapse around her`);
    service = createOutlineService(mockClient);
  });

  describe('generate', () => {
    it('should generate an outline successfully', async () => {
      const input = createTestInput();
      const result = await service.generate(input);

      expect(result.success).toBe(true);
      expect(result.beats.length).toBeGreaterThan(0);
      expect(result.rawText).toContain('Elena');
      expect(result.modelId).toBe('test-model');
    });

    it('should parse numbered beats correctly', async () => {
      const input = createTestInput();
      const result = await service.generate(input);

      expect(result.beats).toHaveLength(5);
      expect(result.beats[0].description).toContain('Opening scene');
      expect(result.beats[4].description).toContain('Cliffhanger');
    });

    it('should assign sequential order to beats', async () => {
      const input = createTestInput();
      const result = await service.generate(input);

      result.beats.forEach((beat, index) => {
        expect(beat.order).toBe(index);
      });
    });

    it('should mark all beats as incomplete', async () => {
      const input = createTestInput();
      const result = await service.generate(input);

      result.beats.forEach((beat) => {
        expect(beat.completed).toBe(false);
      });
    });

    it('should handle bullet point format', async () => {
      mockClient = createMockClient(`- The hero enters
- A challenge appears
* Resolution`);
      service = createOutlineService(mockClient);

      const result = await service.generate(createTestInput());

      expect(result.beats).toHaveLength(3);
      expect(result.beats[0].description).toBe('The hero enters');
      expect(result.beats[2].description).toBe('Resolution');
    });

    it('should handle LLM errors gracefully', async () => {
      mockClient.chat = vi.fn().mockRejectedValue(new Error('API error'));
      service = createOutlineService(mockClient);

      const result = await service.generate(createTestInput());

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(result.beats).toHaveLength(0);
    });

    it('should use custom config when provided', async () => {
      const input = createTestInput();
      await service.generate(input, {
        temperature: 0.5,
        maxTokens: 1500,
        model: 'custom-model',
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom-model',
          temperature: 0.5,
          max_tokens: 1500,
        })
      );
    });

    it('should include required plot points in constraints', async () => {
      const input: OutlineInput = {
        ...createTestInput(),
        requiredPlotPoints: ['artifact discovery', 'temple collapse'],
      };

      await service.generate(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('artifact discovery');
      expect(userMessage.content).toContain('temple collapse');
    });

    it('should include previous chapter summary', async () => {
      const input: OutlineInput = {
        ...createTestInput(),
        previousChapterSummary: 'Elena left the city heading toward the mountains.',
      };

      await service.generate(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Previous Chapter');
      expect(userMessage.content).toContain('left the city');
    });
  });

  describe('regenerate', () => {
    it('should include previous attempt in style guidance', async () => {
      const input = createTestInput();
      const previousResult = {
        success: true,
        beats: [],
        rawText: 'Previous outline attempt',
        tokens: { prompt: 100, completion: 200 },
        durationMs: 1000,
        modelId: 'test-model',
      };

      await service.regenerate(input, previousResult);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Previous outline attempt');
    });
  });

  describe('parseOutline', () => {
    it('should parse numbered list', () => {
      const text = `1. First beat
2. Second beat
3. Third beat`;

      const beats = service.parseOutline(text);

      expect(beats).toHaveLength(3);
      expect(beats[0].description).toBe('First beat');
      expect(beats[1].description).toBe('Second beat');
      expect(beats[2].description).toBe('Third beat');
    });

    it('should parse bullet points', () => {
      const text = `- First item
- Second item
* Third item`;

      const beats = service.parseOutline(text);

      expect(beats).toHaveLength(3);
    });

    it('should ignore empty lines and short items', () => {
      const text = `1. Good beat

2. ok

3. Another good beat`;

      const beats = service.parseOutline(text);

      expect(beats).toHaveLength(2);
      expect(beats[0].description).toBe('Good beat');
      expect(beats[1].description).toBe('Another good beat');
    });

    it('should handle mixed formats', () => {
      const text = `1. Numbered item
- Bullet item
* Star item
2) Paren format`;

      const beats = service.parseOutline(text);

      expect(beats).toHaveLength(4);
    });
  });

  describe('validateOutline', () => {
    it('should pass validation for good outline', () => {
      const beats: Beat[] = [
        { id: '1', description: 'Elena arrives at the temple', completed: false, order: 0 },
        { id: '2', description: 'Discovery of the artifact', completed: false, order: 1 },
        { id: '3', description: 'Cliffhanger ending', completed: false, order: 2 },
      ];

      const input: OutlineInput = {
        ...createTestInput(),
        requiredPlotPoints: ['artifact'],
        requiredCharacters: ['Elena'],
      };

      const validation = service.validateOutline(beats, input);

      expect(validation.valid).toBe(true);
      expect(validation.missingPlotPoints).toHaveLength(0);
      expect(validation.missingCharacters).toHaveLength(0);
    });

    it('should detect missing plot points', () => {
      const beats: Beat[] = [
        { id: '1', description: 'Elena arrives', completed: false, order: 0 },
        { id: '2', description: 'She explores', completed: false, order: 1 },
      ];

      const input: OutlineInput = {
        ...createTestInput(),
        requiredPlotPoints: ['artifact discovery', 'temple collapse'],
      };

      const validation = service.validateOutline(beats, input);

      expect(validation.valid).toBe(false);
      expect(validation.missingPlotPoints).toContain('artifact discovery');
      expect(validation.missingPlotPoints).toContain('temple collapse');
    });

    it('should detect missing characters', () => {
      const beats: Beat[] = [
        { id: '1', description: 'Someone explores', completed: false, order: 0 },
      ];

      const input: OutlineInput = {
        ...createTestInput(),
        requiredCharacters: ['Elena', 'Marcus'],
      };

      const validation = service.validateOutline(beats, input);

      expect(validation.valid).toBe(false);
      expect(validation.missingCharacters).toContain('Elena');
      expect(validation.missingCharacters).toContain('Marcus');
    });

    it('should warn about too few beats', () => {
      const beats: Beat[] = [
        { id: '1', description: 'Only one beat', completed: false, order: 0 },
      ];

      const validation = service.validateOutline(beats, createTestInput());

      expect(validation.warnings.some((w) => w.includes('fewer than 3'))).toBe(true);
    });

    it('should warn about too many beats', () => {
      const beats: Beat[] = Array.from({ length: 15 }, (_, i) => ({
        id: String(i),
        description: `Beat ${i}`,
        completed: false,
        order: i,
      }));

      const validation = service.validateOutline(beats, createTestInput());

      expect(validation.warnings.some((w) => w.includes('more than 10'))).toBe(true);
    });

    it('should warn if hook is not mentioned in last beat', () => {
      const beats: Beat[] = [
        { id: '1', description: 'Start', completed: false, order: 0 },
        { id: '2', description: 'Middle', completed: false, order: 1 },
        { id: '3', description: 'End scene, fade to black', completed: false, order: 2 },
      ];

      const input = createTestInput();
      input.structure.hook = { type: 'cliffhanger', description: 'Temple collapses' };

      const validation = service.validateOutline(beats, input);

      expect(validation.warnings.some((w) => w.includes('cliffhanger'))).toBe(true);
    });

    it('should not warn if hook is mentioned', () => {
      const beats: Beat[] = [
        { id: '1', description: 'Start', completed: false, order: 0 },
        { id: '2', description: 'Build up', completed: false, order: 1 },
        { id: '3', description: 'Cliffhanger - temple begins to collapse', completed: false, order: 2 },
      ];

      const input = createTestInput();
      input.structure.hook = { type: 'cliffhanger', description: 'Temple collapses' };

      const validation = service.validateOutline(beats, input);

      expect(validation.warnings.filter((w) => w.includes('cliffhanger'))).toHaveLength(0);
    });
  });

  describe('token tracking', () => {
    it('should report token usage from response', async () => {
      const result = await service.generate(createTestInput());

      expect(result.tokens.prompt).toBe(100);
      expect(result.tokens.completion).toBe(200);
    });

    it('should track duration', async () => {
      const result = await service.generate(createTestInput());

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
