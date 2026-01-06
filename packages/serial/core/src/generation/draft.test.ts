/**
 * Tests for draft generation service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createDraftService, type DraftService, type DraftInput, type RevisionInput } from './draft';
import type { LLMClient, AssembledContext } from '@repo/framework-llm';
import type { Structure, Beat } from '@repo/serial-types';
import type { ExpandedBeat } from './beats';

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
      usage: { prompt_tokens: 200, completion_tokens: 500, total_tokens: 700 },
    }),
    chatStream: vi.fn().mockImplementation(async (_, callback) => {
      const chunks = responseText.split(' ');
      for (const chunk of chunks) {
        callback({
          choices: [{ delta: { content: chunk + ' ' } }],
        });
      }
    }),
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
    taskType: 'draft',
    bible: {
      characters: [
        {
          id: 'char-1',
          name: 'Elena',
          role: 'protagonist',
          description: 'A young archaeologist with a passion for ancient artifacts',
          voiceNotes: 'Speaks in short, direct sentences when stressed',
        },
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Ancient Temple',
          type: 'building',
          description: 'A crumbling stone structure hidden in the mountains',
          sensoryDetails: 'Musty air, echoing footsteps, dim light through cracks',
        },
      ],
      factions: [],
      worldRules: [],
      plotThreads: [],
      tokenCount: 0,
    },
    recentContent: [
      {
        id: 'content-prev',
        structureId: 'struct-prev',
        title: 'Prologue',
        summary: 'Elena received a mysterious letter about her missing father.',
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
      bible: 2500,
      recentContent: 2000,
      structure: 1000,
      constraints: 1000,
      task: 500,
      completion: 4000,
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

// Create test beats
function createTestBeats(): Beat[] {
  return [
    { id: 'beat-1', description: 'Elena approaches the temple entrance', completed: false, order: 0, targetWordCount: 300 },
    { id: 'beat-2', description: 'She discovers a hidden passage', completed: false, order: 1, targetWordCount: 400 },
    { id: 'beat-3', description: 'The artifact chamber is revealed', completed: false, order: 2, targetWordCount: 500 },
    { id: 'beat-4', description: 'Elena touches the artifact - cliffhanger', completed: false, order: 3, targetWordCount: 300 },
  ];
}

// Create test input
function createTestInput(): DraftInput {
  return {
    structure: createTestStructure(),
    context: createTestContext(),
    beats: createTestBeats(),
  };
}

// Sample draft text
const SAMPLE_DRAFT = `Elena approached the ancient temple with measured steps, her boots crunching on centuries of fallen stone. The air grew thick with dust and the weight of forgotten ages.

"This is it," she whispered to herself, pulling out her father's journal. The sketch matched perfectly—the crumbling pillars, the worn inscription above the entrance.

Inside, shadows danced as weak sunlight filtered through cracks in the ceiling. Elena clicked on her flashlight, its beam cutting through the gloom. Her heart hammered against her ribs.

A section of wall caught her attention. The stone here was different—smoother, more carefully placed. She ran her fingers along the edge and felt it give slightly.

"A hidden passage."

The chamber beyond took her breath away. In the center, resting on a pedestal of black stone, sat an orb that seemed to pulse with inner light.

Elena reached out, her fingers trembling. The moment she touched its surface, the orb blazed with brilliant white light.

And then she heard the voice.`;

describe('createDraftService', () => {
  let service: DraftService;
  let mockClient: LLMClient;

  beforeEach(() => {
    mockClient = createMockClient(SAMPLE_DRAFT);
    service = createDraftService(mockClient);
  });

  describe('generate', () => {
    it('should generate a draft successfully', async () => {
      const input = createTestInput();
      const result = await service.generate(input);

      expect(result.success).toBe(true);
      expect(result.text).toBe(SAMPLE_DRAFT);
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.modelId).toBe('test-model');
    });

    it('should calculate word count correctly', async () => {
      const input = createTestInput();
      const result = await service.generate(input);

      expect(result.wordCount).toBe(service.countWords(SAMPLE_DRAFT));
    });

    it('should handle LLM errors gracefully', async () => {
      mockClient.chat = vi.fn().mockRejectedValue(new Error('API error'));
      service = createDraftService(mockClient);

      const result = await service.generate(createTestInput());

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(result.text).toBe('');
    });

    it('should use custom config when provided', async () => {
      const input = createTestInput();
      await service.generate(input, {
        temperature: 0.9,
        maxTokens: 5000,
        model: 'creative-model',
      });

      expect(mockClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'creative-model',
          temperature: 0.9,
          max_tokens: 5000,
        })
      );
    });

    it('should include POV character in prompt', async () => {
      const input: DraftInput = {
        ...createTestInput(),
        povCharacter: 'Elena',
      };

      await service.generate(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Elena');
    });

    it('should include voice notes when provided', async () => {
      const input: DraftInput = {
        ...createTestInput(),
        voiceNotes: 'Speaks in short, direct sentences',
      };

      await service.generate(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Voice Notes');
    });

    it('should include previous ending for continuity', async () => {
      const input: DraftInput = {
        ...createTestInput(),
        previousEnding: '"I will find you, Father," Elena promised.',
      };

      await service.generate(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Previous chapter ended');
      expect(userMessage.content).toContain('find you, Father');
    });

    it('should include constraints in prompt', async () => {
      const input = createTestInput();
      await service.generate(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('afraid of heights');
    });

    it('should use streaming when onToken is provided', async () => {
      const tokens: string[] = [];
      const input = createTestInput();

      await service.generate(input, {
        onToken: (token) => tokens.push(token),
      });

      expect(mockClient.chatStream).toHaveBeenCalled();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should run self-review when requested', async () => {
      // Mock second call for self-review
      let callCount = 0;
      mockClient.chat = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            choices: [{ message: { content: SAMPLE_DRAFT } }],
          };
        }
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  qualityScore: 85,
                  issues: [{ type: 'pacing', severity: 30, description: 'Could slow down' }],
                  suggestions: ['Add more dialogue'],
                  shouldRegenerate: false,
                  problematicParagraphs: [2],
                }),
              },
            },
          ],
        };
      });
      service = createDraftService(mockClient);

      const result = await service.generate(createTestInput(), {
        includeSelfReview: true,
      });

      expect(result.selfReview).toBeDefined();
      expect(result.selfReview?.qualityScore).toBe(85);
      expect(result.selfReview?.issues).toHaveLength(1);
    });
  });

  describe('revise', () => {
    it('should revise a draft based on feedback', async () => {
      const revisedDraft = 'Revised draft with improvements.';
      mockClient = createMockClient(revisedDraft);
      service = createDraftService(mockClient);

      const input: RevisionInput = {
        ...createTestInput(),
        originalDraft: SAMPLE_DRAFT,
        issues: [
          { type: 'pacing', severity: 50, description: 'Too fast' },
          { type: 'voice', severity: 30, description: 'Inconsistent voice' },
        ],
        suggestions: ['Add more internal monologue', 'Slow down the discovery'],
        problematicParagraphs: [3, 5],
      };

      const result = await service.revise(input);

      expect(result.success).toBe(true);
      expect(result.text).toBe(revisedDraft);
    });

    it('should include issues in revision prompt', async () => {
      const input: RevisionInput = {
        ...createTestInput(),
        originalDraft: SAMPLE_DRAFT,
        issues: [{ type: 'continuity', severity: 80, description: 'Character knows too much' }],
        suggestions: [],
        problematicParagraphs: [4],
      };

      await service.revise(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('continuity');
      expect(userMessage.content).toContain('Character knows too much');
    });

    it('should handle revision errors gracefully', async () => {
      mockClient.chat = vi.fn().mockRejectedValue(new Error('Revision failed'));
      service = createDraftService(mockClient);

      const input: RevisionInput = {
        ...createTestInput(),
        originalDraft: SAMPLE_DRAFT,
        issues: [],
        suggestions: [],
        problematicParagraphs: [],
      };

      const result = await service.revise(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Revision failed');
    });
  });

  describe('continue', () => {
    it('should continue an incomplete draft', async () => {
      const continuation = 'The voice echoed through the chamber...';
      mockClient = createMockClient(continuation);
      service = createDraftService(mockClient);

      const partialDraft = SAMPLE_DRAFT.substring(0, 500);
      const result = await service.continue(createTestInput(), partialDraft);

      expect(result.success).toBe(true);
      expect(result.text).toContain(partialDraft);
      expect(result.text).toContain(continuation);
    });

    it('should return partial draft on error', async () => {
      mockClient.chat = vi.fn().mockRejectedValue(new Error('Continue failed'));
      service = createDraftService(mockClient);

      const partialDraft = 'Elena walked...';
      const result = await service.continue(createTestInput(), partialDraft);

      expect(result.success).toBe(false);
      expect(result.text).toBe(partialDraft);
      expect(result.wordCount).toBe(2);
    });

    it('should include continuation instructions in prompt', async () => {
      const partialDraft = 'Elena stood at the entrance.';
      await service.continue(createTestInput(), partialDraft);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('Draft So Far');
      expect(userMessage.content).toContain('Continue writing');
    });
  });

  describe('toContent', () => {
    it('should convert draft result to Content object', async () => {
      const result = await service.generate(createTestInput());
      const content = service.toContent('structure-1', result);

      expect(content.structureId).toBe('structure-1');
      expect(content.text).toBe(SAMPLE_DRAFT);
      expect(content.currentVersion).toBe(1);
      expect(content.versions).toHaveLength(1);
      expect(content.versions[0].source).toBe('generated');
      expect(content.versions[0].wordCount).toBe(result.wordCount);
      expect(content.status).toBe('draft');
      expect(content.locked).toBe(false);
    });

    it('should include model info in version metadata', async () => {
      const result = await service.generate(createTestInput());
      const content = service.toContent('structure-1', result);

      expect(content.versions[0].metadata?.modelId).toBe('test-model');
      expect(content.versions[0].metadata?.generationStage).toBe('draft');
    });
  });

  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(service.countWords('Hello world')).toBe(2);
      expect(service.countWords('One two three four five')).toBe(5);
      expect(service.countWords('  Extra   spaces  ')).toBe(2);
      expect(service.countWords('')).toBe(0);
    });

    it('should handle newlines', () => {
      expect(service.countWords('Line one\nLine two')).toBe(4);
      expect(service.countWords('Paragraph one.\n\nParagraph two.')).toBe(4);
    });
  });

  describe('splitParagraphs', () => {
    it('should split text into paragraphs', () => {
      const text = `First paragraph.

Second paragraph.

Third paragraph.`;

      const paragraphs = service.splitParagraphs(text);

      expect(paragraphs).toHaveLength(3);
      expect(paragraphs[0]).toBe('First paragraph.');
      expect(paragraphs[1]).toBe('Second paragraph.');
      expect(paragraphs[2]).toBe('Third paragraph.');
    });

    it('should handle single paragraph', () => {
      const text = 'Just one paragraph with no breaks.';
      const paragraphs = service.splitParagraphs(text);

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0]).toBe(text);
    });

    it('should filter empty paragraphs', () => {
      const text = `First.


Second.



Third.`;

      const paragraphs = service.splitParagraphs(text);

      expect(paragraphs).toHaveLength(3);
    });

    it('should trim whitespace from paragraphs', () => {
      const text = `  Padded paragraph.

  Another one.  `;

      const paragraphs = service.splitParagraphs(text);

      expect(paragraphs[0]).toBe('Padded paragraph.');
      expect(paragraphs[1]).toBe('Another one.');
    });
  });

  describe('expanded beats handling', () => {
    it('should format expanded beats with additional metadata', async () => {
      const expandedBeats: ExpandedBeat[] = [
        {
          id: 'beat-1',
          description: 'Opening scene',
          completed: false,
          order: 0,
          targetWordCount: 300,
          emotionalTone: 'tense',
          tensionLevel: 50,
        },
        {
          id: 'beat-2',
          description: 'Climax',
          completed: false,
          order: 1,
          targetWordCount: 500,
          emotionalTone: 'terrified',
          tensionLevel: 90,
        },
      ];

      const input: DraftInput = {
        ...createTestInput(),
        beats: expandedBeats,
      };

      await service.generate(input);

      const callArgs = (mockClient.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('tense');
      expect(userMessage.content).toContain('90');
    });
  });

  describe('token tracking', () => {
    it('should track duration', async () => {
      const result = await service.generate(createTestInput());

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
