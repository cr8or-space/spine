/**
 * Tests for Review API
 */

import { describe, it, expect, vi } from 'vitest';
import { createReviewApi } from './review';
import type { SpineClient } from '../client';

function createMockClient(): SpineClient {
  return {
    request: vi.fn()
  } as unknown as SpineClient;
}

describe('ReviewApi', () => {
  describe('queue', () => {
    it('should call review.queue', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      const mockQueue = [{ contentId: 'c1', status: 'draft' }];
      vi.mocked(client.request).mockResolvedValue(mockQueue);

      const result = await api.queue('proj-1');

      expect(client.request).toHaveBeenCalledWith('review.queue', {
        projectId: 'proj-1',
        status: undefined
      });
      expect(result).toEqual(mockQueue);
    });

    it('should call review.queue with status filter', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      vi.mocked(client.request).mockResolvedValue([]);

      await api.queue('proj-1', 'review');

      expect(client.request).toHaveBeenCalledWith('review.queue', {
        projectId: 'proj-1',
        status: 'review'
      });
    });
  });

  describe('getItem', () => {
    it('should call review.getItem', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      const mockContent = { id: 'c1', text: 'Content' };
      vi.mocked(client.request).mockResolvedValue(mockContent);

      const result = await api.getItem('proj-1', 'c1');

      expect(client.request).toHaveBeenCalledWith('review.getItem', {
        projectId: 'proj-1',
        contentId: 'c1'
      });
      expect(result).toEqual(mockContent);
    });
  });

  describe('submitAction', () => {
    it('should call review.submitAction', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      const mockResult = { success: true, content: { id: 'c1' } };
      vi.mocked(client.request).mockResolvedValue(mockResult);

      const result = await api.submitAction('proj-1', 'c1', 0, 'accept');

      expect(client.request).toHaveBeenCalledWith('review.submitAction', {
        projectId: 'proj-1',
        contentId: 'c1',
        paragraphIndex: 0,
        action: 'accept'
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('bulkApprove', () => {
    it('should call review.bulkApprove', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      const mockResult = { succeeded: ['c1', 'c2'], failed: [] };
      vi.mocked(client.request).mockResolvedValue(mockResult);

      const result = await api.bulkApprove('proj-1', ['c1', 'c2']);

      expect(client.request).toHaveBeenCalledWith('review.bulkApprove', {
        projectId: 'proj-1',
        contentIds: ['c1', 'c2']
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('createLockPoint', () => {
    it('should call review.createLockPoint', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      const mockLockPoint = { id: 'lp1', structureId: 's1' };
      vi.mocked(client.request).mockResolvedValue(mockLockPoint);

      const result = await api.createLockPoint('proj-1', 's1');

      expect(client.request).toHaveBeenCalledWith('review.createLockPoint', {
        projectId: 'proj-1',
        structureId: 's1'
      });
      expect(result).toEqual(mockLockPoint);
    });
  });

  describe('removeLockPoint', () => {
    it('should call review.removeLockPoint', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      const result = await api.removeLockPoint('proj-1', 'lp1');

      expect(client.request).toHaveBeenCalledWith('review.removeLockPoint', {
        projectId: 'proj-1',
        lockPointId: 'lp1'
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('getLockPoints', () => {
    it('should call review.getLockPoints', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      const mockLockPoints = [{ id: 'lp1' }, { id: 'lp2' }];
      vi.mocked(client.request).mockResolvedValue(mockLockPoints);

      const result = await api.getLockPoints('proj-1');

      expect(client.request).toHaveBeenCalledWith('review.getLockPoints', {
        projectId: 'proj-1',
        contentId: undefined
      });
      expect(result).toEqual(mockLockPoints);
    });

    it('should call review.getLockPoints with contentId', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      vi.mocked(client.request).mockResolvedValue([]);

      await api.getLockPoints('proj-1', 'c1');

      expect(client.request).toHaveBeenCalledWith('review.getLockPoints', {
        projectId: 'proj-1',
        contentId: 'c1'
      });
    });
  });

  describe('addComment', () => {
    it('should call review.addComment', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      const comment = { paragraphIndex: 2, text: 'Fix this' };
      vi.mocked(client.request).mockResolvedValue({ id: 'c1', reviews: [] });

      await api.addComment('proj-1', 'c1', comment);

      expect(client.request).toHaveBeenCalledWith('review.addComment', {
        projectId: 'proj-1',
        contentId: 'c1',
        comment
      });
    });
  });

  describe('resolveComment', () => {
    it('should call review.resolveComment', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      vi.mocked(client.request).mockResolvedValue({ id: 'c1' });

      await api.resolveComment('proj-1', 'c1', 'comment-1');

      expect(client.request).toHaveBeenCalledWith('review.resolveComment', {
        projectId: 'proj-1',
        contentId: 'c1',
        commentId: 'comment-1'
      });
    });
  });

  describe('transitionStatus', () => {
    it('should call review.transitionStatus', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      await api.transitionStatus('proj-1', 'c1', 'approved');

      expect(client.request).toHaveBeenCalledWith('review.transitionStatus', {
        projectId: 'proj-1',
        contentId: 'c1',
        newStatus: 'approved',
        reason: undefined
      });
    });

    it('should call review.transitionStatus with reason', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true });

      await api.transitionStatus('proj-1', 'c1', 'draft', 'Needs revision');

      expect(client.request).toHaveBeenCalledWith('review.transitionStatus', {
        projectId: 'proj-1',
        contentId: 'c1',
        newStatus: 'draft',
        reason: 'Needs revision'
      });
    });
  });

  describe('previewCascade', () => {
    it('should call review.previewCascade', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      const mockPreview = { affectedStructures: ['s1', 's2'], lockPoints: [] };
      vi.mocked(client.request).mockResolvedValue(mockPreview);

      const result = await api.previewCascade('proj-1', 'c1');

      expect(client.request).toHaveBeenCalledWith('review.previewCascade', {
        projectId: 'proj-1',
        contentId: 'c1'
      });
      expect(result).toEqual(mockPreview);
    });
  });

  describe('executeCascade', () => {
    it('should call review.executeCascade', async () => {
      const client = createMockClient();
      const api = createReviewApi(client);

      vi.mocked(client.request).mockResolvedValue({ success: true, affected: 5 });

      const result = await api.executeCascade('proj-1', 'c1');

      expect(client.request).toHaveBeenCalledWith('review.executeCascade', {
        projectId: 'proj-1',
        contentId: 'c1'
      });
      expect(result).toEqual({ success: true, affected: 5 });
    });
  });
});
