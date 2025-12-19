/**
 * Serial API handlers - Release planning, hook patterns, cycle status, mystery board
 *
 * These handlers provide data for web serial management including
 * buffer status, release scheduling, hook pattern analysis,
 * tension cycle tracking, and mystery board visualization.
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import { API_METHODS } from '../protocol';
import type {
  BufferStatus,
  ScheduledRelease,
  MysteryTrackingData,
  Structure
} from '@repo/types';
import {
  calculateBufferStatus,
  calculateBufferDepletion,
  extractChapterReleaseDataPoints,
  generateScheduledReleases,
  analyzeHookPatternsWithDeps,
  analyzeCycleEnforcementWithDeps,
  generateAllMysteryTracking,
  createAnalysisRepository,
  type HookManagementDependencies,
  type CycleEnforcementDependencies,
  type MysteryTrackingDependencies,
  type HookPatternResult,
  type CycleEnforcementResult
} from '@repo/core';

// Simplified param types
interface SerialProjectParams {
  projectId: string;
}

interface SerialScopeParams {
  projectId: string;
  scope?: {
    bookId?: string;
    arcId?: string;
  };
}

// Buffer depletion info
interface BufferDepletionInfo {
  currentBuffer: number;
  depletionDate: string | null;
  daysUntilDepletion: number | null;
}

// Release schedule result
interface ReleaseScheduleResult {
  schedule: ScheduledRelease[];
  nextReleaseDate: string | null;
  releasesPerWeek: number;
  depletion: BufferDepletionInfo;
}

/**
 * Register serial handlers on the router.
 */
export function registerSerialHandlers(router: Router, services: Services): void {
  // serial.bufferStatus - Get buffer status
  router.register<SerialProjectParams, BufferStatus>(
    API_METHODS.SERIAL_BUFFER_STATUS,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      // Get structure tree
      const structureService = services.structure(params.projectId);
      const rootStructure = structureService.getFullTree();

      // Build content map
      const contentMap = buildContentMap(params.projectId, rootStructure, services);

      // Extract chapter data points
      const dataPoints = extractChapterReleaseDataPoints(rootStructure, contentMap);

      // Get serial settings from project
      const settings = project.settings?.serialSettings ?? {
        minimumBuffer: 3,
        releaseInterval: 7,
        releaseDay: 'monday'
      };

      // Calculate buffer status
      return calculateBufferStatus(dataPoints, settings);
    }
  );

  // serial.releaseSchedule - Get release schedule
  router.register<SerialProjectParams, ReleaseScheduleResult>(
    API_METHODS.SERIAL_RELEASE_SCHEDULE,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      // Get serial settings
      const settings = project.settings?.serialSettings ?? {
        minimumBuffer: 3,
        releaseInterval: 7,
        releaseDay: 'monday'
      };

      // Generate scheduled releases for next 12 weeks
      const referenceDate = new Date();
      const schedule = generateScheduledReleases(
        {
          startDate: referenceDate.toISOString(),
          intervalDays: settings.releaseInterval,
          scheduledDays: settings.releaseDay ? [settings.releaseDay] : undefined
        },
        12,
        referenceDate.toISOString()
      );

      // Get structure tree for buffer calculation
      const structureService = services.structure(params.projectId);
      const rootStructure = structureService.getFullTree();
      const contentMap = buildContentMap(params.projectId, rootStructure, services);
      const dataPoints = extractChapterReleaseDataPoints(rootStructure, contentMap);
      const bufferStatus = calculateBufferStatus(dataPoints, settings);

      // Calculate buffer depletion
      const depletion = calculateBufferDepletion(bufferStatus, settings, {
        projectionDays: 90,
        warningThresholdDays: 7,
        criticalThresholdDays: 3,
        referenceDate: referenceDate.toISOString()
      });

      // Find next release date
      const nextRelease = schedule.find(s => !s.isPublished);
      const nextReleaseDate = nextRelease?.date ?? null;

      // Calculate releases per week
      const releasesPerWeek = 7 / settings.releaseInterval;

      return {
        schedule,
        nextReleaseDate,
        releasesPerWeek,
        depletion: {
          currentBuffer: depletion.currentBuffer,
          depletionDate: depletion.depletionDate ?? null,
          daysUntilDepletion: depletion.daysUntilDepletion ?? null
        }
      };
    }
  );

  // serial.hookPatterns - Get hook pattern analysis
  router.register<SerialScopeParams, HookPatternResult>(
    API_METHODS.SERIAL_HOOK_PATTERNS,
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

      // Build dependencies
      const deps: HookManagementDependencies = {
        analysisRepository: analysisRepo,
        contentRepository: services.project.repos.contents
      };

      // Analyze hook patterns
      return analyzeHookPatternsWithDeps(
        {
          projectId: params.projectId,
          rootStructure
        },
        deps
      );
    }
  );

  // serial.cycleStatus - Get tension cycle status
  router.register<SerialScopeParams, CycleEnforcementResult>(
    API_METHODS.SERIAL_CYCLE_STATUS,
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

      // Build dependencies
      const deps: CycleEnforcementDependencies = {
        analysisRepository: analysisRepo,
        contentRepository: services.project.repos.contents
      };

      // Analyze cycle enforcement
      return analyzeCycleEnforcementWithDeps(
        {
          projectId: params.projectId,
          rootStructure
        },
        deps
      );
    }
  );

  // serial.mysteryBoard - Get mystery tracking data
  router.register<SerialProjectParams, Map<string, MysteryTrackingData>>(
    API_METHODS.SERIAL_MYSTERY_BOARD,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      // Get structure tree
      const structureService = services.structure(params.projectId);
      const rootStructure = structureService.getFullTree();

      // Get bible for mysteries
      const bible = services.bible(params.projectId).getBible();

      // Filter to mystery-type plot threads
      const mysteries = bible.plotThreads.filter(pt => pt.type === 'mystery');

      // Create analysis repository
      const analysisRepo = createAnalysisRepository(services.db, services.drizzle, params.projectId);

      // Build dependencies
      const deps: MysteryTrackingDependencies = {
        analysisRepository: analysisRepo,
        contentRepository: services.project.repos.contents
      };

      // Generate mystery tracking data
      return generateAllMysteryTracking(
        {
          projectId: params.projectId,
          rootStructure,
          mysteries
        },
        deps
      );
    }
  );
}

/**
 * Build a map of structure ID to content
 */
function buildContentMap(
  projectId: string,
  rootStructure: Structure,
  services: Services
): Map<string, import('@repo/types').Content> {
  const contentMap = new Map<string, import('@repo/types').Content>();

  function traverse(structure: Structure): void {
    const content = services.project.repos.contents.findByStructure(
      projectId,
      structure.id
    );
    if (content) {
      contentMap.set(structure.id, content);
    }

    for (const child of structure.children) {
      traverse(child);
    }
  }

  traverse(rootStructure);
  return contentMap;
}

/**
 * Find a structure by ID in the tree
 */
function findStructureById(
  node: Structure,
  targetId: string
): Structure | null {
  if (node.id === targetId) {
    return node;
  }

  for (const child of node.children) {
    const found = findStructureById(child, targetId);
    if (found) {
      return found;
    }
  }

  return null;
}
