import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  // Get bible service for this project
  const bibleService = createBibleService(locals.db, params.id);

  // Get the complete bible
  const bible = bibleService.getBible();

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    bible,
  };
};
