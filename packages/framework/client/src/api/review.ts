/**
 * Review API methods
 */

import type { SpineClient } from '../client';
import type {
  Content,
  ContentStatus,
  LockPoint,
  ReviewQueueItem
} from '@repo/serial-types';
import type { ApplyActionResult, StatusTransitionResult } from '@repo/serial-core';

export interface ReviewApi {
  queue(projectId: string, status?: ContentStatus): Promise<ReviewQueueItem[]>;
  getItem(projectId: string, contentId: string): Promise<Content>;
  submitAction(
    projectId: string,
    contentId: string,
    paragraphIndex: number,
    action: 'accept' | 'reject' | 'regenerate'
  ): Promise<ApplyActionResult>;
  bulkApprove(
    projectId: string,
    contentIds: string[]
  ): Promise<BulkApproveResult>;
  createLockPoint(projectId: string, structureId: string): Promise<LockPoint>;
  removeLockPoint(projectId: string, lockPointId: string): Promise<{ success: boolean }>;
  getLockPoints(projectId: string, contentId?: string): Promise<LockPoint[]>;
  addComment(
    projectId: string,
    contentId: string,
    comment: CommentInput
  ): Promise<Content>;
  resolveComment(
    projectId: string,
    contentId: string,
    commentId: string
  ): Promise<Content>;
  transitionStatus(
    projectId: string,
    contentId: string,
    newStatus: ContentStatus,
    reason?: string
  ): Promise<StatusTransitionResult>;
  previewCascade(projectId: string, contentId: string): Promise<CascadePreview>;
  executeCascade(projectId: string, contentId: string): Promise<CascadeResult>;
}

export interface CommentInput {
  paragraphIndex: number;
  text: string;
  author?: string;
}

export interface BulkApproveResult {
  succeeded: string[];
  failed: Array<{ contentId: string; reason: string }>;
}

export interface CascadePreview {
  affectedStructures: string[];
  lockPoints: LockPoint[];
}

export interface CascadeResult {
  success: boolean;
  affected: number;
}

export function createReviewApi(client: SpineClient): ReviewApi {
  return {
    async queue(projectId: string, status?: ContentStatus): Promise<ReviewQueueItem[]> {
      return client.request<ReviewQueueItem[]>('review.queue', { projectId, status });
    },

    async getItem(projectId: string, contentId: string): Promise<Content> {
      return client.request<Content>('review.getItem', { projectId, contentId });
    },

    async submitAction(
      projectId: string,
      contentId: string,
      paragraphIndex: number,
      action: 'accept' | 'reject' | 'regenerate'
    ): Promise<ApplyActionResult> {
      return client.request<ApplyActionResult>('review.submitAction', {
        projectId,
        contentId,
        paragraphIndex,
        action
      });
    },

    async bulkApprove(
      projectId: string,
      contentIds: string[]
    ): Promise<BulkApproveResult> {
      return client.request<BulkApproveResult>('review.bulkApprove', {
        projectId,
        contentIds
      });
    },

    async createLockPoint(projectId: string, structureId: string): Promise<LockPoint> {
      return client.request<LockPoint>('review.createLockPoint', { projectId, structureId });
    },

    async removeLockPoint(projectId: string, lockPointId: string): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>('review.removeLockPoint', {
        projectId,
        lockPointId
      });
    },

    async getLockPoints(projectId: string, contentId?: string): Promise<LockPoint[]> {
      return client.request<LockPoint[]>('review.getLockPoints', { projectId, contentId });
    },

    async addComment(
      projectId: string,
      contentId: string,
      comment: CommentInput
    ): Promise<Content> {
      return client.request<Content>('review.addComment', {
        projectId,
        contentId,
        comment
      });
    },

    async resolveComment(
      projectId: string,
      contentId: string,
      commentId: string
    ): Promise<Content> {
      return client.request<Content>('review.resolveComment', {
        projectId,
        contentId,
        commentId
      });
    },

    async transitionStatus(
      projectId: string,
      contentId: string,
      newStatus: ContentStatus,
      reason?: string
    ): Promise<StatusTransitionResult> {
      return client.request<StatusTransitionResult>('review.transitionStatus', {
        projectId,
        contentId,
        newStatus,
        reason
      });
    },

    async previewCascade(projectId: string, contentId: string): Promise<CascadePreview> {
      return client.request<CascadePreview>('review.previewCascade', { projectId, contentId });
    },

    async executeCascade(projectId: string, contentId: string): Promise<CascadeResult> {
      return client.request<CascadeResult>('review.executeCascade', { projectId, contentId });
    }
  };
}
