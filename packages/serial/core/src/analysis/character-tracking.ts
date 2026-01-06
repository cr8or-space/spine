/**
 * Character tracking data generation
 *
 * Tracks character appearances, presence intensity, relationship evolution,
 * and arc progress throughout the narrative.
 *
 * Phase 4.2 deliverables:
 * - Character appearance tracking per chapter
 * - Presence intensity levels (mention, scene, POV)
 * - Relationship evolution tracking
 * - Character arc progress indicators
 */

import type {
  Character,
  CharacterAppearanceDataPoint,
  CharacterArcProgress,
  CharacterPresenceHeatmap,
  CharacterTrackingData,
  ContentAnalysis,
  PresenceType,
  RelationshipEvolution,
  RelationshipSnapshot,
  Structure,
} from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';

/**
 * Input for character tracking generation
 */
export interface CharacterTrackingInput {
  /** Project ID */
  projectId: string;
  /** Root structure (book or arc) */
  rootStructure: Structure;
  /** Characters to track */
  characters: Character[];
}

/**
 * Dependencies for character tracking service
 */
export interface CharacterTrackingDependencies {
  /** Analysis repository for getting character appearances from analysis */
  analysisRepository: AnalysisRepository;
  /** Content repository for getting content linked to structures */
  contentRepository: ContentRepository;
}

/**
 * Chapter info for tracking
 */
interface ChapterInfo {
  structureId: string;
  position: number;
  title: string;
  contentId?: string;
  analysis?: ContentAnalysis;
}

/**
 * Extract chapters from structure in reading order
 */
function extractChapters(rootStructure: Structure): ChapterInfo[] {
  const chapters: ChapterInfo[] = [];
  let position = 0;

  function traverse(node: Structure): void {
    if (node.type === 'chapter' || node.type === 'scene') {
      position++;
      chapters.push({
        structureId: node.id,
        position,
        title: node.title,
      });
    }

    const sortedChildren = [...node.children].sort((a, b) => a.order - b.order);
    for (const child of sortedChildren) {
      traverse(child);
    }
  }

  traverse(rootStructure);
  return chapters;
}

/**
 * Get content and analysis for chapters
 */
function enrichChaptersWithAnalysis(
  projectId: string,
  chapters: ChapterInfo[],
  deps: CharacterTrackingDependencies
): ChapterInfo[] {
  return chapters.map((chapter) => {
    const content = deps.contentRepository.findByStructure(projectId, chapter.structureId);
    if (!content) return chapter;

    const analysis = deps.analysisRepository.findLatest(projectId, content.id);
    return {
      ...chapter,
      contentId: content.id,
      analysis,
    };
  });
}

/**
 * Convert presence type string to numeric intensity
 * 0 = not present, 1 = mention, 2 = scene, 3 = POV
 */
export function presenceToIntensity(presence: PresenceType | undefined): number {
  if (!presence) return 0;
  switch (presence) {
    case 'mention':
      return 1;
    case 'scene':
      return 2;
    case 'pov':
      return 3;
    default:
      return 0;
  }
}

/**
 * Convert numeric intensity to presence type
 */
export function intensityToPresence(intensity: number): PresenceType | undefined {
  switch (intensity) {
    case 1:
      return 'mention';
    case 2:
      return 'scene';
    case 3:
      return 'pov';
    default:
      return undefined;
  }
}

/**
 * Get character appearances from enriched chapters
 */
function getCharacterAppearances(
  characterId: string,
  chapters: ChapterInfo[]
): CharacterAppearanceDataPoint[] {
  const appearances: CharacterAppearanceDataPoint[] = [];

  for (const chapter of chapters) {
    if (!chapter.analysis) continue;

    const appearance = chapter.analysis.characterAppearances.find(
      (a) => a.characterId === characterId
    );

    if (appearance) {
      appearances.push({
        structureId: chapter.structureId,
        position: chapter.position,
        title: chapter.title,
        contentId: chapter.contentId,
        presenceType: appearance.type,
        dialogueLines: appearance.dialogueLines,
        isPov: appearance.type === 'pov',
      });
    }
  }

  return appearances;
}

/**
 * Calculate appearance summary statistics
 */
function calculateAppearanceSummary(
  appearances: CharacterAppearanceDataPoint[],
  totalChapters: number
): CharacterTrackingData['summary'] {
  const povChapters = appearances.filter((a) => a.isPov).length;
  const sceneAppearances = appearances.filter((a) => a.presenceType === 'scene').length;
  const mentionAppearances = appearances.filter((a) => a.presenceType === 'mention').length;
  const totalDialogueLines = appearances.reduce((sum, a) => sum + (a.dialogueLines ?? 0), 0);

  const positions = appearances.map((a) => a.position);
  const firstAppearance = positions.length > 0 ? Math.min(...positions) : undefined;
  const lastAppearance = positions.length > 0 ? Math.max(...positions) : undefined;

  return {
    totalAppearances: appearances.length,
    povChapters,
    sceneAppearances,
    mentionAppearances,
    totalDialogueLines,
    firstAppearance,
    lastAppearance,
    appearanceDensity: totalChapters > 0 ? appearances.length / totalChapters : 0,
  };
}

/**
 * Build relationship evolution data
 *
 * Tracks how a character's relationships change over time based on
 * chapter appearances where both characters are present.
 */
function buildRelationshipEvolution(
  character: Character,
  chapters: ChapterInfo[],
  allCharacters: Character[]
): RelationshipEvolution[] {
  const evolutions: RelationshipEvolution[] = [];

  for (const relationship of character.relationships) {
    const targetCharacter = allCharacters.find((c) => c.id === relationship.targetId);
    if (!targetCharacter) continue;

    const snapshots: RelationshipSnapshot[] = [];

    // Find chapters where both characters appear
    for (const chapter of chapters) {
      if (!chapter.analysis) continue;

      const sourceAppears = chapter.analysis.characterAppearances.some(
        (a) => a.characterId === character.id
      );
      const targetAppears = chapter.analysis.characterAppearances.some(
        (a) => a.characterId === relationship.targetId
      );

      if (sourceAppears && targetAppears) {
        // Both characters present - record relationship state
        // In a real implementation, we'd extract relationship intensity from the content
        // For now, we use the static relationship intensity
        snapshots.push({
          targetCharacterId: relationship.targetId,
          targetCharacterName: targetCharacter.name,
          type: relationship.type,
          intensity: relationship.intensity,
          position: chapter.position,
          structureId: chapter.structureId,
        });
      }
    }

    if (snapshots.length > 0) {
      const startIntensity = snapshots[0].intensity;
      const currentIntensity = snapshots[snapshots.length - 1].intensity;

      evolutions.push({
        targetCharacterId: relationship.targetId,
        targetCharacterName: targetCharacter.name,
        type: relationship.type,
        snapshots,
        startIntensity,
        currentIntensity,
        totalChange: currentIntensity - startIntensity,
      });
    }
  }

  return evolutions;
}

/**
 * Build character arc progress data
 */
function buildArcProgress(
  character: Character,
  chapters: ChapterInfo[]
): CharacterArcProgress | undefined {
  if (!character.arc) return undefined;

  const milestones = character.arc.milestones.map((milestone, index) => {
    // Find chapter position for achieved milestones
    let chapterPosition: number | undefined;
    if (milestone.achieved && milestone.chapterId) {
      const chapter = chapters.find((c) => c.structureId === milestone.chapterId);
      chapterPosition = chapter?.position;
    }

    return {
      description: milestone.description,
      chapterId: milestone.chapterId,
      chapterPosition,
      achieved: milestone.achieved,
      order: index,
    };
  });

  const achievedMilestones = milestones.filter((m) => m.achieved).length;

  return {
    arcType: character.arc.type,
    startingPoint: character.arc.startingPoint,
    destination: character.arc.destination,
    progress: character.arc.progress,
    milestones,
    achievedMilestones,
    totalMilestones: milestones.length,
  };
}

/**
 * Generate tracking data for a single character
 */
export function generateCharacterTrackingData(
  character: Character,
  chapters: ChapterInfo[],
  allCharacters: Character[]
): CharacterTrackingData {
  const appearances = getCharacterAppearances(character.id, chapters);
  const summary = calculateAppearanceSummary(appearances, chapters.length);
  const relationshipEvolution = buildRelationshipEvolution(character, chapters, allCharacters);
  const arcProgress = buildArcProgress(character, chapters);

  return {
    characterId: character.id,
    characterName: character.name,
    role: character.role,
    appearances,
    relationshipEvolution,
    arcProgress,
    summary,
  };
}

/**
 * Generate tracking data for all characters
 */
export function generateAllCharacterTracking(
  input: CharacterTrackingInput,
  deps: CharacterTrackingDependencies
): CharacterTrackingData[] {
  // Extract and enrich chapters
  const rawChapters = extractChapters(input.rootStructure);
  const chapters = enrichChaptersWithAnalysis(input.projectId, rawChapters, deps);

  // Generate tracking data for each character
  return input.characters.map((character) =>
    generateCharacterTrackingData(character, chapters, input.characters)
  );
}

/**
 * Generate character presence heatmap data
 *
 * Creates a matrix showing presence intensity for each character
 * in each chapter, suitable for heatmap visualization.
 */
export function generatePresenceHeatmap(
  input: CharacterTrackingInput,
  deps: CharacterTrackingDependencies
): CharacterPresenceHeatmap {
  // Extract and enrich chapters
  const rawChapters = extractChapters(input.rootStructure);
  const chapters = enrichChaptersWithAnalysis(input.projectId, rawChapters, deps);

  const characterIds = input.characters.map((c) => c.id);
  const characterNames = input.characters.map((c) => c.name);
  const positions = chapters.map((c) => c.position);
  const titles = chapters.map((c) => c.title);

  // Build presence matrix
  const matrix: number[][] = [];

  for (const character of input.characters) {
    const row: number[] = [];

    for (const chapter of chapters) {
      if (!chapter.analysis) {
        row.push(0);
        continue;
      }

      const appearance = chapter.analysis.characterAppearances.find(
        (a) => a.characterId === character.id
      );

      row.push(presenceToIntensity(appearance?.type));
    }

    matrix.push(row);
  }

  return {
    characterIds,
    characterNames,
    positions,
    titles,
    matrix,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get characters with declining presence
 *
 * Returns characters whose appearance rate has dropped in recent chapters.
 */
export function getCharactersWithDecliningPresence(
  trackingData: CharacterTrackingData[],
  recentChapterCount: number = 5,
  totalChapters: number
): CharacterTrackingData[] {
  if (totalChapters < recentChapterCount * 2) {
    return []; // Not enough data to compare
  }

  const midpoint = totalChapters - recentChapterCount;

  return trackingData.filter((data) => {
    const recentAppearances = data.appearances.filter((a) => a.position > midpoint).length;
    const earlierAppearances = data.appearances.filter((a) => a.position <= midpoint).length;

    // Normalize by chapter counts
    const recentRate = recentAppearances / recentChapterCount;
    const earlierRate = earlierAppearances / midpoint;

    // Character is declining if their recent rate is less than half their earlier rate
    return data.summary.totalAppearances > 0 && recentRate < earlierRate * 0.5;
  });
}

/**
 * Get characters missing from recent chapters
 *
 * Returns major characters who haven't appeared in recent chapters.
 */
export function getCharactersMissingRecently(
  trackingData: CharacterTrackingData[],
  recentChapterCount: number = 5,
  totalChapters: number
): CharacterTrackingData[] {
  const cutoff = totalChapters - recentChapterCount;

  return trackingData.filter((data) => {
    // Only consider major characters
    if (data.role !== 'protagonist' && data.role !== 'antagonist' && data.role !== 'major') {
      return false;
    }

    // Check if they have any appearances after the cutoff
    const hasRecentAppearance = data.appearances.some((a) => a.position > cutoff);
    return !hasRecentAppearance && data.summary.totalAppearances > 0;
  });
}

/**
 * Get characters with incomplete arcs
 *
 * Returns characters whose arcs have unachieved milestones.
 */
export function getCharactersWithIncompleteArcs(
  trackingData: CharacterTrackingData[]
): CharacterTrackingData[] {
  return trackingData.filter((data) => {
    if (!data.arcProgress) return false;
    return data.arcProgress.achievedMilestones < data.arcProgress.totalMilestones;
  });
}

/**
 * Get top characters by presence
 *
 * Returns the N characters with the most appearances.
 */
export function getTopCharactersByPresence(
  trackingData: CharacterTrackingData[],
  count: number = 10
): CharacterTrackingData[] {
  return [...trackingData]
    .sort((a, b) => b.summary.totalAppearances - a.summary.totalAppearances)
    .slice(0, count);
}

/**
 * Get characters by POV chapter count
 *
 * Returns characters sorted by number of POV chapters.
 */
export function getCharactersByPOVCount(
  trackingData: CharacterTrackingData[]
): CharacterTrackingData[] {
  return [...trackingData]
    .filter((data) => data.summary.povChapters > 0)
    .sort((a, b) => b.summary.povChapters - a.summary.povChapters);
}
