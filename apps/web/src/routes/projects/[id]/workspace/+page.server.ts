import { error, fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import { createStructureService } from '@repo/core';
import { createStructureRepository, createContentRepository } from '@repo/core/storage';
import type { Structure, ChapterType, HookType, StructureType } from '@repo/types';

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

  // Get the full structure tree
  const structureTree = structureService.getFullTree();
  const allStructures = structureService.getAll();
  const stats = structureService.getStats();

  // Get selected structure from URL if any
  const selectedStructureId = url.searchParams.get('structure');
  let selectedStructure: Structure | undefined;
  let selectedContent;

  if (selectedStructureId) {
    selectedStructure = structureService.getWithChildren(selectedStructureId);
    if (selectedStructure) {
      // Get content for this structure if it exists
      selectedContent = contentRepo.findByStructure(params.id, selectedStructureId);
    }
  }

  // Get bible for context assembly
  const bible = bibleService.getBible();

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    structureTree,
    allStructures,
    stats,
    selectedStructure,
    selectedContent,
    bible,
  };
};

export const actions: Actions = {
  createStructure: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const structureService = createStructureService(params.id, structureRepo);

    try {
      const parentId = formData.get('parentId') as string | null;
      const type = formData.get('type') as StructureType;
      const title = formData.get('title') as string;
      const summary = formData.get('summary') as string || '';

      const structure = structureService.create({
        type,
        title,
        summary,
        parentId: parentId || undefined,
        beats: [],
        order: 0,
      });

      return redirect(303, `/projects/${params.id}/workspace?structure=${structure.id}`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('createStructure error:', err);
      return fail(400, { message: 'Failed to create structure' });
    }
  },

  updateStructure: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const structureService = createStructureService(params.id, structureRepo);

    try {
      const structureId = formData.get('structureId') as string;
      const title = formData.get('title') as string;
      const summary = formData.get('summary') as string || '';
      const chapterType = formData.get('chapterType') as ChapterType | null;
      const tensionTarget = formData.get('tensionTarget') as string | null;
      const targetWordCount = formData.get('targetWordCount') as string | null;
      const notes = formData.get('notes') as string || '';

      structureService.update(structureId, {
        title,
        summary,
        chapterType: chapterType || undefined,
        tensionTarget: tensionTarget ? parseInt(tensionTarget, 10) : undefined,
        targetWordCount: targetWordCount ? parseInt(targetWordCount, 10) : undefined,
        notes: notes || undefined,
      });

      return { success: true };
    } catch (err) {
      console.error('updateStructure error:', err);
      return fail(400, { message: 'Failed to update structure' });
    }
  },

  deleteStructure: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const structureService = createStructureService(params.id, structureRepo);

    try {
      const structureId = formData.get('structureId') as string;
      structureService.delete(structureId);

      return redirect(303, `/projects/${params.id}/workspace`);
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error('deleteStructure error:', err);
      return fail(400, { message: 'Failed to delete structure' });
    }
  },

  setHook: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const structureService = createStructureService(params.id, structureRepo);

    try {
      const structureId = formData.get('structureId') as string;
      const hookType = formData.get('hookType') as HookType | null;
      const hookDescription = formData.get('hookDescription') as string || '';
      const hookTargetStrength = formData.get('hookTargetStrength') as string | null;

      if (hookType) {
        structureService.setHook(structureId, {
          type: hookType,
          description: hookDescription,
          targetStrength: hookTargetStrength ? parseInt(hookTargetStrength, 10) : undefined,
        });
      } else {
        structureService.setHook(structureId, undefined);
      }

      return { success: true };
    } catch (err) {
      console.error('setHook error:', err);
      return fail(400, { message: 'Failed to set hook' });
    }
  },

  addBeat: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const structureService = createStructureService(params.id, structureRepo);

    try {
      const structureId = formData.get('structureId') as string;
      const description = formData.get('description') as string;
      const targetWordCount = formData.get('targetWordCount') as string | null;

      structureService.addBeat(
        structureId,
        description,
        targetWordCount ? parseInt(targetWordCount, 10) : undefined
      );

      return { success: true };
    } catch (err) {
      console.error('addBeat error:', err);
      return fail(400, { message: 'Failed to add beat' });
    }
  },

  removeBeat: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const structureService = createStructureService(params.id, structureRepo);

    try {
      const structureId = formData.get('structureId') as string;
      const beatId = formData.get('beatId') as string;

      structureService.removeBeat(structureId, beatId);

      return { success: true };
    } catch (err) {
      console.error('removeBeat error:', err);
      return fail(400, { message: 'Failed to remove beat' });
    }
  },

  toggleBeatCompleted: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const structureService = createStructureService(params.id, structureRepo);

    try {
      const structureId = formData.get('structureId') as string;
      const beatId = formData.get('beatId') as string;
      const completed = formData.get('completed') === 'true';

      structureService.markBeatCompleted(structureId, beatId, completed);

      return { success: true };
    } catch (err) {
      console.error('toggleBeatCompleted error:', err);
      return fail(400, { message: 'Failed to toggle beat completion' });
    }
  },

  saveContent: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const contentRepo = createContentRepository(locals.db, locals.drizzle);

    try {
      const structureId = formData.get('structureId') as string;
      const contentId = formData.get('contentId') as string | null;
      const text = formData.get('text') as string;

      if (contentId) {
        // Update existing content with new version
        contentRepo.addVersion(params.id, contentId, text, 'edited', {
          editDescription: 'Manual edit',
        });
      } else {
        // Create new content
        contentRepo.create(params.id, {
          structureId,
          text,
          status: 'draft',
          reviews: [],
          generationHistory: [],
          locked: false,
        });
      }

      return { success: true };
    } catch (err) {
      console.error('saveContent error:', err);
      return fail(400, { message: 'Failed to save content' });
    }
  },

  rollbackContent: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const contentRepo = createContentRepository(locals.db, locals.drizzle);

    try {
      const contentId = formData.get('contentId') as string;
      const targetVersion = parseInt(formData.get('targetVersion') as string, 10);

      contentRepo.rollbackToVersion(params.id, contentId, targetVersion);

      return { success: true };
    } catch (err) {
      console.error('rollbackContent error:', err);
      return fail(400, { message: 'Failed to rollback content' });
    }
  },
};
