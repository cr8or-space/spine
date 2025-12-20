/**
 * Output formatting utilities for LLM consumption
 */

import type { Structure, Character, Location, Faction, PlotThread } from '@repo/types';

/**
 * Get icon for structure type
 */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'book':
      return '📚';
    case 'arc':
      return '📖';
    case 'chapter':
      return '📄';
    case 'scene':
      return '🎬';
    default:
      return '•';
  }
}

/**
 * Format structure tree as readable outline
 */
export function formatStructureTree(structure: Structure, depth = 0): string {
  const indent = '  '.repeat(depth);
  const icon = getTypeIcon(structure.type);
  let output = `${indent}${icon} ${structure.title}`;

  if (structure.tensionTarget !== undefined && structure.tensionTarget !== null) {
    output += ` [tension: ${structure.tensionTarget}]`;
  }

  if (structure.chapterType) {
    output += ` (${structure.chapterType})`;
  }

  if (structure.children && structure.children.length > 0) {
    for (const child of structure.children) {
      output += '\n' + formatStructureTree(child, depth + 1);
    }
  }

  return output;
}

/**
 * Format character as readable summary
 */
export function formatCharacter(char: Character): string {
  const lines: string[] = [];

  lines.push(`**${char.name}** (${char.role})`);
  lines.push('');

  if (char.description) {
    lines.push(char.description);
    lines.push('');
  }

  if (char.traits && char.traits.length > 0) {
    lines.push(`**Traits:** ${char.traits.join(', ')}`);
  }

  if (char.goals && char.goals.length > 0) {
    lines.push(`**Goals:** ${char.goals.join(', ')}`);
  }

  if (char.arcSummary) {
    lines.push(`**Arc:** ${char.arcSummary}`);
  }

  if (char.voiceNotes) {
    lines.push(`**Voice:** ${char.voiceNotes}`);
  }

  return lines.join('\n').trim();
}

/**
 * Format location as readable summary
 */
export function formatLocation(loc: Location): string {
  const lines: string[] = [];

  lines.push(`**${loc.name}** (${loc.type})`);
  lines.push('');

  if (loc.description) {
    lines.push(loc.description);
    lines.push('');
  }

  if (loc.atmosphere) {
    lines.push(`**Atmosphere:** ${loc.atmosphere}`);
  }

  if (loc.significance) {
    lines.push(`**Significance:** ${loc.significance}`);
  }

  return lines.join('\n').trim();
}

/**
 * Format faction as readable summary
 */
export function formatFaction(faction: Faction): string {
  const lines: string[] = [];

  lines.push(`**${faction.name}** (${faction.type})`);
  lines.push('');

  if (faction.description) {
    lines.push(faction.description);
    lines.push('');
  }

  if (faction.goals && faction.goals.length > 0) {
    lines.push(`**Goals:** ${faction.goals.join(', ')}`);
  }

  if (faction.values && faction.values.length > 0) {
    lines.push(`**Values:** ${faction.values.join(', ')}`);
  }

  if (faction.structure) {
    lines.push(`**Structure:** ${faction.structure}`);
  }

  return lines.join('\n').trim();
}

/**
 * Format plot thread as readable summary
 */
export function formatPlotThread(thread: PlotThread): string {
  const lines: string[] = [];

  lines.push(`**${thread.name}** (${thread.type})`);

  if (thread.status) {
    lines.push(`Status: ${thread.status}`);
  }

  if (thread.description) {
    lines.push('');
    lines.push(thread.description);
  }

  if (thread.startChapter !== undefined) {
    const range = thread.endChapter
      ? `Chapters ${thread.startChapter}-${thread.endChapter}`
      : `Starting chapter ${thread.startChapter}`;
    lines.push(`**Range:** ${range}`);
  }

  return lines.join('\n').trim();
}

/**
 * Format a list of items with numbers
 */
export function formatNumberedList<T>(
  items: T[],
  formatter: (item: T, index: number) => string
): string {
  return items.map((item, i) => `${i + 1}. ${formatter(item, i)}`).join('\n');
}

/**
 * Format key-value pairs as a table
 */
export function formatTable(
  data: Record<string, string | number | boolean | null | undefined>
): string {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined
  );

  if (entries.length === 0) {
    return 'No data';
  }

  const maxKeyLength = Math.max(...entries.map(([k]) => k.length));

  return entries
    .map(([k, v]) => `${k.padEnd(maxKeyLength)}: ${v}`)
    .join('\n');
}
