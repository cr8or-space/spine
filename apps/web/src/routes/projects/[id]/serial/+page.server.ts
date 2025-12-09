import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import { createStructureService } from '@repo/core';
import { createStructureRepository, createContentRepository } from '@repo/core/storage';
import {
  createAnalysisRepository,
  analyzeHookPatterns,
  analyzeCycleEnforcement,
  generateAllMysteryTracking,
} from '@repo/core/analysis';
import { analyzeReleasePlanning } from '@repo/core/release';
import type {
  Structure,
  HookManagementResult,
  CycleEnforcementResult,
  ReleasePlanningResult,
  MysteryTrackingData,
} from '@repo/types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  // Get services
  const bibleService = createBibleService(locals.db, locals.drizzle, params.id);
  const structureRepo = createStructureRepository(locals.db, locals.drizzle);
  const structureService = createStructureService(params.id, structureRepo);
  const contentRepo = createContentRepository(locals.db, locals.drizzle);
  const analysisRepo = createAnalysisRepository(locals.db, locals.drizzle);

  // Get the full structure tree
  const structureTree = structureService.getFullTree();

  // Get bible data
  const bible = bibleService.getBible();

  // Get selected structure from URL (defaults to first book if not specified)
  const selectedStructureId = url.searchParams.get('structure');
  let rootStructure: Structure | undefined;

  if (selectedStructureId) {
    rootStructure = structureService.getWithChildren(selectedStructureId);
  } else {
    // Default to first book in the structure tree
    const firstBook = structureTree.find((s) => s.type === 'book');
    if (firstBook) {
      rootStructure = structureService.getWithChildren(firstBook.id);
    }
  }

  // Initialize serial analytics data
  let hookManagement: HookManagementResult | null = null;
  let cycleEnforcement: CycleEnforcementResult | null = null;
  let releasePlanning: ReleasePlanningResult | null = null;
  let mysteryTracking: MysteryTrackingData[] = [];

  // Get serial settings from project
  const serialSettings = project.serialSettings || {
    cycleLength: 5,
    cycleTensionTargets: [40, 60, 70, 80, 50],
    minimumBuffer: 5,
    releaseInterval: 2,
    enforceHookVariety: true,
    maxConsecutiveSameHook: 2,
  };

  // Generate serial analytics if we have a root structure
  if (rootStructure) {
    const deps = {
      analysisRepository: analysisRepo,
      contentRepository: contentRepo,
    };

    const releaseDeps = {
      contentRepository: contentRepo,
    };

    // Analyze hook patterns
    hookManagement = analyzeHookPatterns(
      {
        projectId: params.id,
        rootStructure,
        settings: {
          enforceVariety: serialSettings.enforceHookVariety,
          maxConsecutiveSameHook: serialSettings.maxConsecutiveSameHook,
        },
      },
      deps
    );

    // Analyze cycle enforcement
    cycleEnforcement = analyzeCycleEnforcement(
      {
        projectId: params.id,
        rootStructure,
        cycleConfig: {
          cycleLength: serialSettings.cycleLength,
          tensionTargets: serialSettings.cycleTensionTargets,
        },
      },
      deps
    );

    // Analyze release planning
    releasePlanning = analyzeReleasePlanning(
      {
        projectId: params.id,
        rootStructure,
        releaseSchedule: {
          minimumBuffer: serialSettings.minimumBuffer,
          releaseInterval: serialSettings.releaseInterval,
        },
      },
      releaseDeps
    );

    // Generate mystery tracking for mystery-type plot threads
    const mysteryThreads = bible.plotThreads.filter((thread) => thread.type === 'mystery');
    if (mysteryThreads.length > 0) {
      mysteryTracking = generateAllMysteryTracking(
        {
          projectId: params.id,
          rootStructure,
          mysteryThreads,
        },
        {
          analysisRepository: analysisRepo,
          contentRepository: contentRepo,
        }
      );
    }
  }

  return {
    project: {
      id: project.id,
      title: project.title,
      serialSettings,
    },
    structureTree,
    rootStructure,
    hookManagement,
    cycleEnforcement,
    releasePlanning,
    mysteryTracking,
    bible,
  };
};
