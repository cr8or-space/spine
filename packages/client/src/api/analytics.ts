/**
 * Analytics API methods
 */

import type { SpineClient } from '../client';
import type {
  TensionCurveData,
  CharacterTrackingData,
  PlotThreadTrackingData
} from '@repo/types';

export interface AnalyticsApi {
  tensionCurve(projectId: string, scope?: AnalyticsScope): Promise<TensionCurveData | null>;
  characterPresence(
    projectId: string,
    scope?: AnalyticsScope
  ): Promise<Map<string, CharacterTrackingData>>;
  plotThreads(
    projectId: string,
    scope?: AnalyticsScope
  ): Promise<Map<string, PlotThreadTrackingData>>;
  quality(projectId: string, scope?: AnalyticsScope): Promise<QualityMetrics>;
}

export interface AnalyticsScope {
  bookId?: string;
  arcId?: string;
}

export interface QualityMetrics {
  averageTensionScore: number;
  averageHookStrength: number;
  continuityIssueCount: number;
  chaptersAnalyzed: number;
  chaptersWithIssues: number;
}

export function createAnalyticsApi(client: SpineClient): AnalyticsApi {
  return {
    async tensionCurve(
      projectId: string,
      scope?: AnalyticsScope
    ): Promise<TensionCurveData | null> {
      return client.request<TensionCurveData | null>('analytics.tensionCurve', {
        projectId,
        scope
      });
    },

    async characterPresence(
      projectId: string,
      scope?: AnalyticsScope
    ): Promise<Map<string, CharacterTrackingData>> {
      const result = await client.request<Record<string, CharacterTrackingData>>(
        'analytics.characterPresence',
        { projectId, scope }
      );
      return new Map(Object.entries(result));
    },

    async plotThreads(
      projectId: string,
      scope?: AnalyticsScope
    ): Promise<Map<string, PlotThreadTrackingData>> {
      const result = await client.request<Record<string, PlotThreadTrackingData>>(
        'analytics.plotThreads',
        { projectId, scope }
      );
      return new Map(Object.entries(result));
    },

    async quality(projectId: string, scope?: AnalyticsScope): Promise<QualityMetrics> {
      return client.request<QualityMetrics>('analytics.quality', { projectId, scope });
    }
  };
}
