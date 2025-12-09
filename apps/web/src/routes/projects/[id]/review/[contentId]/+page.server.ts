import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createContentRepository, createStructureRepository, createLockPointRepository } from '@repo/core/storage';
import { createReviewWorkflowService } from '@repo/core/review';
import { createVersionService } from '@repo/core/version';
import type { ReviewComment, ParagraphAction } from '@repo/types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const contentRepo = createContentRepository(locals.db, locals.drizzle);
  const structureRepo = createStructureRepository(locals.db, locals.drizzle);
  const versionService = createVersionService(contentRepo);

  try {
    const content = await contentRepo.findById(params.contentId);
    if (!content) {
      throw error(404, 'Content not found');
    }

    // Get structure path
    const structure = await structureRepo.findById(content.structureId);
    const structurePath = structure ? await structureRepo.getPath(structure.id) : 'Unknown';

    // Get version history
    const history = await versionService.getHistory(params.contentId);

    // Get diff from previous version if available
    let diff = null;
    if (content.currentVersion > 1) {
      diff = await versionService.getComparison(
        params.contentId,
        content.currentVersion - 1,
        content.currentVersion
      );
    }

    // Get current review or create empty
    const currentReview = content.reviews.length > 0
      ? content.reviews[content.reviews.length - 1]
      : {
          version: content.currentVersion,
          verdict: null,
          comments: [],
          actions: [],
          timeSpentSeconds: 0,
        };

    return {
      content,
      structurePath,
      history,
      diff,
      currentReview,
    };
  } catch (err) {
    console.error('Failed to load content for review:', err);
    throw error(500, 'Failed to load content');
  }
};

export const actions: Actions = {
  addComment: async ({ params, request, locals }) => {
    const contentRepo = createContentRepository(locals.db, locals.drizzle);
    const lockPointRepo = createLockPointRepository(locals.db, locals.drizzle);
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const reviewService = createReviewWorkflowService(contentRepo, lockPointRepo, structureRepo);

    const formData = await request.formData();
    const paragraphIndex = parseInt(formData.get('paragraphIndex')?.toString() || '0');
    const type = formData.get('type')?.toString() as ReviewComment['type'];
    const text = formData.get('text')?.toString();

    if (!text || !type) {
      return fail(400, { error: 'Missing required fields' });
    }

    try {
      await reviewService.addComment(params.contentId, {
        paragraphIndex,
        type,
        text,
        resolved: false,
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to add comment:', err);
      return fail(500, { error: String(err) });
    }
  },

  resolveComment: async ({ params, request, locals }) => {
    const contentRepo = createContentRepository(locals.db, locals.drizzle);
    const content = await contentRepo.findById(params.contentId);

    if (!content) {
      return fail(404, { error: 'Content not found' });
    }

    const formData = await request.formData();
    const commentId = formData.get('commentId')?.toString();

    if (!commentId) {
      return fail(400, { error: 'Missing comment ID' });
    }

    try {
      // Update the comment's resolved status
      const reviews = content.reviews.map(review => ({
        ...review,
        comments: review.comments.map(c =>
          c.id === commentId ? { ...c, resolved: true } : c
        ),
      }));

      await contentRepo.update(params.contentId, { reviews });

      return { success: true };
    } catch (err) {
      console.error('Failed to resolve comment:', err);
      return fail(500, { error: String(err) });
    }
  },

  applyAction: async ({ params, request, locals }) => {
    const contentRepo = createContentRepository(locals.db, locals.drizzle);
    const lockPointRepo = createLockPointRepository(locals.db, locals.drizzle);
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const reviewService = createReviewWorkflowService(contentRepo, lockPointRepo, structureRepo);

    const formData = await request.formData();
    const paragraphIndex = parseInt(formData.get('paragraphIndex')?.toString() || '0');
    const actionType = formData.get('action')?.toString() as ParagraphAction['action'];
    const reason = formData.get('reason')?.toString();
    const newText = formData.get('newText')?.toString();

    if (!actionType) {
      return fail(400, { error: 'Missing action type' });
    }

    try {
      const action: Omit<ParagraphAction, 'timestamp'> = {
        paragraphIndex,
        action: actionType,
        reason,
      };

      if (newText) {
        action.newText = newText;
      }

      await reviewService.applyParagraphAction(params.contentId, action);

      return { success: true };
    } catch (err) {
      console.error('Failed to apply action:', err);
      return fail(500, { error: String(err) });
    }
  },

  transitionStatus: async ({ params, request, locals }) => {
    const contentRepo = createContentRepository(locals.db, locals.drizzle);
    const lockPointRepo = createLockPointRepository(locals.db, locals.drizzle);
    const structureRepo = createStructureRepository(locals.db, locals.drizzle);
    const reviewService = createReviewWorkflowService(contentRepo, lockPointRepo, structureRepo);

    const formData = await request.formData();
    const newStatus = formData.get('status')?.toString();
    const reason = formData.get('reason')?.toString();

    if (!newStatus) {
      return fail(400, { error: 'Missing status' });
    }

    try {
      await reviewService.transitionStatus(params.contentId, newStatus as 'draft' | 'review' | 'approved' | 'published', { reason });

      return { success: true };
    } catch (err) {
      console.error('Status transition failed:', err);
      return fail(500, { error: String(err) });
    }
  },
};
