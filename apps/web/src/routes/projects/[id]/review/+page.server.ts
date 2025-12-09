import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createReviewWorkflowService } from '@repo/core/review';
import { createContentRepository, createLockPointRepository, createStructureRepository } from '@repo/core/storage';

export const load: PageServerLoad = async ({ locals }) => {
  const contentRepo = createContentRepository(locals.db, locals.drizzle);
  const lockPointRepo = createLockPointRepository(locals.db, locals.drizzle);
  const structureRepo = createStructureRepository(locals.db, locals.drizzle);
  const reviewService = createReviewWorkflowService(contentRepo, lockPointRepo, structureRepo);

  try {
    const queue = await reviewService.getReviewQueue();

    return {
      queue,
    };
  } catch (err) {
    console.error('Failed to load review queue:', err);
    throw error(500, 'Failed to load review queue');
  }
};

export const actions: Actions = {
  bulkApprove: async ({ request, locals }) => {
    const contentRepo = createContentRepository(locals.db, locals.drizzle);
    const lockPointRepo = createLockPointRepository(locals.db, locals.drizzle);
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const reviewService = createReviewWorkflowService(contentRepo, lockPointRepo, structureRepo);

    const formData = await request.formData();
    const contentIds = formData.getAll('contentId').map(String);

    try {
      for (const contentId of contentIds) {
        const content = await contentRepo.findById(contentId);
        if (!content) continue;

        // Only approve if in review status and no unresolved issues
        if (content.status === 'review') {
          const hasUnresolvedIssues = content.reviews.some(r =>
            r.comments.some(c => c.type === 'issue' && !c.resolved)
          );

          if (!hasUnresolvedIssues) {
            await reviewService.transitionStatus(contentId, 'approved', {
              reason: 'Bulk approval',
            });
          }
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Bulk approve failed:', err);
      return fail(500, { error: 'Failed to approve content' });
    }
  },

  transitionStatus: async ({ request, locals }) => {
    const contentRepo = createContentRepository(locals.db, locals.drizzle);
    const lockPointRepo = createLockPointRepository(locals.db, locals.drizzle);
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const reviewService = createReviewWorkflowService(contentRepo, lockPointRepo, structureRepo);

    const formData = await request.formData();
    const contentId = formData.get('contentId')?.toString();
    const newStatus = formData.get('status')?.toString();

    if (!contentId || !newStatus) {
      return fail(400, { error: 'Missing required fields' });
    }

    try {
      await reviewService.transitionStatus(contentId, newStatus as 'draft' | 'review' | 'approved' | 'published', {
        reason: formData.get('reason')?.toString(),
      });

      return { success: true };
    } catch (err) {
      console.error('Status transition failed:', err);
      return fail(500, { error: String(err) });
    }
  },
};
