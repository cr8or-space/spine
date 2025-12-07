import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import type { PlotThread } from '@repo/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  const bibleService = createBibleService(locals.db, params.id);
  const plotThread = bibleService.plotThreads.get(params.threadId);

  if (!plotThread) {
    throw error(404, 'Plot thread not found');
  }

  // Get all characters and locations for association
  const allCharacters = bibleService.characters.getAll();
  const allLocations = bibleService.locations.getAll();

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    plotThread,
    allCharacters,
    allLocations,
  };
};

export const actions: Actions = {
  update: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data: Partial<PlotThread> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as PlotThread['type'],
        status: formData.get('status') as PlotThread['status'],
        scope: formData.get('scope') as PlotThread['scope'],
        priority: parseInt(formData.get('priority') as string),
        involvedCharacters: JSON.parse(formData.get('involvedCharacters') as string || '[]'),
        relatedLocations: JSON.parse(formData.get('relatedLocations') as string || '[]'),
      };

      const updated = bibleService.plotThreads.update(params.threadId, data);

      if (!updated) {
        return fail(404, { message: 'Plot thread not found' });
      }

      return { success: true };
    } catch {
      return fail(400, { message: 'Invalid plot thread data' });
    }
  },

  delete: async ({ params, locals }) => {
    const bibleService = createBibleService(locals.db, params.id);
    const deleted = bibleService.plotThreads.delete(params.threadId);

    if (!deleted) {
      return fail(404, { message: 'Plot thread not found' });
    }

    throw redirect(303, `/projects/${params.id}/bible`);
  },
};
