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

    // Update project settings
    const updatedSettings = {
      ...project.settings,
      title: title.trim(),
      format: format || 'web-serial',
    };

    const updatedMetadata = {
      ...project.metadata,
    };

    if (author) {
      updatedMetadata.author = author;
    } else {
      delete updatedMetadata.author;
    }

    if (description) {
      updatedMetadata.description = description;
    } else {
      delete updatedMetadata.description;
    }

    // Use specific update methods instead of saveProject to avoid structure/content issues
    locals.projectService.updateSettings(params.id, updatedSettings);
    locals.projectService.updateMetadata(params.id, updatedMetadata);

    return { success: true };
  },
};
