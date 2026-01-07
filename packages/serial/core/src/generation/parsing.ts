/**
 * Beat parsing utilities
 *
 * Shared parsing functions for converting LLM responses into structured beats.
 * Consolidates duplicate parsing logic from outline.ts, beats.ts, and pipeline.ts.
 */

import { nanoid } from 'nanoid';
import type { Beat } from '@repo/serial-types';
import type { ExpandedBeat } from './beats';

/**
 * Options for basic outline parsing
 */
export interface OutlineParsingOptions {
  /** Minimum description length to include (default: 0) */
  minDescriptionLength?: number;
}

/**
 * Options for detailed beat parsing
 */
export interface BeatsParsingOptions {
  /** Target word count for distributing if none extracted */
  targetWordCount?: number;
  /** Whether to extract word counts from descriptions */
  extractWordCounts?: boolean;
  /** Whether to extract purpose markers [setup|development|climax|resolution|transition] */
  extractPurpose?: boolean;
  /** Whether to extract tension levels */
  extractTension?: boolean;
  /** Whether to extract sub-properties (characters, location, tone, POV) */
  extractSubProperties?: boolean;
  /** Whether to distribute word counts evenly if none extracted */
  distributeWordCounts?: boolean;
}

/**
 * Default options for outline parsing
 */
export const DEFAULT_OUTLINE_PARSING_OPTIONS: Required<OutlineParsingOptions> = {
  minDescriptionLength: 0,
};

/**
 * Default options for detailed beat parsing
 */
export const DEFAULT_BEATS_PARSING_OPTIONS: Required<BeatsParsingOptions> = {
  targetWordCount: 2000,
  extractWordCounts: true,
  extractPurpose: true,
  extractTension: true,
  extractSubProperties: true,
  distributeWordCounts: true,
};

/**
 * Regex patterns for beat parsing
 */
const PATTERNS = {
  /** Match numbered items: "1. Description" or "1) Description" */
  numberedItem: /^(\d+)[.)]\s*(.+)$/,
  /** Match bullet points: "- Description" or "* Description" */
  bulletItem: /^(?:-\s*|\*\s*)(.+)$/,
  /** Match any list item (numbered or bullet) */
  anyListItem: /^(?:\d+[.)]\s*|-\s*|\*\s*)(.+)$/,
  /** Extract word count: "(~300 words)" or "(300 words)" */
  wordCount: /\(~?(\d+)\s*words?\)/i,
  /** Extract purpose marker: "[setup]", "[climax]", etc. */
  purpose: /\[(setup|development|climax|resolution|transition)\]/i,
  /** Extract tension level: "tension: 75" or "tension 75" */
  tension: /tension[:\s]+(\d+)/i,
  /** Match sub-property line: "- characters: Elena, Marcus" */
  subProperty: /^-\s*(characters?|location|tone|pov|tension)[:\s]+(.+)$/i,
};

/**
 * Parse a simple outline response into basic beats.
 *
 * Handles numbered lists (1. 2. 3.) and bullet points (- or *).
 * Creates Beat objects with id, description, completed, and order.
 *
 * @param text - Raw text from LLM
 * @param options - Parsing options
 * @returns Array of Beat objects
 */
export function parseOutline(
  text: string,
  options: OutlineParsingOptions = {}
): Beat[] {
  const opts = { ...DEFAULT_OUTLINE_PARSING_OPTIONS, ...options };
  const beats: Beat[] = [];
  const lines = text.split('\n');
  let order = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(PATTERNS.anyListItem);
    if (match) {
      const description = match[1].trim();
      // Skip empty or too-short descriptions
      if (description.length > opts.minDescriptionLength) {
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
 * Parse a detailed beats response with optional metadata extraction.
 *
 * Handles numbered items with annotations like word counts, purpose markers,
 * tension levels, and sub-properties (characters, location, tone, POV).
 *
 * @param text - Raw text from LLM
 * @param options - Parsing options
 * @returns Array of ExpandedBeat objects (Beat-compatible with optional metadata)
 */
export function parseBeats(
  text: string,
  options: BeatsParsingOptions = {}
): ExpandedBeat[] {
  const opts = { ...DEFAULT_BEATS_PARSING_OPTIONS, ...options };
  const beats: Array<Partial<ExpandedBeat>> = [];
  const lines = text.split('\n');
  let currentBeat: Partial<ExpandedBeat> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for numbered item (starts a new beat)
    const numberMatch = trimmed.match(PATTERNS.numberedItem);
    if (numberMatch) {
      // Save previous beat if exists
      if (currentBeat && currentBeat.description) {
        beats.push(currentBeat);
      }

      // Parse the description and extract metadata
      let description = numberMatch[2];
      const beatData: Partial<ExpandedBeat> = {};

      // Extract word count
      if (opts.extractWordCounts) {
        const wordCountMatch = description.match(PATTERNS.wordCount);
        if (wordCountMatch) {
          beatData.targetWordCount = parseInt(wordCountMatch[1], 10);
          description = description.replace(PATTERNS.wordCount, '');
        }
      }

      // Extract purpose marker
      if (opts.extractPurpose) {
        const purposeMatch = description.match(PATTERNS.purpose);
        if (purposeMatch) {
          beatData.purpose = purposeMatch[1].toLowerCase() as ExpandedBeat['purpose'];
          description = description.replace(PATTERNS.purpose, '');
        }
      }

      // Extract tension level from description
      if (opts.extractTension) {
        const tensionMatch = description.match(PATTERNS.tension);
        if (tensionMatch) {
          beatData.tensionLevel = parseInt(tensionMatch[1], 10);
          description = description.replace(PATTERNS.tension, '');
        }
      }

      currentBeat = {
        ...beatData,
        description: description.trim(),
      };
    }
    // Check for sub-properties of current beat
    else if (currentBeat && opts.extractSubProperties && trimmed.startsWith('-')) {
      const propMatch = trimmed.match(PATTERNS.subProperty);
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
    beats.push(currentBeat);
  }

  // Finalize beats with sequential order based on array position
  const finalizedBeats = beats.map((b, i) => finalizeBeat(b, i));

  // Distribute word counts evenly if none extracted
  if (
    opts.distributeWordCounts &&
    finalizedBeats.length > 0 &&
    finalizedBeats.every((b) => !b.targetWordCount)
  ) {
    const perBeat = Math.floor(opts.targetWordCount / finalizedBeats.length);
    for (const beat of finalizedBeats) {
      beat.targetWordCount = perBeat;
    }
  }

  return finalizedBeats;
}

/**
 * Finalize a partial beat with defaults.
 *
 * @param partial - Partial beat data
 * @param order - Beat order in sequence
 * @returns Complete Beat or ExpandedBeat
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
 * Pre-configured parser for simple outlines.
 *
 * Used by outline.ts - parses numbered/bullet lists with minimum description length of 3.
 */
export function parseSimpleOutline(text: string): Beat[] {
  return parseOutline(text, { minDescriptionLength: 3 });
}

/**
 * Pre-configured parser for detailed beats with full metadata.
 *
 * Used by beats.ts - extracts all metadata including sub-properties.
 */
export function parseDetailedBeats(text: string, targetWordCount?: number): ExpandedBeat[] {
  return parseBeats(text, {
    targetWordCount: targetWordCount ?? 2000,
    extractWordCounts: true,
    extractPurpose: true,
    extractTension: true,
    extractSubProperties: true,
    distributeWordCounts: true,
  });
}

/**
 * Pre-configured parser for pipeline outline stage.
 *
 * Used by pipeline.ts for outline stage - simple list parsing with no minimum length.
 */
export function parsePipelineOutline(text: string): Beat[] {
  return parseOutline(text, { minDescriptionLength: 0 });
}

/**
 * Pre-configured parser for pipeline beats stage.
 *
 * Used by pipeline.ts for beats stage - extracts only word counts, no sub-properties.
 * Returns ExpandedBeat[] but callers can use as Beat[] since ExpandedBeat extends Beat.
 */
export function parsePipelineBeats(text: string): ExpandedBeat[] {
  return parseBeats(text, {
    extractWordCounts: true,
    extractPurpose: false,
    extractTension: false,
    extractSubProperties: false,
    distributeWordCounts: false,
  });
}
