import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { ProjectFormat } from '@repo/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  return {
    project,
  };
};

export const actions: Actions = {
  update: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const format = formData.get('format') as ProjectFormat;
    const author = formData.get('author') as string | null;
    const description = formData.get('description') as string | null;

    if (!title?.trim()) {
      return fail(400, { error: 'Title is required', success: false });
    }

    const project = locals.projectService.loadProject(params.id);
    if (!project) {
      return fail(404, { error: 'Project not found', success: false });
    }

    // Update project
    project.title = title.trim();
    project.format = format || 'web-serial';

    if (author) {
      project.metadata.author = author;
    } else {
      delete project.metadata.author;
    }

    if (description) {
      project.metadata.description = description;
    } else {
      delete project.metadata.description;
    }

    locals.projectService.saveProject(project);

    return { success: true };
  },
};
