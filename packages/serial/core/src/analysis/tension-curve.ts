/**
 * Tension curve data generation
 *
 * Combines planned tension from structure with actual tension from
 * content analysis to produce data for tension curve visualization.
 *
 * Phase 4.1 deliverables:
 * - Planned tension extraction from structure
 * - Actual tension aggregation from content analysis
 * - Chapter-level data points
 * - Divergence calculation
 */

import type {
  Content,
  ContentAnalysis,
  Structure,
  TensionCurveData,
  TensionCurveDataPoint,
  TensionCurveMetadata,
} from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';

/**
 * Input for tension curve generation
 */
export interface TensionCurveInput {
  /** Project ID */
  projectId: string;
  /** Root structure (book or arc) */
  rootStructure: Structure;
}

/**
 * Dependencies for tension curve service
 */
export interface TensionCurveDependencies {
  /** Analysis repository for getting actual tension scores */
  analysisRepository: AnalysisRepository;
  /** Content repository for getting content linked to structures */
  contentRepository: ContentRepository;
}

/**
 * Planned tension data point (from structure)
 */
interface PlannedTensionPoint {
  structureId: string;
  title: string;
  structureType: 'chapter' | 'scene';
  tensionTarget?: number;
}

/**
 * Extract planned tension data from a structure tree
 *
 * Traverses the structure tree in reading order and extracts
 * tension targets from chapters and scenes.
 */
export function extractPlannedTension(rootStructure: Structure): PlannedTensionPoint[] {
  const points: PlannedTensionPoint[] = [];

  function traverse(node: Structure): void {
    // For chapters and scenes, add to the result
    if (node.type === 'chapter' || node.type === 'scene') {
      points.push({
        structureId: node.id,
        title: node.title,
        structureType: node.type,
        tensionTarget: node.tensionTarget,
      });
    }

    // Traverse children in order
    const sortedChildren = [...node.children].sort((a, b) => a.order - b.order);
    for (const child of sortedChildren) {
      traverse(child);
    }
  }

  traverse(rootStructure);

  // Points are already in reading order due to depth-first traversal
  return points;
}

/**
 * Iterate over map values (helper for ES compatibility)
 */
function iterateMapValues<T>(map: Map<string, T>): T[] {
  return Array.from(map.values());
}

/**
 * Get content and analysis for structures
 *
 * Returns a map of structure ID to { content, analysis } pairs.
 */
function getContentAndAnalysis(
  projectId: string,
  structureIds: string[],
  deps: TensionCurveDependencies
): Map<string, { content?: Content; analysis?: ContentAnalysis }> {
  const result = new Map<string, { content?: Content; analysis?: ContentAnalysis }>();

  for (const structureId of structureIds) {
    const content = deps.contentRepository.findByStructure(projectId, structureId);
    let analysis: ContentAnalysis | undefined;

    if (content) {
      analysis = deps.analysisRepository.findLatest(projectId, content.id);
    }

    result.set(structureId, { content, analysis });
  }

  return result;
}

/**
 * Calculate divergence between planned and actual tension
 *
 * Returns undefined if either value is missing.
 */
export function calculateDivergence(
  plannedTension: number | undefined,
  actualTension: number | undefined
): number | undefined {
  if (plannedTension === undefined || actualTension === undefined) {
    return undefined;
  }
  return actualTension - plannedTension;
}

/**
 * Build tension curve data points
 *
 * Combines planned tension from structure with actual tension from
 * content analysis for each chapter/scene.
 */
function buildDataPoints(
  projectId: string,
  plannedPoints: PlannedTensionPoint[],
  deps: TensionCurveDependencies
): TensionCurveDataPoint[] {
  const structureIds = plannedPoints.map((p) => p.structureId);
  const contentMap = getContentAndAnalysis(projectId, structureIds, deps);

  return plannedPoints.map((point, index): TensionCurveDataPoint => {
    const data = contentMap.get(point.structureId);
    const content = data?.content;
    const analysis = data?.analysis;

    const actualTension = analysis?.tensionScore?.score;
    const divergence = calculateDivergence(point.tensionTarget, actualTension);

    return {
      structureId: point.structureId,
      position: index + 1, // 1-indexed position
      title: point.title,
      structureType: point.structureType,
      plannedTension: point.tensionTarget,
      actualTension,
      divergence,
      wordCount: analysis?.wordCount,
      contentStatus: content?.status,
      hasContent: content !== undefined,
      hasAnalysis: analysis !== undefined,
      contentId: content?.id,
    };
  });
}

/**
 * Calculate metadata from data points
 */
function calculateMetadata(
  rootStructure: Structure,
  dataPoints: TensionCurveDataPoint[]
): TensionCurveMetadata {
  const plannedPoints = dataPoints.filter((p) => p.plannedTension !== undefined);
  const actualPoints = dataPoints.filter((p) => p.actualTension !== undefined);
  const divergencePoints = dataPoints.filter((p) => p.divergence !== undefined);

  // Calculate averages
  let averagePlannedTension: number | undefined;
  if (plannedPoints.length > 0) {
    const sum = plannedPoints.reduce((acc, p) => acc + (p.plannedTension ?? 0), 0);
    averagePlannedTension = sum / plannedPoints.length;
  }

  let averageActualTension: number | undefined;
  if (actualPoints.length > 0) {
    const sum = actualPoints.reduce((acc, p) => acc + (p.actualTension ?? 0), 0);
    averageActualTension = sum / actualPoints.length;
  }

  let averageAbsoluteDivergence: number | undefined;
  if (divergencePoints.length > 0) {
    const sum = divergencePoints.reduce((acc, p) => acc + Math.abs(p.divergence ?? 0), 0);
    averageAbsoluteDivergence = sum / divergencePoints.length;
  }

  return {
    rootStructureId: rootStructure.id,
    rootTitle: rootStructure.title,
    generatedAt: new Date().toISOString(),
    dataPointCount: dataPoints.length,
    plannedCount: plannedPoints.length,
    actualCount: actualPoints.length,
    averagePlannedTension,
    averageActualTension,
    averageAbsoluteDivergence,
  };
}

/**
 * Generate tension curve data
 *
 * Main entry point for tension curve generation. Combines planned
 * tension from structure with actual tension from content analysis.
 *
 * @param input - Project and root structure
 * @param deps - Repository dependencies
 * @returns Complete tension curve data for visualization
 */
export function generateTensionCurve(
  input: TensionCurveInput,
  deps: TensionCurveDependencies
): TensionCurveData {
  // Extract planned tension from structure
  const plannedPoints = extractPlannedTension(input.rootStructure);

  // Build data points with actual tension
  const dataPoints = buildDataPoints(input.projectId, plannedPoints, deps);

  // Calculate metadata
  const metadata = calculateMetadata(input.rootStructure, dataPoints);

  return {
    dataPoints,
    metadata,
  };
}

/**
 * Aggregate actual tension for a set of structures
 *
 * Returns the average actual tension across all content that
 * has been analyzed within the given structures.
 */
export function aggregateActualTension(
  projectId: string,
  structureIds: string[],
  deps: TensionCurveDependencies
): { averageTension: number; count: number } | undefined {
  const contentMap = getContentAndAnalysis(projectId, structureIds, deps);

  let totalTension = 0;
  let count = 0;

  for (const data of iterateMapValues(contentMap)) {
    if (data.analysis?.tensionScore?.score !== undefined) {
      totalTension += data.analysis.tensionScore.score;
      count++;
    }
  }

  if (count === 0) {
    return undefined;
  }

  return {
    averageTension: totalTension / count,
    count,
  };
}

/**
 * Calculate tension divergence for a structure
 *
 * Compares the structure's tension target with the average
 * actual tension from its content analysis.
 *
 * @returns Divergence (actual - planned), or undefined if either is missing
 */
export function calculateStructureDivergence(
  projectId: string,
  structure: Structure,
  deps: TensionCurveDependencies
): number | undefined {
  if (structure.tensionTarget === undefined) {
    return undefined;
  }

  // For a single chapter/scene, get its direct content
  if (structure.type === 'chapter' || structure.type === 'scene') {
    const content = deps.contentRepository.findByStructure(projectId, structure.id);
    if (!content) return undefined;

    const analysis = deps.analysisRepository.findLatest(projectId, content.id);
    if (!analysis) return undefined;

    return calculateDivergence(structure.tensionTarget, analysis.tensionScore.score);
  }

  // For arcs or books, get the average across all children
  const childStructureIds = collectChildStructureIds(structure);
  const aggregated = aggregateActualTension(projectId, childStructureIds, deps);

  if (!aggregated) {
    return undefined;
  }

  return calculateDivergence(structure.tensionTarget, aggregated.averageTension);
}

/**
 * Collect all chapter/scene IDs from a structure tree
 */
function collectChildStructureIds(structure: Structure): string[] {
  const ids: string[] = [];

  function traverse(node: Structure): void {
    if (node.type === 'chapter' || node.type === 'scene') {
      ids.push(node.id);
    }
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(structure);
  return ids;
}

/**
 * Get chapters with high divergence
 *
 * Returns chapters where the actual tension differs significantly
 * from the planned tension (above the threshold).
 */
export function getHighDivergenceChapters(
  tensionCurve: TensionCurveData,
  threshold: number = 15
): TensionCurveDataPoint[] {
  return tensionCurve.dataPoints.filter((point) => {
    if (point.divergence === undefined) return false;
    return Math.abs(point.divergence) > threshold;
  });
}

/**
 * Get chapters missing tension analysis
 *
 * Returns chapters that have planned tension but no actual tension
 * (content hasn't been written or analyzed yet).
 */
export function getMissingAnalysisChapters(
  tensionCurve: TensionCurveData
): TensionCurveDataPoint[] {
  return tensionCurve.dataPoints.filter((point) => {
    return point.plannedTension !== undefined && !point.hasAnalysis;
  });
}

/**
 * Get chapters missing tension targets
 *
 * Returns chapters that have content but no planned tension target.
 */
export function getMissingTargetChapters(
  tensionCurve: TensionCurveData
): TensionCurveDataPoint[] {
  return tensionCurve.dataPoints.filter((point) => {
    return point.hasContent && point.plannedTension === undefined;
  });
}
