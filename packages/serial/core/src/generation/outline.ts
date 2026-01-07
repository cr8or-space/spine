/**
 * Outline generation service
 *
 * Generates high-level chapter outlines from story context.
 * This is the first stage in the generation pipeline.
 */

import { nanoid } from 'nanoid';
import type { Beat, Structure } from '@repo/serial-types';
import type { LLMClient, AssembledContext } from '@repo/framework-llm';

import { buildStageMessages } from './prompts';

/**
 * Outline generation configuration
 */
export interface OutlineConfig {
  /** Model to use (overrides client default) */
  model?: string;
  /** Temperature for generation (0-2, lower for more focused outlines) */
  temperature?: number;
  /** Maximum tokens for completion */
  maxTokens?: number;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Style guidance for the outline */
  styleGuidance?: string;
  /** Number of beats to target */
  targetBeatCount?: number;
}

/**
 * Default outline configuration
 */
export const DEFAULT_OUTLINE_CONFIG: Required<Omit<OutlineConfig, 'model' | 'systemPrompt' | 'styleGuidance'>> = {
  temperature: 0.6, // Slightly lower for more focused outlines
  maxTokens: 2000,
  targetBeatCount: 5,
};

/**
 * Outline generation input
 */
export interface OutlineInput {
  /** Structure to generate outline for */
  structure: Structure;
  /** Assembled context for the generation */
  context: AssembledContext;
  /** Previous chapter summary (for continuity) */
  previousChapterSummary?: string;
  /** Specific plot points to address */
  requiredPlotPoints?: string[];
  /** Characters that must appear */
  requiredCharacters?: string[];
}

/**
 * Outline generation result
 */
export interface OutlineResult {
  /** Whether generation succeeded */
  success: boolean;
  /** Generated beats */
  beats: Beat[];
  /** Raw outline text from LLM */
  rawText: string;
  /** Token usage */
  tokens: {
    prompt: number;
    completion: number;
  };
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Model used */
  modelId: string;
}

/**
 * Outline service interface
 */
export interface OutlineService {
  /**
   * Generate an outline for a structure
   */
  generate(input: OutlineInput, config?: OutlineConfig): Promise<OutlineResult>;

  /**
   * Regenerate outline with different parameters
   */
  regenerate(
    input: OutlineInput,
    previousResult: OutlineResult,
    config?: OutlineConfig
  ): Promise<OutlineResult>;

  /**
   * Parse raw outline text into beats
   */
  parseOutline(text: string): Beat[];

  /**
   * Validate that an outline covers required elements
   */
  validateOutline(beats: Beat[], input: OutlineInput): OutlineValidation;
}

/**
 * Outline validation result
 */
export interface OutlineValidation {
  /** Whether outline is valid */
  valid: boolean;
  /** Missing required plot points */
  missingPlotPoints: string[];
  /** Missing required characters */
  missingCharacters: string[];
  /** Warnings about the outline */
  warnings: string[];
}

// Type helper for entities that might be Character, CharacterSummary, etc.
interface EntityWithName {
  name: string;
  role?: string;
  type?: string;
  status?: string;
  description?: string;
}

/**
 * Format context for prompt
 */
function formatContext(context: AssembledContext): string {
  const sections: string[] = [];

  // Format characters
  if (context.bible.characters.length > 0) {
    sections.push('### Characters');
    for (const char of context.bible.characters as unknown as EntityWithName[]) {
      const name = char.name;
      const role = char.role ?? '';
      const description = char.description ?? '';
      sections.push(`- **${name}** (${role}): ${description}`);
    }
  }

  // Format locations
  if (context.bible.locations.length > 0) {
    sections.push('\n### Locations');
    for (const loc of context.bible.locations as unknown as EntityWithName[]) {
      const name = loc.name;
      const type = loc.type ?? '';
      const description = loc.description ?? '';
      sections.push(`- **${name}** (${type}): ${description}`);
    }
  }

  // Format recent content
  if (context.recentContent.length > 0) {
    sections.push('\n### Recent Events');
    for (const content of context.recentContent) {
      sections.push(`**${content.title}**: ${content.summary}`);
    }
  }

  // Format active plot threads
  if (context.bible.plotThreads.length > 0) {
    sections.push('\n### Active Plot Threads');
    for (const thread of context.bible.plotThreads as unknown as EntityWithName[]) {
      const name = thread.name;
      const type = thread.type ?? '';
      const status = thread.status ?? '';
      if (status === 'active' || status === 'planned') {
        sections.push(`- **${name}** (${type}): ${status}`);
      }
    }
  }

  return sections.join('\n');
}

/**
 * Format structure for prompt
 */
function formatStructure(structure: Structure): string {
  const lines: string[] = [];
  lines.push(`**${structure.type.toUpperCase()}**: ${structure.title}`);
  if (structure.summary) {
    lines.push(`Summary: ${structure.summary}`);
  }
  if (structure.chapterType) {
    lines.push(`Type: ${structure.chapterType}`);
  }
  if (structure.tensionTarget !== undefined) {
    lines.push(`Tension Target: ${structure.tensionTarget}/100`);
  }
  if (structure.hook) {
    lines.push(`Hook: ${structure.hook.type} - ${structure.hook.description}`);
  }
  if (structure.notes) {
    lines.push(`Notes: ${structure.notes}`);
  }
  return lines.join('\n');
}

/**
 * Parse outline response into beats
 */
function parseOutlineResponse(text: string): Beat[] {
  const beats: Beat[] = [];
  const lines = text.split('\n');
  let order = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Match numbered items or bullet points
    const match = trimmed.match(/^(?:\d+[.)]\s*|-\s*|\*\s*)(.+)$/);
    if (match) {
      const description = match[1].trim();
      // Skip empty or very short descriptions
      if (description.length > 3) {
        beats.push({
          id: nanoid(),
          description,
          completed: false,
          order: order++,
        });
      }
    }
  }

  return beats;
}

/**
 * Create the outline service
 */
export function createOutlineService(client: LLMClient): OutlineService {
  /**
   * Build prompt placeholders
   */
  function buildPlaceholders(
    input: OutlineInput,
    config: Required<Omit<OutlineConfig, 'model' | 'systemPrompt' | 'styleGuidance'>> & Partial<OutlineConfig>
  ): {
    context: string;
    structure: string;
    styleGuidance?: string;
    constraints?: string;
    hookRequirements?: string;
    tensionTarget?: number;
    targetWordCount?: number;
  } {
    const { structure, context } = input;

    // Format context for prompt
    const formattedContext = formatContext(context);

    // Format structure
    const structureText = formatStructure(structure);

    // Format constraints
    const constraintsText = context.constraints.length > 0
      ? context.constraints.map((c) => `- ${c.statement}`).join('\n')
      : undefined;

    // Add required elements to constraints
    let additionalConstraints = '';
    if (input.requiredPlotPoints && input.requiredPlotPoints.length > 0) {
      additionalConstraints += '\n\nRequired plot points to address:\n';
      additionalConstraints += input.requiredPlotPoints.map((p) => `- ${p}`).join('\n');
    }
    if (input.requiredCharacters && input.requiredCharacters.length > 0) {
      additionalConstraints += '\n\nRequired characters to include:\n';
      additionalConstraints += input.requiredCharacters.map((c) => `- ${c}`).join('\n');
    }

    const finalConstraints = constraintsText
      ? constraintsText + additionalConstraints
      : additionalConstraints || undefined;

    // Previous chapter context
    let fullContext = formattedContext;
    if (input.previousChapterSummary) {
      fullContext = `### Previous Chapter\n${input.previousChapterSummary}\n\n${formattedContext}`;
    }

    // Hook requirements
    const hookRequirements = structure.hook?.type || 'engaging';

    return {
      context: fullContext,
      structure: structureText,
      styleGuidance: config.styleGuidance,
      constraints: finalConstraints,
      hookRequirements,
      tensionTarget: structure.tensionTarget,
      targetWordCount: structure.targetWordCount,
    };
  }

  /**
   * Generate an outline
   */
  async function generate(input: OutlineInput, config?: OutlineConfig): Promise<OutlineResult> {
    const mergedConfig = {
      ...DEFAULT_OUTLINE_CONFIG,
      ...config,
    };

    const startTime = Date.now();
    const model = mergedConfig.model || client.getConfig().defaultModel;

    try {
      // Build messages
      const placeholders = buildPlaceholders(input, mergedConfig);
      const messages = buildStageMessages('outline', placeholders, mergedConfig.systemPrompt);

      // Make LLM request
      const response = await client.chat({
        model,
        messages,
        temperature: mergedConfig.temperature,
        max_tokens: mergedConfig.maxTokens,
      });

      const responseText = response.choices[0]?.message?.content || '';
      const durationMs = Date.now() - startTime;

      // Parse response into beats
      const beats = parseOutlineResponse(responseText);

      return {
        success: true,
        beats,
        rawText: responseText,
        tokens: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
        },
        durationMs,
        modelId: model,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        beats: [],
        rawText: '',
        tokens: { prompt: 0, completion: 0 },
        durationMs,
        error: error instanceof Error ? error.message : String(error),
        modelId: model,
      };
    }
  }

  /**
   * Regenerate outline with modifications
   */
  async function regenerate(
    input: OutlineInput,
    previousResult: OutlineResult,
    config?: OutlineConfig
  ): Promise<OutlineResult> {
    // Add previous attempt to context for the LLM to improve upon
    const enhancedConfig: OutlineConfig = {
      ...config,
      styleGuidance: config?.styleGuidance
        ? `${config.styleGuidance}\n\nPrevious attempt (improve upon this):\n${previousResult.rawText}`
        : `Improve upon this previous attempt:\n${previousResult.rawText}`,
    };

    return generate(input, enhancedConfig);
  }

  /**
   * Parse raw outline text into beats
   */
  function parseOutline(text: string): Beat[] {
    return parseOutlineResponse(text);
  }

  /**
   * Validate that an outline covers required elements
   */
  function validateOutline(beats: Beat[], input: OutlineInput): OutlineValidation {
    const warnings: string[] = [];
    const missingPlotPoints: string[] = [];
    const missingCharacters: string[] = [];

    // Check beat count
    if (beats.length < 3) {
      warnings.push('Outline has fewer than 3 beats, may need more detail');
    }
    if (beats.length > 10) {
      warnings.push('Outline has more than 10 beats, may need consolidation');
    }

    // Check for required plot points
    if (input.requiredPlotPoints) {
      const beatsText = beats.map((b) => b.description.toLowerCase()).join(' ');
      for (const plotPoint of input.requiredPlotPoints) {
        // Simple keyword check - could be enhanced with fuzzy matching
        const keywords = plotPoint.toLowerCase().split(/\s+/);
        const found = keywords.some((kw) => beatsText.includes(kw));
        if (!found) {
          missingPlotPoints.push(plotPoint);
        }
      }
    }

    // Check for required characters
    if (input.requiredCharacters) {
      const beatsText = beats.map((b) => b.description.toLowerCase()).join(' ');
      for (const character of input.requiredCharacters) {
        if (!beatsText.includes(character.toLowerCase())) {
          missingCharacters.push(character);
        }
      }
    }

    // Check for hook presence if structure has hook
    if (input.structure.hook) {
      const lastBeat = beats[beats.length - 1];
      if (lastBeat) {
        const hookKeywords = ['hook', 'cliffhanger', 'reveal', 'twist', 'question', 'decision'];
        const hasHookMention = hookKeywords.some((kw) =>
          lastBeat.description.toLowerCase().includes(kw)
        );
        if (!hasHookMention) {
          warnings.push(`Last beat may not adequately set up the ${input.structure.hook.type} hook`);
        }
      }
    }

    return {
      valid: missingPlotPoints.length === 0 && missingCharacters.length === 0,
      missingPlotPoints,
      missingCharacters,
      warnings,
    };
  }

  return {
    generate,
    regenerate,
    parseOutline,
    validateOutline,
  };
}
