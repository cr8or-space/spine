import type { PageServerLoad, Actions } from './$types';
import type { ProjectFormat, ProjectMetadata } from '@repo/types';

export const load: PageServerLoad = async ({ locals }) => {
  const projects = locals.projectService.listProjects();
  return { projects };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const format = formData.get('format') as ProjectFormat;
    const author = formData.get('author') as string | null;
    const description = formData.get('description') as string | null;

    if (!title?.trim()) {
      return { success: false, error: 'Title is required' };
    }

    const metadata: Partial<ProjectMetadata> = {};
    if (author) metadata.author = author;
    if (description) metadata.description = description;

    const project = locals.projectService.createProject(title.trim(), format || 'web-serial', metadata);

    return { success: true, projectId: project.id };
  },

  delete: async ({ request, locals }) => {
    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;

    if (!projectId) {
      return { success: false, error: 'Project ID is required' };
    }

    const deleted = locals.projectService.deleteProject(projectId);

    return { success: deleted };
  },
};
