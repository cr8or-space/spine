/**
 * Content summarization utilities
 *
 * Converts full entities to summaries for token-efficient context assembly.
 */

import type {
  Character,
  CharacterSummary,
  Content,
  Faction,
  FactionSummary,
  Location,
  LocationSummary,
  PlotThread,
  PlotThreadSummary,
  Structure,
  WorldRule,
  WorldRuleSummary,
} from '@repo/serial-types';

import { countTokens } from '../token-counter';
import type { ContentContext } from './types';

/**
 * Summarize a character to minimal form
 */
export function summarizeCharacter(character: Character): CharacterSummary {
  // Create a brief from the first sentence of description or a trait summary
  let brief = character.description.split('.')[0] + '.';

  // If brief is too long, use role and key trait
  if (brief.length > 100) {
    const keyTrait = character.traits[0];
    brief = keyTrait
      ? `${character.role} character with ${keyTrait.name.toLowerCase()} trait.`
      : `${character.role} character.`;
  }

  return {
    id: character.id,
    name: character.name,
    aliases: character.aliases,
    role: character.role,
    status: character.status,
    brief,
  };
}

/**
 * Summarize a location to minimal form
 */
export function summarizeLocation(location: Location): LocationSummary {
  // Create a brief from the first sentence of description
  let brief = location.description.split('.')[0] + '.';

  // If brief is too long, use type and atmosphere
  if (brief.length > 100) {
    brief = location.atmosphere
      ? `${location.type}: ${location.atmosphere.split('.')[0]}.`
      : `A ${location.type}.`;
  }

  return {
    id: location.id,
    name: location.name,
    type: location.type,
    parentId: location.parentId,
    brief,
  };
}

/**
 * Summarize a faction to minimal form
 */
export function summarizeFaction(faction: Faction): FactionSummary {
  // Create a brief from ideology or first goal
  let brief: string;

  if (faction.ideology) {
    brief = faction.ideology.split('.')[0] + '.';
  } else if (faction.goals.length > 0) {
    brief = `Primary goal: ${faction.goals[0]}`;
  } else {
    brief = `A ${faction.influence} ${faction.type} organization.`;
  }

  // Truncate if too long
  if (brief.length > 100) {
    brief = brief.substring(0, 97) + '...';
  }

  return {
    id: faction.id,
    name: faction.name,
    type: faction.type,
    influence: faction.influence,
    brief,
  };
}

/**
 * Summarize a world rule to minimal form
 */
export function summarizeWorldRule(rule: WorldRule): WorldRuleSummary {
  return {
    id: rule.id,
    name: rule.name,
    category: rule.category,
    rule: rule.rule,
    priority: rule.priority,
  };
}

/**
 * Summarize a plot thread to minimal form
 */
export function summarizePlotThread(thread: PlotThread): PlotThreadSummary {
  // Create a brief from description
  let brief = thread.description.split('.')[0] + '.';

  // Truncate if too long
  if (brief.length > 100) {
    brief = brief.substring(0, 97) + '...';
  }

  return {
    id: thread.id,
    name: thread.name,
    type: thread.type,
    status: thread.status,
    priority: thread.priority,
    brief,
  };
}

/**
 * Summarize content for context assembly
 *
 * Creates a condensed representation of content for LLM context.
 */
export function summarizeContent(
  content: Content,
  structure: Structure,
  options?: {
    maxSummaryLength?: number;
    includeKeyEvents?: boolean;
    includeCharacters?: boolean;
    includeLocations?: boolean;
  }
): ContentContext {
  const maxLength = options?.maxSummaryLength ?? 500;

  // Extract summary from content text
  // For now, use first few sentences - in production, this would be LLM-generated
  const sentences = content.text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  let summary = sentences.slice(0, 3).join('. ') + '.';

  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }

  const result: ContentContext = {
    id: content.id,
    structureId: content.structureId,
    chapterNumber: content.chapterNumber,
    title: structure.title,
    summary,
    tokenCount: countTokens(summary),
  };

  // Optionally extract key events, characters, locations
  // These would typically be stored in content analysis
  if (options?.includeKeyEvents && content.analysis?.continuityIssues) {
    // Extract events from continuity tracking
    result.keyEvents = [];
  }

  return result;
}

/**
 * Create a condensed text representation of a structure
 */
export function summarizeStructure(structure: Structure): string {
  const parts: string[] = [];

  // Title and type
  parts.push(`${structure.type.toUpperCase()}: ${structure.title}`);

  // Summary
  if (structure.summary) {
    parts.push(structure.summary);
  }

  // Beats
  if (structure.beats.length > 0) {
    parts.push('Beats:');
    for (const beat of structure.beats) {
      parts.push(`- ${beat.description}`);
    }
  }

  // Tension target
  if (structure.tensionTarget !== undefined) {
    parts.push(`Tension target: ${structure.tensionTarget}`);
  }

  // Hook
  if (structure.hook) {
    parts.push(`Hook (${structure.hook.type}): ${structure.hook.description}`);
  }

  // Notes
  if (structure.notes) {
    parts.push(`Notes: ${structure.notes}`);
  }

  return parts.join('\n');
}

/**
 * Truncate content text to fit within token budget
 */
export function truncateContentText(text: string, maxTokens: number): string {
  const currentTokens = countTokens(text);

  if (currentTokens <= maxTokens) {
    return text;
  }

  // Approximate characters per token
  const charsPerToken = 4;
  const targetChars = maxTokens * charsPerToken;

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, targetChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (lastSentenceEnd > targetChars * 0.8) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }

  // Fall back to word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > targetChars * 0.9) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Calculate token count for an entity
 */
export function calculateEntityTokens(
  entity: Character | Location | Faction | WorldRule | PlotThread
): number {
  return countTokens(JSON.stringify(entity));
}

/**
 * Calculate token count for a summary
 */
export function calculateSummaryTokens(
  summary: CharacterSummary | LocationSummary | FactionSummary | WorldRuleSummary | PlotThreadSummary
): number {
  return countTokens(JSON.stringify(summary));
}

/**
 * Decide whether to use full entity or summary based on token budget
 */
export function selectEntityOrSummary<T, S>(
  entity: T,
  summary: S,
  availableTokens: number,
  preferFull: boolean = false
): { selected: T | S; isFull: boolean; tokens: number } {
  const fullTokens = countTokens(JSON.stringify(entity));
  const summaryTokens = countTokens(JSON.stringify(summary));

  // If full fits and we prefer full, use full
  if (preferFull && fullTokens <= availableTokens) {
    return { selected: entity, isFull: true, tokens: fullTokens };
  }

  // If summary fits, use summary
  if (summaryTokens <= availableTokens) {
    // Use full only if it fits and summary would be wasteful
    if (fullTokens <= availableTokens && fullTokens < summaryTokens * 1.5) {
      return { selected: entity, isFull: true, tokens: fullTokens };
    }
    return { selected: summary, isFull: false, tokens: summaryTokens };
  }

  // Nothing fits - return summary anyway (caller should handle)
  return { selected: summary, isFull: false, tokens: summaryTokens };
}
