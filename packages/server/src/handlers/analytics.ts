/**
 * Analytics API handlers - Tension curves, character presence, plot threads, quality metrics
 *
 * These handlers provide data for analytics dashboards including
 * tension curve visualization, character presence heatmaps,
 * plot thread timelines, and quality metrics.
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import { API_METHODS } from '../protocol';
import type {
  TensionCurveData,
  CharacterTrackingData,
  PlotThreadTrackingData
} from '@repo/types';
import {
  generateTensionCurve,
  generateAllCharacterTracking,
  generateAllPlotThreadTracking,
  createAnalysisRepository,
  type TensionCurveDependencies,
  type CharacterTrackingDependencies,
  type PlotThreadTrackingDependencies
} from '@repo/core';

// Simplified param types
interface AnalyticsScopeParams {
  projectId: string;
  scope?: {
    bookId?: string;
    arcId?: string;
  };
}

// Quality metrics result
interface QualityMetricsResult {
  averageTensionScore: number;
  averageHookStrength: number;
  continuityIssueCount: number;
  chaptersAnalyzed: number;
  chaptersWithIssues: number;
}

/**
 * Register analytics handlers on the router.
 */
export function registerAnalyticsHandlers(router: Router, services: Services): void {
  // analytics.tensionCurve - Get tension curve data
  router.register<AnalyticsScopeParams, TensionCurveData | null>(
    API_METHODS.ANALYTICS_TENSION_CURVE,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      // Get structure tree
      const structureService = services.structure(params.projectId);
      let rootStructure = structureService.getFullTree();

      // If scope is specified, find the scoped structure
      if (params.scope?.bookId) {
        const bookStructure = findStructureById(rootStructure, params.scope.bookId);
        if (bookStructure) {
          rootStructure = bookStructure;
        }
      } else if (params.scope?.arcId) {
        const arcStructure = findStructureById(rootStructure, params.scope.arcId);
        if (arcStructure) {
          rootStructure = arcStructure;
        }
      }

      // Create analysis repository for this project
      const analysisRepo = createAnalysisRepository(services.db, services.drizzle, params.projectId);

      // Build dependencies
      const deps: TensionCurveDependencies = {
        analysisRepository: analysisRepo,
        contentRepository: services.project.repos.contents
      };

      // Generate tension curve data
      const curveData = generateTensionCurve(
        {
          projectId: params.projectId,
          rootStructure
        },
        deps
      );

      return curveData;
    }
  );

  // analytics.characterPresence - Get character presence data
  router.register<AnalyticsScopeParams, Map<string, CharacterTrackingData>>(
    API_METHODS.ANALYTICS_CHARACTER_PRESENCE,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      // Get structure tree
      const structureService = services.structure(params.projectId);
      let rootStructure = structureService.getFullTree();

      // If scope is specified, find the scoped structure
      if (params.scope?.bookId) {
        const bookStructure = findStructureById(rootStructure, params.scope.bookId);
        if (bookStructure) {
          rootStructure = bookStructure;
        }
      } else if (params.scope?.arcId) {
        const arcStructure = findStructureById(rootStructure, params.scope.arcId);
        if (arcStructure) {
          rootStructure = arcStructure;
        }
      }

      // Get bible for character info
      const bible = services.bible(params.projectId).getBible();

      // Create analysis repository
      const analysisRepo = createAnalysisRepository(services.db, services.drizzle, params.projectId);

      // Build dependencies
      const deps: CharacterTrackingDependencies = {
        analysisRepository: analysisRepo,
        contentRepository: services.project.repos.contents
      };

      // Generate character tracking data for all characters
      const trackingData = generateAllCharacterTracking(
        {
          projectId: params.projectId,
          rootStructure,
          characters: bible.characters
        },
        deps
      );

      return trackingData;
    }
  );

  // analytics.plotThreads - Get plot thread timeline data
  router.register<AnalyticsScopeParams, Map<string, PlotThreadTrackingData>>(
    API_METHODS.ANALYTICS_PLOT_THREADS,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      // Get structure tree
      const structureService = services.structure(params.projectId);
      let rootStructure = structureService.getFullTree();

      // If scope is specified, find the scoped structure
      if (params.scope?.bookId) {
        const bookStructure = findStructureById(rootStructure, params.scope.bookId);
        if (bookStructure) {
          rootStructure = bookStructure;
        }
      } else if (params.scope?.arcId) {
        const arcStructure = findStructureById(rootStructure, params.scope.arcId);
        if (arcStructure) {
          rootStructure = arcStructure;
        }
      }

      // Get bible for plot thread info
      const bible = services.bible(params.projectId).getBible();

      // Create analysis repository
      const analysisRepo = createAnalysisRepository(services.db, services.drizzle, params.projectId);

      // Build dependencies
      const deps: PlotThreadTrackingDependencies = {
        analysisRepository: analysisRepo,
        contentRepository: services.project.repos.contents
      };

      // Generate plot thread tracking data
      const trackingData = generateAllPlotThreadTracking(
        {
          projectId: params.projectId,
          rootStructure,
          plotThreads: bible.plotThreads
        },
        deps
      );

      return trackingData;
    }
  );

  // analytics.quality - Get quality metrics
  router.register<AnalyticsScopeParams, QualityMetricsResult>(
    API_METHODS.ANALYTICS_QUALITY,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      // Get structure tree
      const structureService = services.structure(params.projectId);
      let rootStructure = structureService.getFullTree();

      // If scope is specified, find the scoped structure
      if (params.scope?.bookId) {
        const bookStructure = findStructureById(rootStructure, params.scope.bookId);
        if (bookStructure) {
          rootStructure = bookStructure;
        }
      } else if (params.scope?.arcId) {
        const arcStructure = findStructureById(rootStructure, params.scope.arcId);
        if (arcStructure) {
          rootStructure = arcStructure;
        }
      }

      // Create analysis repository
      const analysisRepo = createAnalysisRepository(services.db, services.drizzle, params.projectId);

      // Collect all chapter/scene structure IDs
      const structureIds: string[] = [];
      collectChapterIds(rootStructure, structureIds);

      // Get analysis for each structure
      let totalTension = 0;
      let totalHookStrength = 0;
      let continuityIssueCount = 0;
      let chaptersAnalyzed = 0;
      let chaptersWithIssues = 0;

      for (const structureId of structureIds) {
        // Find content for this structure
        const content = services.project.repos.contents.findByStructure(
          params.projectId,
          structureId
        );

        if (!content) continue;

        // Get analysis for this content
        const analysis = analysisRepo.findByContent(content.id);
        if (!analysis) continue;

        chaptersAnalyzed++;

        // Aggregate tension
        if (analysis.tension?.score !== undefined) {
          totalTension += analysis.tension.score;
        }

        // Aggregate hook strength
        if (analysis.hook?.score !== undefined) {
          totalHookStrength += analysis.hook.score;
        }

        // Count continuity issues
        if (analysis.continuity?.issues) {
          const issueCount = analysis.continuity.issues.length;
          continuityIssueCount += issueCount;
          if (issueCount > 0) {
            chaptersWithIssues++;
          }
        }
      }

      return {
        averageTensionScore: chaptersAnalyzed > 0 ? totalTension / chaptersAnalyzed : 0,
        averageHookStrength: chaptersAnalyzed > 0 ? totalHookStrength / chaptersAnalyzed : 0,
        continuityIssueCount,
        chaptersAnalyzed,
        chaptersWithIssues
      };
    }
  );
}

/**
 * Find a structure by ID in the tree
 */
function findStructureById(
  node: { id: string; children: Array<{ id: string; children: unknown[] }> },
  targetId: string
): typeof node | null {
  if (node.id === targetId) {
    return node;
  }

  for (const child of node.children) {
    const found = findStructureById(child as typeof node, targetId);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Collect chapter and scene IDs from the structure tree
 */
function collectChapterIds(
  node: { type: string; id: string; children: unknown[] },
  result: string[]
): void {
  if (node.type === 'chapter' || node.type === 'scene') {
    result.push(node.id);
  }

  for (const child of node.children) {
    collectChapterIds(child as typeof node, result);
  }
}
