/**
 * Formatting utilities for generation prompts
 *
 * These utilities format context and structure data for LLM prompts.
 * Extracted from outline.ts, beats.ts, draft.ts, and pipeline.ts.
 */

import type { Structure } from '@repo/serial-types';
import type { AssembledContext } from '@repo/framework-llm';

/**
 * Format options for context formatting
 */
export interface FormatContextOptions {
  /** Include character descriptions */
  includeDescriptions?: boolean;
  /** Include location types */
  includeLocationTypes?: boolean;
  /** Include plot threads (and filter by status) */
  includePlotThreads?: boolean;
  /** POV character name (for highlighting) */
  povCharacter?: string;
  /** Include voice notes for characters */
  includeVoiceNotes?: boolean;
  /** Include sensory details for locations */
  includeSensoryDetails?: boolean;
}

/**
 * Format options for structure formatting
 */
export interface FormatStructureOptions {
  /** Include notes field */
  includeNotes?: boolean;
  /** Include beats list */
  includeBeats?: boolean;
  /** Hook label (e.g., "Hook" or "Required Hook") */
  hookLabel?: string;
}

// Type helper for entities that might be Character, CharacterSummary, etc.
interface EntityWithName {
  name: string;
  role?: string;
  type?: string;
  status?: string;
  description?: string;
  voiceNotes?: string;
  sensoryDetails?: string;
}

/**
 * Format assembled context for LLM prompts
 *
 * @param context - The assembled context from context assembly
 * @param options - Formatting options
 * @returns Formatted string for prompt
 */
export function formatContext(
  context: AssembledContext,
  options: FormatContextOptions = {}
): string {
  const {
    includeDescriptions = true,
    includeLocationTypes = false,
    includePlotThreads = false,
    povCharacter,
    includeVoiceNotes = false,
    includeSensoryDetails = false,
  } = options;

  const sections: string[] = [];

  // Format characters
  if (context.bible.characters.length > 0) {
    sections.push('### Characters');
    for (const char of context.bible.characters as unknown as EntityWithName[]) {
      const name = char.name;
      const role = char.role ?? '';
      const description = char.description ?? '';
      const voiceNotes = char.voiceNotes ?? '';

      const isPov = povCharacter && name.toLowerCase() === povCharacter.toLowerCase();
      const nameDisplay = isPov ? `**${name} (POV)**` : `**${name}**`;

      if (includeDescriptions) {
        sections.push(`- ${nameDisplay} (${role}): ${description}`);
      } else {
        sections.push(`- ${nameDisplay} (${role})`);
      }

      if (includeVoiceNotes && voiceNotes && isPov) {
        sections.push(`  Voice: ${voiceNotes}`);
      }
    }
  }

  // Format locations
  if (context.bible.locations.length > 0) {
    sections.push('\n### Locations');
    for (const loc of context.bible.locations as unknown as EntityWithName[]) {
      const name = loc.name;
      const type = loc.type ?? '';
      const description = loc.description ?? '';
      const sensory = loc.sensoryDetails ?? '';

      if (includeLocationTypes && type) {
        sections.push(`- **${name}** (${type}): ${description}`);
      } else if (includeDescriptions) {
        sections.push(`- **${name}**: ${description}`);
      } else {
        sections.push(`- **${name}**`);
      }

      if (includeSensoryDetails && sensory) {
        sections.push(`  Sensory: ${sensory}`);
      }
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
  if (includePlotThreads && context.bible.plotThreads.length > 0) {
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

// Type for accessing beats from structure
interface BeatInfo {
  description: string;
  completed: boolean;
}

/**
 * Format structure for LLM prompts
 *
 * @param structure - The structure to format
 * @param options - Formatting options
 * @returns Formatted string for prompt
 */
export function formatStructure(
  structure: Structure,
  options: FormatStructureOptions = {}
): string {
  const {
    includeNotes = true,
    includeBeats = false,
    hookLabel = 'Hook',
  } = options;

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
    lines.push(`${hookLabel}: ${structure.hook.type} - ${structure.hook.description}`);
  }

  // Include beats if requested and available
  if (includeBeats && structure.beats && structure.beats.length > 0) {
    lines.push('Beats:');
    for (const beat of structure.beats as BeatInfo[]) {
      const status = beat.completed ? '[x]' : '[ ]';
      lines.push(`  ${status} ${beat.description}`);
    }
  }

  if (includeNotes && structure.notes) {
    lines.push(`Notes: ${structure.notes}`);
  }

  return lines.join('\n');
}

/**
 * Pre-configured formatContext for outline generation
 * Includes descriptions, location types, and active plot threads
 */
export function formatContextForOutline(context: AssembledContext): string {
  return formatContext(context, {
    includeDescriptions: true,
    includeLocationTypes: true,
    includePlotThreads: true,
  });
}

/**
 * Pre-configured formatContext for beats expansion
 * Minimal context: just names and roles
 */
export function formatContextForBeats(context: AssembledContext): string {
  return formatContext(context, {
    includeDescriptions: false,
    includeLocationTypes: false,
    includePlotThreads: false,
  });
}

/**
 * Pre-configured formatContext for draft generation
 * Full context with POV highlighting, voice notes, and sensory details
 */
export function formatContextForDraft(
  context: AssembledContext,
  povCharacter?: string
): string {
  return formatContext(context, {
    includeDescriptions: true,
    includeLocationTypes: false,
    includePlotThreads: false,
    povCharacter,
    includeVoiceNotes: true,
    includeSensoryDetails: true,
  });
}

/**
 * Pre-configured formatStructure for outline generation
 * Includes notes but not beats
 */
export function formatStructureForOutline(structure: Structure): string {
  return formatStructure(structure, {
    includeNotes: true,
    includeBeats: false,
    hookLabel: 'Hook',
  });
}

/**
 * Pre-configured formatStructure for beats expansion
 * Minimal: no notes, no beats
 */
export function formatStructureForBeats(structure: Structure): string {
  return formatStructure(structure, {
    includeNotes: false,
    includeBeats: false,
    hookLabel: 'Hook',
  });
}

/**
 * Pre-configured formatStructure for draft generation
 * Includes notes, uses "Required Hook" label
 */
export function formatStructureForDraft(structure: Structure): string {
  return formatStructure(structure, {
    includeNotes: true,
    includeBeats: false,
    hookLabel: 'Required Hook',
  });
}

/**
 * Pre-configured formatStructure for pipeline display
 * Includes beats with completion status
 */
export function formatStructureForPipeline(structure: Structure): string {
  return formatStructure(structure, {
    includeNotes: true,
    includeBeats: true,
    hookLabel: 'Hook',
  });
}
