/**
 * Context assembler
 *
 * Main entry point for assembling LLM context from bible, content, and structure.
 * Combines budget allocation, relevance scoring, summarization, and constraints.
 */

import type {
  Bible,
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
} from '@repo/types';

import { countTokens } from '../token-counter';
import { budgetFromOptions, redistributeBudget } from './budget';
import { extractAllConstraints, fitConstraintsInBudget } from './constraints';
import {
  filterByRelevance,
  scoreAllEntities,
  topNByRelevance,
  type ScoredEntities,
} from './relevance';
import {
  selectEntityOrSummary,
  summarizeCharacter,
  summarizeContent,
  summarizeFaction,
  summarizeLocation,
  summarizePlotThread,
  summarizeStructure,
  summarizeWorldRule,
} from './summarize';
import {
  type AssembledContext,
  type BibleContext,
  type Constraint,
  type ContentContext,
  type ContextAssemblyOptions,
  type RelevanceContext,
  type StructureContext,
  DEFAULT_CONTEXT_OPTIONS,
} from './types';

/**
 * Input data for context assembly
 */
export interface ContextInput {
  /** Story bible */
  bible: Bible;
  /** Current structure being worked on */
  currentStructure?: Structure;
  /** All structures (for hierarchy context) */
  allStructures?: Structure[];
  /** Recent content (most recent chapters) */
  recentContent?: Content[];
  /** Structure map for content titles */
  structureMap?: Map<string, Structure>;
}

/**
 * Assemble context for LLM prompt generation
 */
export function assembleContext(
  input: ContextInput,
  options: ContextAssemblyOptions
): AssembledContext {
  // Merge options with defaults
  const opts = {
    ...DEFAULT_CONTEXT_OPTIONS,
    ...options,
  };

  // Calculate budget
  let budget = budgetFromOptions(opts);

  // Build relevance context
  const relevanceContext: RelevanceContext = {
    currentStructure: input.currentStructure,
    recentContent: input.recentContent,
    explicitMentions: opts.alwaysInclude,
    activePlotThreads: input.bible.plotThreads.filter((t) => t.status === 'active'),
  };

  // Score all entities
  const scoredEntities = scoreAllEntities(
    {
      characters: input.bible.characters,
      locations: input.bible.locations,
      factions: input.bible.factions,
      worldRules: input.bible.worldRules,
      plotThreads: input.bible.plotThreads,
    },
    relevanceContext
  );

  // Assemble bible context
  const bibleContext = assembleBibleContext(
    scoredEntities,
    budget.bible,
    opts
  );

  // Assemble recent content context
  const contentContext = assembleContentContext(
    input.recentContent || [],
    input.structureMap || new Map(),
    budget.recentContent,
    opts.recentChapterCount
  );

  // Assemble structure context
  const structureContext = assembleStructureContext(
    input.currentStructure,
    input.allStructures || [],
    budget.structure
  );

  // Extract and fit constraints
  const relevantEntities = {
    characters: bibleContext.characters.filter(isFullCharacter) as Character[],
    locations: bibleContext.locations.filter(isFullLocation) as Location[],
    factions: bibleContext.factions.filter(isFullFaction) as Faction[],
    worldRules: bibleContext.worldRules.filter(isFullWorldRule) as WorldRule[],
    plotThreads: bibleContext.plotThreads.filter(isFullPlotThread) as PlotThread[],
    timelineEvents: input.bible.timelineEvents,
  };

  const allConstraints = extractAllConstraints(relevantEntities);
  const constraints = fitConstraintsInBudget(allConstraints, budget.constraints);
  const constraintsTokens = constraints.reduce(
    (sum, c) => sum + countTokens(c.statement),
    0
  );

  // Calculate actual token usage
  const actualTokens = {
    bible: bibleContext.tokenCount,
    recentContent: contentContext.reduce((sum, c) => sum + c.tokenCount, 0),
    structure: structureContext?.tokenCount ?? 0,
    constraints: constraintsTokens,
    total: 0,
  };
  actualTokens.total =
    actualTokens.bible +
    actualTokens.recentContent +
    actualTokens.structure +
    actualTokens.constraints;

  // Redistribute unused budget
  budget = redistributeBudget(budget, {
    bible: actualTokens.bible,
    recentContent: actualTokens.recentContent,
    structure: actualTokens.structure,
    constraints: actualTokens.constraints,
  });

  return {
    taskType: opts.taskType,
    bible: bibleContext,
    recentContent: contentContext,
    structure: structureContext,
    constraints,
    budget,
    actualTokens,
  };
}

/**
 * Assemble bible context from scored entities
 */
function assembleBibleContext(
  scored: ScoredEntities,
  budget: number,
  opts: Required<Omit<ContextAssemblyOptions, 'customBudget' | 'alwaysInclude' | 'exclude'>> &
    Pick<ContextAssemblyOptions, 'alwaysInclude' | 'exclude'>
): BibleContext {
  let remainingBudget = budget;

  // Filter by threshold and limit
  const filteredCharacters = topNByRelevance(
    filterByRelevance(scored.characters, opts.relevanceThreshold),
    opts.maxEntitiesPerType
  );
  const filteredLocations = topNByRelevance(
    filterByRelevance(scored.locations, opts.relevanceThreshold),
    opts.maxEntitiesPerType
  );
  const filteredFactions = topNByRelevance(
    filterByRelevance(scored.factions, opts.relevanceThreshold),
    opts.maxEntitiesPerType
  );
  const filteredWorldRules = topNByRelevance(
    filterByRelevance(scored.worldRules, opts.relevanceThreshold),
    opts.maxEntitiesPerType
  );
  const filteredPlotThreads = topNByRelevance(
    filterByRelevance(scored.plotThreads, opts.relevanceThreshold),
    opts.maxEntitiesPerType
  );

  // Calculate per-type budget (distribute remaining budget)
  const typeCount = 5;
  const perTypeBudget = Math.floor(remainingBudget / typeCount);

  // Select entities or summaries based on budget
  const characters: (Character | CharacterSummary)[] = [];
  let charBudget = perTypeBudget;
  for (const { entity } of filteredCharacters) {
    if (opts.exclude?.includes(entity.id)) continue;
    const summary = summarizeCharacter(entity);
    const selection = selectEntityOrSummary(entity, summary, charBudget, opts.preferFullEntities);
    characters.push(selection.selected as Character | CharacterSummary);
    charBudget -= selection.tokens;
    if (charBudget <= 0) break;
  }

  const locations: (Location | LocationSummary)[] = [];
  let locBudget = perTypeBudget;
  for (const { entity } of filteredLocations) {
    if (opts.exclude?.includes(entity.id)) continue;
    const summary = summarizeLocation(entity);
    const selection = selectEntityOrSummary(entity, summary, locBudget, opts.preferFullEntities);
    locations.push(selection.selected as Location | LocationSummary);
    locBudget -= selection.tokens;
    if (locBudget <= 0) break;
  }

  const factions: (Faction | FactionSummary)[] = [];
  let facBudget = perTypeBudget;
  for (const { entity } of filteredFactions) {
    if (opts.exclude?.includes(entity.id)) continue;
    const summary = summarizeFaction(entity);
    const selection = selectEntityOrSummary(entity, summary, facBudget, opts.preferFullEntities);
    factions.push(selection.selected as Faction | FactionSummary);
    facBudget -= selection.tokens;
    if (facBudget <= 0) break;
  }

  const worldRules: (WorldRule | WorldRuleSummary)[] = [];
  let ruleBudget = perTypeBudget;
  for (const { entity } of filteredWorldRules) {
    if (opts.exclude?.includes(entity.id)) continue;
    const summary = summarizeWorldRule(entity);
    const selection = selectEntityOrSummary(entity, summary, ruleBudget, opts.preferFullEntities);
    worldRules.push(selection.selected as WorldRule | WorldRuleSummary);
    ruleBudget -= selection.tokens;
    if (ruleBudget <= 0) break;
  }

  const plotThreads: (PlotThread | PlotThreadSummary)[] = [];
  let threadBudget = perTypeBudget;
  for (const { entity } of filteredPlotThreads) {
    if (opts.exclude?.includes(entity.id)) continue;
    const summary = summarizePlotThread(entity);
    const selection = selectEntityOrSummary(entity, summary, threadBudget, opts.preferFullEntities);
    plotThreads.push(selection.selected as PlotThread | PlotThreadSummary);
    threadBudget -= selection.tokens;
    if (threadBudget <= 0) break;
  }

  // Calculate total token count
  const tokenCount =
    (perTypeBudget - charBudget) +
    (perTypeBudget - locBudget) +
    (perTypeBudget - facBudget) +
    (perTypeBudget - ruleBudget) +
    (perTypeBudget - threadBudget);

  return {
    characters,
    locations,
    factions,
    worldRules,
    plotThreads,
    tokenCount,
  };
}

/**
 * Assemble recent content context
 */
function assembleContentContext(
  recentContent: Content[],
  structureMap: Map<string, Structure>,
  budget: number,
  maxChapters: number
): ContentContext[] {
  const result: ContentContext[] = [];
  let remainingBudget = budget;

  // Sort by chapter number (most recent first)
  const sorted = [...recentContent]
    .filter((c) => c.chapterNumber !== undefined)
    .sort((a, b) => (b.chapterNumber ?? 0) - (a.chapterNumber ?? 0))
    .slice(0, maxChapters);

  for (const content of sorted) {
    const structure = structureMap.get(content.structureId);
    if (!structure) continue;

    // Summarize content
    const summary = summarizeContent(content, structure, {
      maxSummaryLength: Math.floor(remainingBudget * 4), // Approximate chars from tokens
    });

    if (summary.tokenCount <= remainingBudget) {
      result.push(summary);
      remainingBudget -= summary.tokenCount;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Assemble structure context
 */
function assembleStructureContext(
  currentStructure: Structure | undefined,
  allStructures: Structure[],
  budget: number
): StructureContext | null {
  if (!currentStructure) {
    return null;
  }

  // Build structure map
  const structureMap = new Map<string, Structure>();
  const buildMap = (s: Structure) => {
    structureMap.set(s.id, s);
    for (const child of s.children) {
      buildMap(child);
    }
  };
  for (const s of allStructures) {
    buildMap(s);
  }

  // Find ancestors
  const ancestors: Structure[] = [];
  let current = currentStructure;
  while (current.parentId) {
    const parent = structureMap.get(current.parentId);
    if (parent) {
      ancestors.unshift(parent);
      current = parent;
    } else {
      break;
    }
  }

  // Find siblings
  const siblings: Structure[] = [];
  if (currentStructure.parentId) {
    const parent = structureMap.get(currentStructure.parentId);
    if (parent) {
      for (const child of parent.children) {
        if (child.id !== currentStructure.id) {
          siblings.push(child);
        }
      }
    }
  }

  // Calculate token count
  let tokenCount = countTokens(summarizeStructure(currentStructure));
  for (const ancestor of ancestors) {
    tokenCount += countTokens(summarizeStructure(ancestor));
  }

  // Trim if over budget
  while (tokenCount > budget && ancestors.length > 1) {
    const removed = ancestors.shift();
    if (removed) {
      tokenCount -= countTokens(summarizeStructure(removed));
    }
  }

  return {
    current: currentStructure,
    ancestors,
    siblings: siblings.slice(0, 3), // Limit siblings
    tokenCount,
  };
}

// Type guards for full vs summary entities
function isFullCharacter(entity: Character | CharacterSummary): entity is Character {
  return 'traits' in entity;
}

function isFullLocation(entity: Location | LocationSummary): entity is Location {
  return 'features' in entity;
}

function isFullFaction(entity: Faction | FactionSummary): entity is Faction {
  return 'members' in entity;
}

function isFullWorldRule(entity: WorldRule | WorldRuleSummary): entity is WorldRule {
  return 'exceptions' in entity;
}

function isFullPlotThread(entity: PlotThread | PlotThreadSummary): entity is PlotThread {
  return 'promises' in entity;
}

/**
 * Format assembled context for LLM prompt
 */
export function formatContext(context: AssembledContext): string {
  const sections: string[] = [];

  // Bible section
  if (
    context.bible.characters.length > 0 ||
    context.bible.locations.length > 0 ||
    context.bible.factions.length > 0 ||
    context.bible.worldRules.length > 0 ||
    context.bible.plotThreads.length > 0
  ) {
    sections.push(formatBibleContext(context.bible));
  }

  // Structure section
  if (context.structure) {
    sections.push(formatStructureContext(context.structure));
  }

  // Recent content section
  if (context.recentContent.length > 0) {
    sections.push(formatRecentContent(context.recentContent));
  }

  // Constraints section
  if (context.constraints.length > 0) {
    sections.push(formatConstraintsSection(context.constraints));
  }

  return sections.join('\n\n---\n\n');
}

function formatBibleContext(bible: BibleContext): string {
  const lines: string[] = ['## Story Bible\n'];

  if (bible.characters.length > 0) {
    lines.push('### Characters');
    for (const char of bible.characters) {
      if ('traits' in char) {
        lines.push(`**${char.name}** (${char.role}, ${char.status})`);
        lines.push(char.description);
      } else {
        lines.push(`**${char.name}** (${char.role}, ${char.status}): ${char.brief}`);
      }
    }
    lines.push('');
  }

  if (bible.locations.length > 0) {
    lines.push('### Locations');
    for (const loc of bible.locations) {
      if ('features' in loc) {
        lines.push(`**${loc.name}** (${loc.type})`);
        lines.push(loc.description);
      } else {
        lines.push(`**${loc.name}** (${loc.type}): ${loc.brief}`);
      }
    }
    lines.push('');
  }

  if (bible.worldRules.length > 0) {
    lines.push('### World Rules');
    for (const rule of bible.worldRules) {
      lines.push(`**${rule.name}** (${rule.category}): ${rule.rule}`);
    }
    lines.push('');
  }

  if (bible.plotThreads.length > 0) {
    lines.push('### Active Plot Threads');
    for (const thread of bible.plotThreads) {
      if ('promises' in thread) {
        lines.push(`**${thread.name}** (${thread.type}, ${thread.status})`);
        lines.push(thread.description);
      } else {
        lines.push(`**${thread.name}** (${thread.type}, ${thread.status}): ${thread.brief}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatStructureContext(structure: StructureContext): string {
  const lines: string[] = ['## Current Structure\n'];

  // Hierarchy path
  if (structure.ancestors.length > 0) {
    const path = structure.ancestors.map((a) => a.title).join(' → ');
    lines.push(`Path: ${path} → **${structure.current.title}**\n`);
  }

  // Current structure details
  lines.push(summarizeStructure(structure.current));

  // Adjacent chapters (for flow context)
  if (structure.siblings.length > 0) {
    lines.push('\n### Adjacent Sections');
    for (const sib of structure.siblings) {
      lines.push(`- ${sib.title}: ${sib.summary || '(no summary)'}`);
    }
  }

  return lines.join('\n');
}

function formatRecentContent(content: ContentContext[]): string {
  const lines: string[] = ['## Recent Content\n'];

  for (const c of content) {
    const chapterLabel = c.chapterNumber ? `Chapter ${c.chapterNumber}` : c.title;
    lines.push(`### ${chapterLabel}`);
    lines.push(c.summary);
    lines.push('');
  }

  return lines.join('\n');
}

function formatConstraintsSection(constraints: Constraint[]): string {
  const lines: string[] = ['## Constraints\n'];

  // Group by critical vs non-critical
  const critical = constraints.filter((c) => c.critical);
  const normal = constraints.filter((c) => !c.critical);

  if (critical.length > 0) {
    lines.push('### Critical (must not violate)');
    for (const c of critical) {
      lines.push(`⚠️ ${c.statement}`);
    }
    lines.push('');
  }

  if (normal.length > 0) {
    lines.push('### Important');
    for (const c of normal) {
      lines.push(`• ${c.statement}`);
    }
  }

  return lines.join('\n');
}
