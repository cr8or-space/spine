import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createBibleService } from '@repo/core/bible';
import type { WorldRule, RuleException } from '@repo/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);

  if (!project) {
    throw error(404, 'Project not found');
  }

  const bibleService = createBibleService(locals.db, params.id);
  const worldRule = bibleService.worldRules.get(params.ruleId);

  if (!worldRule) {
    throw error(404, 'World rule not found');
  }

  // Get all world rules for related rules selection
  const allWorldRules = bibleService.worldRules.getAll();

  return {
    project: {
      id: project.id,
      title: project.title,
    },
    worldRule,
    allWorldRules: allWorldRules.filter((r) => r.id !== worldRule.id),
  };
};

export const actions: Actions = {
  update: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const data: Partial<WorldRule> = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as WorldRule['category'],
        rule: formData.get('rule') as string,
        rationale: formData.get('rationale') as string || undefined,
        consequences: formData.get('consequences') as string || undefined,
        publicKnowledge: formData.get('publicKnowledge') === 'true',
        priority: parseInt(formData.get('priority') as string),
        established: formData.get('established') === 'true',
        exceptions: JSON.parse(formData.get('exceptions') as string || '[]'),
        relatedRules: JSON.parse(formData.get('relatedRules') as string || '[]'),
      };

      const updated = bibleService.worldRules.update(params.ruleId, data);

      if (!updated) {
        return fail(404, { message: 'World rule not found' });
      }

      return { success: true };
    } catch {
      return fail(400, { message: 'Invalid world rule data' });
    }
  },

  delete: async ({ params, locals }) => {
    const bibleService = createBibleService(locals.db, params.id);
    const deleted = bibleService.worldRules.delete(params.ruleId);

    if (!deleted) {
      return fail(404, { message: 'World rule not found' });
    }

    throw redirect(303, `/projects/${params.id}/bible`);
  },

  addException: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);

    try {
      const exception: RuleException = {
        condition: formData.get('condition') as string,
        effect: formData.get('effect') as string,
        applicableTo: JSON.parse(formData.get('applicableTo') as string || '[]'),
      };

      const updated = bibleService.worldRules.addException(params.ruleId, exception);

      if (!updated) {
        return fail(404, { message: 'World rule not found' });
      }

      return { success: true };
    } catch {
      return fail(400, { message: 'Invalid exception data' });
    }
  },

  removeException: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const exceptionIndex = parseInt(formData.get('exceptionIndex') as string);

    const updated = bibleService.worldRules.removeException(params.ruleId, exceptionIndex);

    if (!updated) {
      return fail(404, { message: 'World rule or exception not found' });
    }

    return { success: true };
  },

  addRelatedRule: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const relatedRuleId = formData.get('relatedRuleId') as string;

    const updated = bibleService.worldRules.addRelatedRule(params.ruleId, relatedRuleId);

    if (!updated) {
      return fail(404, { message: 'World rule not found' });
    }

    return { success: true };
  },

  removeRelatedRule: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const bibleService = createBibleService(locals.db, params.id);
    const relatedRuleId = formData.get('relatedRuleId') as string;

    const updated = bibleService.worldRules.removeRelatedRule(params.ruleId, relatedRuleId);

    if (!updated) {
      return fail(404, { message: 'World rule or related rule not found' });
    }

    return { success: true };
  },
};
