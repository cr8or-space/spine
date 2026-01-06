/**
 * Relevance scoring for bible entities
 *
 * Calculates how relevant each bible entity is to the current
 * writing context, enabling intelligent context assembly.
 */

import type {
  Character,
  Content,
  Faction,
  Location,
  PlotThread,
  Structure,
  WorldRule,
} from '@repo/serial-types';

import type { EntityReference, RelevanceContext, RelevanceScore } from './types';

/**
 * Base relevance score for different entity roles/importance
 */
const BASE_SCORES = {
  character: {
    protagonist: 80,
    antagonist: 75,
    major: 60,
    supporting: 40,
    minor: 20,
  },
  plotThread: {
    'main-plot': 80,
    subplot: 50,
    mystery: 60,
    romance: 40,
    conflict: 55,
    'character-arc': 45,
    worldbuilding: 35,
    other: 30,
  },
  faction: {
    dominant: 60,
    major: 50,
    moderate: 40,
    minor: 25,
    negligible: 15,
  },
  worldRule: {
    established: 50,
    notEstablished: 30,
  },
  location: {
    accessible: 40,
    restricted: 35,
    hidden: 30,
    destroyed: 20,
    unknown: 25,
  },
};

/**
 * Score boost for various conditions
 */
const SCORE_BOOSTS = {
  /** Entity explicitly mentioned in structure beats/notes */
  explicitMention: 30,
  /** Entity appears in recent content */
  recentAppearance: 25,
  /** Entity is related to current POV character */
  relatedToPov: 20,
  /** Entity is in an active plot thread */
  activePlotThread: 15,
  /** Entity is at current location */
  currentLocation: 20,
  /** Entity has high priority */
  highPriority: 10,
  /** Entity is part of current arc */
  currentArc: 15,
  /** World rule is critical (magic system, etc.) */
  criticalRule: 20,
};

/**
 * Check if text contains any of the given names/aliases (case-insensitive)
 */
function textContainsEntity(text: string, name: string, aliases: string[] = []): boolean {
  const lowerText = text.toLowerCase();
  const allNames = [name, ...aliases].map((n) => n.toLowerCase());
  return allNames.some((n) => lowerText.includes(n));
}

/**
 * Extract all text from a structure for entity matching
 */
function extractStructureText(structure: Structure): string {
  const parts = [structure.title, structure.summary, structure.notes || ''];

  // Add beat descriptions
  for (const beat of structure.beats) {
    parts.push(beat.description);
  }

  // Add hook description if present
  if (structure.hook) {
    parts.push(structure.hook.description);
  }

  return parts.join(' ');
}

/**
 * Extract all text from content for entity matching
 */
function extractContentText(content: Content): string {
  return content.text;
}

/**
 * Calculate relevance score for a character
 */
export function scoreCharacter(character: Character, context: RelevanceContext): RelevanceScore {
  const reasons: string[] = [];
  let score = BASE_SCORES.character[character.role];
  reasons.push(`Base score for ${character.role} character: ${score}`);

  // Check explicit mentions
  if (context.explicitMentions?.some((m) => m.id === character.id)) {
    score += SCORE_BOOSTS.explicitMention;
    reasons.push(`Explicitly mentioned: +${SCORE_BOOSTS.explicitMention}`);
  }

  // Check structure mentions
  if (context.currentStructure) {
    const structureText = extractStructureText(context.currentStructure);
    if (textContainsEntity(structureText, character.name, character.aliases)) {
      score += SCORE_BOOSTS.explicitMention;
      reasons.push(`Mentioned in current structure: +${SCORE_BOOSTS.explicitMention}`);
    }
  }

  // Check recent content appearances
  if (context.recentContent?.length) {
    const appearsInRecent = context.recentContent.some((content) =>
      textContainsEntity(extractContentText(content), character.name, character.aliases)
    );
    if (appearsInRecent) {
      score += SCORE_BOOSTS.recentAppearance;
      reasons.push(`Appears in recent content: +${SCORE_BOOSTS.recentAppearance}`);
    }
  }

  // Check active plot thread involvement
  if (context.activePlotThreads?.length) {
    const inActiveThread = context.activePlotThreads.some((thread) =>
      thread.involvedCharacters.includes(character.id)
    );
    if (inActiveThread) {
      score += SCORE_BOOSTS.activePlotThread;
      reasons.push(`Involved in active plot thread: +${SCORE_BOOSTS.activePlotThread}`);
    }
  }

  // Boost for character arc in progress
  if (character.arc && character.arc.progress > 0 && character.arc.progress < 100) {
    score += SCORE_BOOSTS.currentArc;
    reasons.push(`Arc in progress: +${SCORE_BOOSTS.currentArc}`);
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    entityId: character.id,
    entityType: 'character',
    score,
    reasons,
  };
}

/**
 * Calculate relevance score for a location
 */
export function scoreLocation(location: Location, context: RelevanceContext): RelevanceScore {
  const reasons: string[] = [];
  let score = BASE_SCORES.location[location.status];
  reasons.push(`Base score for ${location.status} location: ${score}`);

  // Check explicit mentions
  if (context.explicitMentions?.some((m) => m.id === location.id)) {
    score += SCORE_BOOSTS.explicitMention;
    reasons.push(`Explicitly mentioned: +${SCORE_BOOSTS.explicitMention}`);
  }

  // Check structure mentions
  if (context.currentStructure) {
    const structureText = extractStructureText(context.currentStructure);
    if (textContainsEntity(structureText, location.name, location.aliases)) {
      score += SCORE_BOOSTS.currentLocation;
      reasons.push(`Mentioned in current structure: +${SCORE_BOOSTS.currentLocation}`);
    }
  }

  // Check recent content appearances
  if (context.recentContent?.length) {
    const appearsInRecent = context.recentContent.some((content) =>
      textContainsEntity(extractContentText(content), location.name, location.aliases)
    );
    if (appearsInRecent) {
      score += SCORE_BOOSTS.recentAppearance;
      reasons.push(`Appears in recent content: +${SCORE_BOOSTS.recentAppearance}`);
    }
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    entityId: location.id,
    entityType: 'location',
    score,
    reasons,
  };
}

/**
 * Calculate relevance score for a faction
 */
export function scoreFaction(faction: Faction, context: RelevanceContext): RelevanceScore {
  const reasons: string[] = [];
  let score = BASE_SCORES.faction[faction.influence];
  reasons.push(`Base score for ${faction.influence} faction: ${score}`);

  // Check explicit mentions
  if (context.explicitMentions?.some((m) => m.id === faction.id)) {
    score += SCORE_BOOSTS.explicitMention;
    reasons.push(`Explicitly mentioned: +${SCORE_BOOSTS.explicitMention}`);
  }

  // Check structure mentions
  if (context.currentStructure) {
    const structureText = extractStructureText(context.currentStructure);
    if (textContainsEntity(structureText, faction.name, faction.aliases)) {
      score += SCORE_BOOSTS.explicitMention;
      reasons.push(`Mentioned in current structure: +${SCORE_BOOSTS.explicitMention}`);
    }
  }

  // Check recent content appearances
  if (context.recentContent?.length) {
    const appearsInRecent = context.recentContent.some((content) =>
      textContainsEntity(extractContentText(content), faction.name, faction.aliases)
    );
    if (appearsInRecent) {
      score += SCORE_BOOSTS.recentAppearance;
      reasons.push(`Appears in recent content: +${SCORE_BOOSTS.recentAppearance}`);
    }
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    entityId: faction.id,
    entityType: 'faction',
    score,
    reasons,
  };
}

/**
 * Calculate relevance score for a world rule
 */
export function scoreWorldRule(rule: WorldRule, context: RelevanceContext): RelevanceScore {
  const reasons: string[] = [];
  let score = rule.established
    ? BASE_SCORES.worldRule.established
    : BASE_SCORES.worldRule.notEstablished;
  reasons.push(`Base score for ${rule.established ? 'established' : 'unestablished'} rule: ${score}`);

  // Check explicit mentions
  if (context.explicitMentions?.some((m) => m.id === rule.id)) {
    score += SCORE_BOOSTS.explicitMention;
    reasons.push(`Explicitly mentioned: +${SCORE_BOOSTS.explicitMention}`);
  }

  // Check structure mentions
  if (context.currentStructure) {
    const structureText = extractStructureText(context.currentStructure);
    if (textContainsEntity(structureText, rule.name, [])) {
      score += SCORE_BOOSTS.explicitMention;
      reasons.push(`Mentioned in current structure: +${SCORE_BOOSTS.explicitMention}`);
    }
  }

  // High priority rules get a boost
  if (rule.priority >= 75) {
    score += SCORE_BOOSTS.criticalRule;
    reasons.push(`High priority rule: +${SCORE_BOOSTS.criticalRule}`);
  } else if (rule.priority >= 50) {
    score += SCORE_BOOSTS.highPriority;
    reasons.push(`Medium-high priority rule: +${SCORE_BOOSTS.highPriority}`);
  }

  // Magic and physics rules are often critical
  if (rule.category === 'magic' || rule.category === 'physics') {
    score += SCORE_BOOSTS.criticalRule;
    reasons.push(`Critical rule category (${rule.category}): +${SCORE_BOOSTS.criticalRule}`);
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    entityId: rule.id,
    entityType: 'worldRule',
    score,
    reasons,
  };
}

/**
 * Calculate relevance score for a plot thread
 */
export function scorePlotThread(thread: PlotThread, context: RelevanceContext): RelevanceScore {
  const reasons: string[] = [];
  let score = BASE_SCORES.plotThread[thread.type];
  reasons.push(`Base score for ${thread.type} thread: ${score}`);

  // Active threads get a significant boost
  if (thread.status === 'active') {
    score += SCORE_BOOSTS.activePlotThread;
    reasons.push(`Active thread: +${SCORE_BOOSTS.activePlotThread}`);
  }

  // Check explicit mentions
  if (context.explicitMentions?.some((m) => m.id === thread.id)) {
    score += SCORE_BOOSTS.explicitMention;
    reasons.push(`Explicitly mentioned: +${SCORE_BOOSTS.explicitMention}`);
  }

  // Check structure mentions
  if (context.currentStructure) {
    const structureText = extractStructureText(context.currentStructure);
    if (textContainsEntity(structureText, thread.name, [])) {
      score += SCORE_BOOSTS.explicitMention;
      reasons.push(`Mentioned in current structure: +${SCORE_BOOSTS.explicitMention}`);
    }
  }

  // High priority threads get a boost
  if (thread.priority >= 75) {
    score += SCORE_BOOSTS.highPriority;
    reasons.push(`High priority thread: +${SCORE_BOOSTS.highPriority}`);
  }

  // Threads with pending promises are more relevant
  const pendingPromises = thread.promises.filter((p) => p.status === 'pending');
  if (pendingPromises.length > 0) {
    const promiseBoost = Math.min(15, pendingPromises.length * 5);
    score += promiseBoost;
    reasons.push(`${pendingPromises.length} pending promises: +${promiseBoost}`);
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    entityId: thread.id,
    entityType: 'plotThread',
    score,
    reasons,
  };
}

/**
 * Score all entities and return sorted by relevance
 */
export interface ScoredEntities {
  characters: { entity: Character; score: RelevanceScore }[];
  locations: { entity: Location; score: RelevanceScore }[];
  factions: { entity: Faction; score: RelevanceScore }[];
  worldRules: { entity: WorldRule; score: RelevanceScore }[];
  plotThreads: { entity: PlotThread; score: RelevanceScore }[];
}

export function scoreAllEntities(
  entities: {
    characters: Character[];
    locations: Location[];
    factions: Faction[];
    worldRules: WorldRule[];
    plotThreads: PlotThread[];
  },
  context: RelevanceContext
): ScoredEntities {
  return {
    characters: entities.characters
      .map((entity) => ({ entity, score: scoreCharacter(entity, context) }))
      .sort((a, b) => b.score.score - a.score.score),
    locations: entities.locations
      .map((entity) => ({ entity, score: scoreLocation(entity, context) }))
      .sort((a, b) => b.score.score - a.score.score),
    factions: entities.factions
      .map((entity) => ({ entity, score: scoreFaction(entity, context) }))
      .sort((a, b) => b.score.score - a.score.score),
    worldRules: entities.worldRules
      .map((entity) => ({ entity, score: scoreWorldRule(entity, context) }))
      .sort((a, b) => b.score.score - a.score.score),
    plotThreads: entities.plotThreads
      .map((entity) => ({ entity, score: scorePlotThread(entity, context) }))
      .sort((a, b) => b.score.score - a.score.score),
  };
}

/**
 * Filter scored entities by relevance threshold
 */
export function filterByRelevance<T>(
  scoredEntities: { entity: T; score: RelevanceScore }[],
  threshold: number
): { entity: T; score: RelevanceScore }[] {
  return scoredEntities.filter((e) => e.score.score >= threshold);
}

/**
 * Get top N entities by relevance
 */
export function topNByRelevance<T>(
  scoredEntities: { entity: T; score: RelevanceScore }[],
  n: number
): { entity: T; score: RelevanceScore }[] {
  return scoredEntities.slice(0, n);
}

/**
 * Convert entity to reference for explicit mentions
 */
export function toEntityReference(
  entity: Character | Location | Faction | WorldRule | PlotThread,
  type: EntityReference['type']
): EntityReference {
  return {
    id: entity.id,
    type,
    name: entity.name,
    aliases: 'aliases' in entity ? entity.aliases : undefined,
  };
}
