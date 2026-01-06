/**
 * Beat expansion service
 *
 * Expands high-level outlines into detailed story beats with
 * word count targets and emotional/pacing markers.
 */

import { nanoid } from 'nanoid';
import type { Beat, Structure } from '@repo/serial-types';
import type { LLMClient, AssembledContext } from '@repo/framework-llm';

import { buildStageMessages } from './prompts';
import type { GenerationOptions, StageResult } from './types';
import { DEFAULT_GENERATION_OPTIONS } from './types';

/**
 * Beat expansion configuration
 */
export interface BeatsConfig {
  /** Model to use (overrides client default) */
  model?: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Maximum tokens for completion */
  maxTokens?: number;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Style guidance */
  styleGuidance?: string;
  /** Target word count for the full chapter */
  targetWordCount?: number;
  /** Distribute word counts evenly or based on beat importance */
  wordCountDistribution?: 'even' | 'weighted';
}

/**
 * Default beat expansion configuration
 */
export const DEFAULT_BEATS_CONFIG: Required<
  Omit<BeatsConfig, 'model' | 'systemPrompt' | 'styleGuidance'>
> = {
  temperature: 0.7,
  maxTokens: 2500,
  targetWordCount: 2000,
  wordCountDistribution: 'weighted',
};

/**
 * Beat expansion input
 */
export interface BeatsInput {
  /** Structure to expand beats for */
  structure: Structure;
  /** Assembled context */
  context: AssembledContext;
  /** Initial outline beats to expand */
  outlineBeats: Beat[];
  /** POV character ID */
  povCharacterId?: string;
  /** Pacing preference */
  pacingPreference?: 'slow' | 'moderate' | 'fast';
}

/**
 * Expanded beat with additional details
 */
export interface ExpandedBeat extends Beat {
  /** Purpose of this beat in the narrative */
  purpose?: 'setup' | 'development' | 'climax' | 'resolution' | 'transition';
  /** POV character for this beat */
  povCharacter?: string;
  /** Emotional tone */
  emotionalTone?: string;
  /** Characters involved */
  charactersInvolved?: string[];
  /** Location for this beat */
  location?: string;
  /** Suggested tension level (0-100) */
  tensionLevel?: number;
}

/**
 * Beat expansion result
 */
export interface BeatsResult {
  /** Whether expansion succeeded */
  success: boolean;
  /** Expanded beats */
  beats: ExpandedBeat[];
  /** Raw text from LLM */
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
  /** Total target word count */
  totalWordCount: number;
}

/**
 * Beat service interface
 */
export interface BeatsService {
  /**
   * Expand outline beats into detailed beats
   */
  expand(input: BeatsInput, config?: BeatsConfig): Promise<BeatsResult>;

  /**
   * Adjust word counts for beats to hit a target
   */
  adjustWordCounts(beats: ExpandedBeat[], targetTotal: number): ExpandedBeat[];

  /**
   * Reorder beats while preserving narrative flow
   */
  reorderBeats(beats: ExpandedBeat[], newOrder: string[]): ExpandedBeat[];

  /**
   * Split a beat into multiple smaller beats
   */
  splitBeat(beat: ExpandedBeat, splitCount: number): ExpandedBeat[];

  /**
   * Merge multiple beats into one
   */
  mergeBeats(beats: ExpandedBeat[]): ExpandedBeat;

  /**
   * Parse raw beat text into structured beats
   */
  parseBeats(text: string, targetWordCount?: number): ExpandedBeat[];
}

/**
 * Format outline beats for prompt
 */
function formatOutlineBeats(beats: Beat[]): string {
  return beats
    .sort((a, b) => a.order - b.order)
    .map((beat, i) => `${i + 1}. ${beat.description}`)
    .join('\n');
}

/**
 * Format context for prompt
 */
function formatContext(context: AssembledContext): string {
  const sections: string[] = [];

  // Format characters
  if (context.bible.characters.length > 0) {
    sections.push('### Characters');
    for (const char of context.bible.characters) {
      const name = 'name' in char ? char.name : char.name;
      const role = 'role' in char ? char.role : '';
      sections.push(`- **${name}** (${role})`);
    }
  }

  // Format locations
  if (context.bible.locations.length > 0) {
    sections.push('\n### Locations');
    for (const loc of context.bible.locations) {
      const name = 'name' in loc ? loc.name : loc.name;
      sections.push(`- **${name}**`);
    }
  }

  // Format recent content summaries
  if (context.recentContent.length > 0) {
    sections.push('\n### Recent Events');
    for (const content of context.recentContent) {
      sections.push(`**${content.title}**: ${content.summary}`);
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
  return lines.join('\n');
}

/**
 * Parse beats response into expanded beats
 */
function parseBeatsResponse(text: string, targetWordCount: number = 2000): ExpandedBeat[] {
  const beats: ExpandedBeat[] = [];
  const lines = text.split('\n');
  let order = 0;
  let currentBeat: Partial<ExpandedBeat> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Match numbered items: "1. Description (~300 words)"
    const numberMatch = trimmed.match(/^(\d+)[.)]\s*(.+)$/);
    if (numberMatch) {
      // Save previous beat
      if (currentBeat && currentBeat.description) {
        beats.push(finalizeBeat(currentBeat, order++));
      }

      // Start new beat
      const description = numberMatch[2];

      // Extract word count if present
      const wordCountMatch = description.match(/\(~?(\d+)\s*words?\)/i);
      const targetWords = wordCountMatch ? parseInt(wordCountMatch[1], 10) : undefined;

      // Extract purpose if present
      const purposeMatch = description.match(/\[(setup|development|climax|resolution|transition)\]/i);
      const purpose = purposeMatch
        ? (purposeMatch[1].toLowerCase() as ExpandedBeat['purpose'])
        : undefined;

      // Extract tension level if present
      const tensionMatch = description.match(/tension[:\s]+(\d+)/i);
      const tensionLevel = tensionMatch ? parseInt(tensionMatch[1], 10) : undefined;

      // Clean description
      let cleanDescription = description
        .replace(/\(~?\d+\s*words?\)/i, '')
        .replace(/\[(setup|development|climax|resolution|transition)\]/i, '')
        .replace(/tension[:\s]+\d+/i, '')
        .trim();

      currentBeat = {
        description: cleanDescription,
        targetWordCount: targetWords,
        purpose,
        tensionLevel,
      };
    }
    // Check for sub-properties of the current beat
    else if (currentBeat && trimmed.startsWith('-')) {
      const propMatch = trimmed.match(/^-\s*(characters?|location|tone|pov|tension)[:\s]+(.+)$/i);
      if (propMatch) {
        const propName = propMatch[1].toLowerCase();
        const propValue = propMatch[2].trim();

        if (propName === 'character' || propName === 'characters') {
          currentBeat.charactersInvolved = propValue.split(',').map((c) => c.trim());
        } else if (propName === 'location') {
          currentBeat.location = propValue;
        } else if (propName === 'tone') {
          currentBeat.emotionalTone = propValue;
        } else if (propName === 'pov') {
          currentBeat.povCharacter = propValue;
        } else if (propName === 'tension') {
          const tensionNum = parseInt(propValue, 10);
          if (!isNaN(tensionNum)) {
            currentBeat.tensionLevel = tensionNum;
          }
        }
      }
    }
  }

  // Don't forget the last beat
  if (currentBeat && currentBeat.description) {
    beats.push(finalizeBeat(currentBeat, order++));
  }

  // If no word counts were extracted, distribute evenly
  if (beats.length > 0 && beats.every((b) => !b.targetWordCount)) {
    const perBeat = Math.floor(targetWordCount / beats.length);
    for (const beat of beats) {
      beat.targetWordCount = perBeat;
    }
  }

  return beats;
}

/**
 * Finalize a beat with defaults
 */
function finalizeBeat(partial: Partial<ExpandedBeat>, order: number): ExpandedBeat {
  return {
    id: nanoid(),
    description: partial.description || '',
    completed: false,
    order,
    targetWordCount: partial.targetWordCount,
    purpose: partial.purpose,
    povCharacter: partial.povCharacter,
    emotionalTone: partial.emotionalTone,
    charactersInvolved: partial.charactersInvolved,
    location: partial.location,
    tensionLevel: partial.tensionLevel,
  };
}

/**
 * Create the beats service
 */
export function createBeatsService(client: LLMClient): BeatsService {
  /**
   * Build prompt placeholders
   */
  function buildPlaceholders(
    input: BeatsInput,
    config: Required<Omit<BeatsConfig, 'model' | 'systemPrompt' | 'styleGuidance'>> & Partial<BeatsConfig>
  ): {
    context: string;
    structure: string;
    beats?: string;
    styleGuidance?: string;
    targetWordCount?: number;
    constraints?: string;
  } {
    const { structure, context, outlineBeats } = input;

    // Format context for prompt
    const formattedContext = formatContext(context);

    // Format structure
    const structureText = formatStructure(structure);

    // Format outline beats
    const beatsText = formatOutlineBeats(outlineBeats);

    // Format constraints
    const constraintsText = context.constraints.length > 0
      ? context.constraints.map((c) => `- ${c.statement}`).join('\n')
      : undefined;

    // Add pacing guidance if specified
    let styleGuidance = config.styleGuidance || '';
    if (input.pacingPreference) {
      const pacingGuide: Record<string, string> = {
        slow: 'Focus on atmosphere, description, and character interiority. Allow scenes to breathe.',
        moderate: 'Balance action with reflection. Mix dialogue, description, and action.',
        fast: 'Keep momentum high. Short scenes, quick cuts, focus on action and dialogue.',
      };
      styleGuidance += `\n\nPacing: ${pacingGuide[input.pacingPreference]}`;
    }

    // Add POV guidance if specified
    if (input.povCharacterId) {
      styleGuidance += `\n\nPOV Character: Write from ${input.povCharacterId}'s perspective.`;
    }

    return {
      context: formattedContext,
      structure: structureText,
      beats: beatsText,
      styleGuidance: styleGuidance.trim() || undefined,
      targetWordCount: config.targetWordCount,
      constraints: constraintsText,
    };
  }

  /**
   * Expand outline beats into detailed beats
   */
  async function expand(input: BeatsInput, config?: BeatsConfig): Promise<BeatsResult> {
    const mergedConfig = {
      ...DEFAULT_BEATS_CONFIG,
      ...config,
    };

    const startTime = Date.now();
    const model = mergedConfig.model || client.getConfig().defaultModel;

    try {
      // Build messages
      const placeholders = buildPlaceholders(input, mergedConfig);
      const messages = buildStageMessages('beats', placeholders, mergedConfig.systemPrompt);

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
      const beats = parseBeatsResponse(responseText, mergedConfig.targetWordCount);

      // Calculate total word count
      const totalWordCount = beats.reduce((sum, b) => sum + (b.targetWordCount || 0), 0);

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
        totalWordCount,
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
        totalWordCount: 0,
      };
    }
  }

  /**
   * Adjust word counts for beats to hit a target
   */
  function adjustWordCounts(beats: ExpandedBeat[], targetTotal: number): ExpandedBeat[] {
    if (beats.length === 0) return beats;

    const currentTotal = beats.reduce((sum, b) => sum + (b.targetWordCount || 0), 0);
    if (currentTotal === 0) {
      // Distribute evenly
      const perBeat = Math.floor(targetTotal / beats.length);
      return beats.map((b) => ({ ...b, targetWordCount: perBeat }));
    }

    // Scale proportionally
    const ratio = targetTotal / currentTotal;
    return beats.map((b) => ({
      ...b,
      targetWordCount: b.targetWordCount ? Math.round(b.targetWordCount * ratio) : undefined,
    }));
  }

  /**
   * Reorder beats while preserving narrative flow
   */
  function reorderBeats(beats: ExpandedBeat[], newOrder: string[]): ExpandedBeat[] {
    const beatMap = new Map(beats.map((b) => [b.id, b]));
    const reordered: ExpandedBeat[] = [];

    for (let i = 0; i < newOrder.length; i++) {
      const beat = beatMap.get(newOrder[i]);
      if (beat) {
        reordered.push({ ...beat, order: i });
      }
    }

    // Add any beats not in the new order at the end
    for (const beat of beats) {
      if (!newOrder.includes(beat.id)) {
        reordered.push({ ...beat, order: reordered.length });
      }
    }

    return reordered;
  }

  /**
   * Split a beat into multiple smaller beats
   */
  function splitBeat(beat: ExpandedBeat, splitCount: number): ExpandedBeat[] {
    if (splitCount < 2) return [beat];

    const wordCountPerBeat = beat.targetWordCount
      ? Math.floor(beat.targetWordCount / splitCount)
      : undefined;

    const splitBeats: ExpandedBeat[] = [];
    for (let i = 0; i < splitCount; i++) {
      splitBeats.push({
        id: nanoid(),
        description: `${beat.description} (part ${i + 1}/${splitCount})`,
        completed: false,
        order: beat.order + i * 0.1, // Fractional order to maintain position
        targetWordCount: wordCountPerBeat,
        purpose: beat.purpose,
        povCharacter: beat.povCharacter,
        emotionalTone: beat.emotionalTone,
        charactersInvolved: beat.charactersInvolved,
        location: beat.location,
        tensionLevel: beat.tensionLevel,
      });
    }

    return splitBeats;
  }

  /**
   * Merge multiple beats into one
   */
  function mergeBeats(beats: ExpandedBeat[]): ExpandedBeat {
    if (beats.length === 0) {
      return {
        id: nanoid(),
        description: '',
        completed: false,
        order: 0,
      };
    }

    if (beats.length === 1) {
      return beats[0];
    }

    // Sort by order
    const sorted = [...beats].sort((a, b) => a.order - b.order);

    // Combine descriptions
    const description = sorted.map((b) => b.description).join(' → ');

    // Sum word counts
    const totalWordCount = sorted.reduce((sum, b) => sum + (b.targetWordCount || 0), 0);

    // Collect unique characters
    const allCharacters = new Set<string>();
    for (const beat of sorted) {
      if (beat.charactersInvolved) {
        for (const char of beat.charactersInvolved) {
          allCharacters.add(char);
        }
      }
    }

    // Use highest tension level
    const maxTension = Math.max(...sorted.map((b) => b.tensionLevel || 0));

    return {
      id: nanoid(),
      description,
      completed: sorted.every((b) => b.completed),
      order: sorted[0].order,
      targetWordCount: totalWordCount > 0 ? totalWordCount : undefined,
      purpose: sorted[sorted.length - 1].purpose, // Use last beat's purpose
      povCharacter: sorted[0].povCharacter, // Use first beat's POV
      emotionalTone: sorted[sorted.length - 1].emotionalTone, // Use last beat's tone
      charactersInvolved: allCharacters.size > 0 ? Array.from(allCharacters) : undefined,
      location: sorted[sorted.length - 1].location, // Use last beat's location
      tensionLevel: maxTension > 0 ? maxTension : undefined,
    };
  }

  /**
   * Parse raw beat text into structured beats
   */
  function parseBeats(text: string, targetWordCount?: number): ExpandedBeat[] {
    return parseBeatsResponse(text, targetWordCount);
  }

  return {
    expand,
    adjustWordCounts,
    reorderBeats,
    splitBeat,
    mergeBeats,
    parseBeats,
  };
}
