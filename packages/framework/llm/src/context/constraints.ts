/**
 * Constraint extraction from bible
 *
 * Extracts actionable constraints from bible entities for LLM guidance.
 * Constraints help the LLM maintain continuity and consistency.
 */

import type {
  Character,
  Faction,
  Location,
  PlotThread,
  TimelineEvent,
  WorldRule,
} from '@repo/serial-types';

import { countTokens } from '../token-counter';
import type { Constraint } from './types';

/**
 * Extract constraints from a character
 */
export function extractCharacterConstraints(character: Character): Constraint[] {
  const constraints: Constraint[] = [];

  // Character status constraint
  if (character.status !== 'active') {
    constraints.push({
      type: 'fact',
      sourceId: character.id,
      sourceType: 'character',
      statement: `${character.name} is currently ${character.status} and cannot appear in active scenes.`,
      priority: 90,
      critical: true,
    });
  }

  // Voice consistency constraint
  if (character.voiceSamples.length > 0) {
    constraints.push({
      type: 'voice',
      sourceId: character.id,
      sourceType: 'character',
      statement: `${character.name}'s dialogue style: "${character.voiceSamples[0]}"`,
      priority: 70,
      critical: false,
    });
  }

  // Key trait constraints
  const personalityTraits = character.traits.filter((t) => t.category === 'personality');
  if (personalityTraits.length > 0) {
    const traitNames = personalityTraits.map((t) => t.name.toLowerCase()).join(', ');
    constraints.push({
      type: 'fact',
      sourceId: character.id,
      sourceType: 'character',
      statement: `${character.name} has ${traitNames} personality traits. Actions should reflect these.`,
      priority: 60,
      critical: false,
    });
  }

  // Relationship constraints
  for (const rel of character.relationships) {
    if (rel.intensity >= 80 || rel.intensity <= -80) {
      const intensityDesc = rel.intensity > 0 ? 'extremely close to' : 'extremely hostile toward';
      constraints.push({
        type: 'relationship',
        sourceId: character.id,
        sourceType: 'character',
        statement: `${character.name} is ${intensityDesc} character ${rel.targetId} (${rel.type} relationship).`,
        priority: 50,
        critical: false,
      });
    }
  }

  // Arc constraint
  if (character.arc) {
    constraints.push({
      type: 'fact',
      sourceId: character.id,
      sourceType: 'character',
      statement: `${character.name} is on a ${character.arc.type} arc from "${character.arc.startingPoint}" toward "${character.arc.destination}" (${character.arc.progress}% complete).`,
      priority: 55,
      critical: false,
    });
  }

  return constraints;
}

/**
 * Extract constraints from a location
 */
export function extractLocationConstraints(location: Location): Constraint[] {
  const constraints: Constraint[] = [];

  // Status constraint
  if (location.status !== 'accessible') {
    constraints.push({
      type: 'location',
      sourceId: location.id,
      sourceType: 'location',
      statement: `${location.name} is currently ${location.status} and may not be freely accessible.`,
      priority: 85,
      critical: location.status === 'destroyed',
    });
  }

  // Atmosphere constraint for setting consistency
  if (location.atmosphere) {
    constraints.push({
      type: 'location',
      sourceId: location.id,
      sourceType: 'location',
      statement: `${location.name} atmosphere: ${location.atmosphere}`,
      priority: 40,
      critical: false,
    });
  }

  // Plot-relevant features
  const plotFeatures = location.features.filter((f) => f.significance === 'plot-relevant');
  for (const feature of plotFeatures) {
    constraints.push({
      type: 'fact',
      sourceId: location.id,
      sourceType: 'location',
      statement: `${location.name} has ${feature.name}: ${feature.description}`,
      priority: 65,
      critical: false,
    });
  }

  return constraints;
}

/**
 * Extract constraints from a faction
 */
export function extractFactionConstraints(faction: Faction): Constraint[] {
  const constraints: Constraint[] = [];

  // Status constraint
  if (faction.status !== 'active') {
    constraints.push({
      type: 'fact',
      sourceId: faction.id,
      sourceType: 'faction',
      statement: `${faction.name} is currently ${faction.status}.`,
      priority: 80,
      critical: faction.status === 'disbanded',
    });
  }

  // Ideology constraint for member behavior
  if (faction.ideology) {
    constraints.push({
      type: 'fact',
      sourceId: faction.id,
      sourceType: 'faction',
      statement: `${faction.name} members follow: ${faction.ideology}`,
      priority: 55,
      critical: false,
    });
  }

  // Inter-faction relationship constraints
  for (const rel of faction.relations) {
    if (rel.type === 'hostile' || rel.type === 'allied') {
      const desc = rel.type === 'hostile' ? 'enemies with' : 'allied with';
      constraints.push({
        type: 'relationship',
        sourceId: faction.id,
        sourceType: 'faction',
        statement: `${faction.name} is ${desc} faction ${rel.targetId}${rel.public ? '' : ' (secretly)'}.`,
        priority: 60,
        critical: false,
      });
    }
  }

  return constraints;
}

/**
 * Extract constraints from a world rule
 */
export function extractWorldRuleConstraints(rule: WorldRule): Constraint[] {
  const constraints: Constraint[] = [];

  // The rule itself is a constraint
  constraints.push({
    type: 'rule',
    sourceId: rule.id,
    sourceType: 'worldRule',
    statement: `WORLD RULE (${rule.category}): ${rule.rule}`,
    priority: rule.priority,
    critical: rule.established,
  });

  // Consequences make violations more visible
  if (rule.consequences) {
    constraints.push({
      type: 'rule',
      sourceId: rule.id,
      sourceType: 'worldRule',
      statement: `Violating "${rule.name}" results in: ${rule.consequences}`,
      priority: rule.priority - 5,
      critical: false,
    });
  }

  // Exceptions are important to note
  for (const exception of rule.exceptions) {
    constraints.push({
      type: 'rule',
      sourceId: rule.id,
      sourceType: 'worldRule',
      statement: `Exception to "${rule.name}": ${exception.condition} allows ${exception.effect}`,
      priority: rule.priority - 10,
      critical: false,
    });
  }

  return constraints;
}

/**
 * Extract constraints from a plot thread
 */
export function extractPlotThreadConstraints(thread: PlotThread): Constraint[] {
  const constraints: Constraint[] = [];

  // Active thread constraint
  if (thread.status === 'active') {
    constraints.push({
      type: 'fact',
      sourceId: thread.id,
      sourceType: 'plotThread',
      statement: `Active plot thread "${thread.name}": ${thread.description}`,
      priority: thread.priority,
      critical: thread.type === 'main-plot',
    });
  }

  // Pending promises must be respected
  const pendingPromises = thread.promises.filter((p) => p.status === 'pending');
  for (const promise of pendingPromises) {
    constraints.push({
      type: 'fact',
      sourceId: thread.id,
      sourceType: 'plotThread',
      statement: `Narrative promise in "${thread.name}": ${promise.description} (expected: ${promise.expectedPayoff})`,
      priority: thread.priority - 5,
      critical: promise.expectedPayoff === 'immediate' || promise.expectedPayoff === 'short-term',
    });
  }

  return constraints;
}

/**
 * Extract constraints from timeline events
 */
export function extractTimelineConstraints(events: TimelineEvent[]): Constraint[] {
  const constraints: Constraint[] = [];

  // Sort events chronologically by chapter number or story time
  const sortedEvents = [...events].sort((a, b) => {
    // Sort by chapter number if available
    const aChapter = a.position.chapterNumber ?? 0;
    const bChapter = b.position.chapterNumber ?? 0;
    if (aChapter !== bChapter) {
      return aChapter - bChapter;
    }
    // Fall back to date comparison if available
    if (a.position.date && b.position.date) {
      return a.position.date.localeCompare(b.position.date);
    }
    return 0;
  });

  // Recent events are constraints
  const recentEvents = sortedEvents.slice(-5);
  for (const event of recentEvents) {
    if (event.significance === 'major' || event.significance === 'critical') {
      constraints.push({
        type: 'timeline',
        sourceId: event.id,
        sourceType: 'timeline',
        statement: `Recent event: ${event.name} - ${event.description}`,
        priority: event.significance === 'critical' ? 80 : 70,
        critical: event.significance === 'critical',
      });
    }
  }

  return constraints;
}

/**
 * Extract all constraints from bible entities
 */
export function extractAllConstraints(entities: {
  characters: Character[];
  locations: Location[];
  factions: Faction[];
  worldRules: WorldRule[];
  plotThreads: PlotThread[];
  timelineEvents?: TimelineEvent[];
}): Constraint[] {
  const constraints: Constraint[] = [];

  for (const character of entities.characters) {
    constraints.push(...extractCharacterConstraints(character));
  }

  for (const location of entities.locations) {
    constraints.push(...extractLocationConstraints(location));
  }

  for (const faction of entities.factions) {
    constraints.push(...extractFactionConstraints(faction));
  }

  for (const rule of entities.worldRules) {
    constraints.push(...extractWorldRuleConstraints(rule));
  }

  for (const thread of entities.plotThreads) {
    constraints.push(...extractPlotThreadConstraints(thread));
  }

  if (entities.timelineEvents) {
    constraints.push(...extractTimelineConstraints(entities.timelineEvents));
  }

  // Sort by priority (highest first), then by critical flag
  return constraints.sort((a, b) => {
    if (a.critical !== b.critical) {
      return a.critical ? -1 : 1;
    }
    return b.priority - a.priority;
  });
}

/**
 * Filter constraints to fit within token budget
 */
export function fitConstraintsInBudget(
  constraints: Constraint[],
  maxTokens: number
): Constraint[] {
  const result: Constraint[] = [];
  let usedTokens = 0;

  for (const constraint of constraints) {
    const tokens = countTokens(constraint.statement);
    if (usedTokens + tokens <= maxTokens) {
      result.push(constraint);
      usedTokens += tokens;
    } else if (constraint.critical) {
      // Critical constraints are always included
      result.push(constraint);
      usedTokens += tokens;
    }
  }

  return result;
}

/**
 * Format constraints for inclusion in LLM prompt
 */
export function formatConstraints(constraints: Constraint[]): string {
  if (constraints.length === 0) {
    return '';
  }

  const lines: string[] = ['## Constraints and Facts to Respect\n'];

  // Group by type
  const byType = new Map<Constraint['type'], Constraint[]>();
  for (const constraint of constraints) {
    const existing = byType.get(constraint.type) || [];
    existing.push(constraint);
    byType.set(constraint.type, existing);
  }

  // Format each group
  const typeOrder: Constraint['type'][] = ['rule', 'fact', 'timeline', 'relationship', 'voice', 'location'];
  for (const type of typeOrder) {
    const typeConstraints = byType.get(type);
    if (!typeConstraints || typeConstraints.length === 0) continue;

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + 's';
    lines.push(`### ${typeLabel}`);

    for (const constraint of typeConstraints) {
      const marker = constraint.critical ? '⚠️' : '•';
      lines.push(`${marker} ${constraint.statement}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
