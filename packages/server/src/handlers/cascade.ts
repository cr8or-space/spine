/**
 * Cascade API handlers - Revision cascade configuration and analysis
 *
 * These handlers manage the revision cascade system including
 * horizon configuration, impact analysis, and cascade protection.
 */

import type { Router } from '../router';
import { ApiError } from '../router';
import type { Services } from '../services';
import { API_METHODS } from '../protocol';
import type { LockPoint } from '@repo/types';
import type {
  RevisionHorizonConfig,
  ImpactAnalysisResult
} from '@repo/core';

// Param types
interface CascadeGetHorizonConfigParams {
  projectId: string;
}

interface CascadeSetHorizonConfigParams {
  projectId: string;
  config: Partial<RevisionHorizonConfig>;
}

interface CascadeAnalyzeImpactParams {
  projectId: string;
  contentId: string;
}

interface CascadeIsProtectedParams {
  projectId: string;
  contentId: string;
}

interface CascadeCreateProtectionParams {
  projectId: string;
  contentId: string;
  reason: string;
}

/**
 * Register cascade handlers on the router.
 */
export function registerCascadeHandlers(router: Router, services: Services): void {
  // cascade.getHorizonConfig - Get revision horizon configuration
  router.register<CascadeGetHorizonConfigParams, RevisionHorizonConfig>(
    API_METHODS.CASCADE_GET_HORIZON_CONFIG,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      return services.cascade.getHorizonConfig(params.projectId);
    }
  );

  // cascade.setHorizonConfig - Update revision horizon configuration
  router.register<CascadeSetHorizonConfigParams, RevisionHorizonConfig>(
    API_METHODS.CASCADE_SET_HORIZON_CONFIG,
    (params) => {
      // Verify project exists
      const project = services.project.loadProject(params.projectId);
      if (!project) {
        throw ApiError.projectNotFound(params.projectId);
      }

      return services.cascade.setHorizonConfig(params.projectId, params.config);
    }
  );

  // cascade.analyzeImpact - Analyze cascade impact for content
  router.register<CascadeAnalyzeImpactParams, ImpactAnalysisResult>(
    API_METHODS.CASCADE_ANALYZE_IMPACT,
    (params) => {
      // Verify content exists
      const content = services.project.repos.contents.findById(
        params.projectId,
        params.contentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      return services.cascade.analyzeImpact(params.projectId, params.contentId);
    }
  );

  // cascade.isProtected - Check if content is protected from cascades
  router.register<CascadeIsProtectedParams, { protected: boolean; reason?: string; lockPoint?: LockPoint }>(
    API_METHODS.CASCADE_IS_PROTECTED,
    (params) => {
      // Verify content exists
      const content = services.project.repos.contents.findById(
        params.projectId,
        params.contentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      return services.cascade.isProtected(params.projectId, params.contentId);
    }
  );

  // cascade.createProtection - Create cascade protection for content
  router.register<CascadeCreateProtectionParams, LockPoint | { error: string }>(
    API_METHODS.CASCADE_CREATE_PROTECTION,
    (params) => {
      // Verify content exists
      const content = services.project.repos.contents.findById(
        params.projectId,
        params.contentId
      );

      if (!content) {
        throw ApiError.entityNotFound('Content', params.contentId);
      }

      const lockPoint = services.cascade.createCascadeProtection(
        params.projectId,
        params.contentId,
        params.reason
      );

      if (!lockPoint) {
        throw ApiError.reviewError('Failed to create cascade protection');
      }

      return lockPoint;
    }
  );
}
