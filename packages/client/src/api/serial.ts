/**
 * Serial API methods
 */

import type { SpineClient } from '../client';
import type {
  BufferStatus,
  ScheduledRelease,
  MysteryTrackingData
} from '@repo/types';
import type { HookPatternResult, CycleEnforcementResult } from '@repo/core';

export interface SerialApi {
  bufferStatus(projectId: string): Promise<BufferStatus>;
  releaseSchedule(projectId: string): Promise<ReleaseScheduleResult>;
  hookPatterns(projectId: string, scope?: SerialScope): Promise<HookPatternResult>;
  cycleStatus(projectId: string, scope?: SerialScope): Promise<CycleEnforcementResult>;
  mysteryBoard(projectId: string): Promise<Map<string, MysteryTrackingData>>;
}

export interface SerialScope {
  bookId?: string;
  arcId?: string;
}

export interface BufferDepletionInfo {
  currentBuffer: number;
  depletionDate: string | null;
  daysUntilDepletion: number | null;
}

export interface ReleaseScheduleResult {
  schedule: ScheduledRelease[];
  nextReleaseDate: string | null;
  releasesPerWeek: number;
  depletion: BufferDepletionInfo;
}

export function createSerialApi(client: SpineClient): SerialApi {
  return {
    async bufferStatus(projectId: string): Promise<BufferStatus> {
      return client.request<BufferStatus>('serial.bufferStatus', { projectId });
    },

    async releaseSchedule(projectId: string): Promise<ReleaseScheduleResult> {
      return client.request<ReleaseScheduleResult>('serial.releaseSchedule', { projectId });
    },

    async hookPatterns(projectId: string, scope?: SerialScope): Promise<HookPatternResult> {
      return client.request<HookPatternResult>('serial.hookPatterns', { projectId, scope });
    },

    async cycleStatus(projectId: string, scope?: SerialScope): Promise<CycleEnforcementResult> {
      return client.request<CycleEnforcementResult>('serial.cycleStatus', { projectId, scope });
    },

    async mysteryBoard(projectId: string): Promise<Map<string, MysteryTrackingData>> {
      const result = await client.request<Record<string, MysteryTrackingData>>(
        'serial.mysteryBoard',
        { projectId }
      );
      return new Map(Object.entries(result));
    }
  };
}
