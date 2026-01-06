import { z } from 'zod';

import { IdSchema, TimestampSchema } from '@repo/framework-types';

/**
 * Release schedule configuration
 *
 * Defines when releases started and how frequently they occur.
 */
export const ReleaseScheduleConfigSchema = z.object({
  /** Start date of the release schedule (ISO 8601 date string) */
  startDate: z.string().datetime({ offset: true }),
  /** Days between releases (from SerialSettings.releaseInterval) */
  releaseIntervalDays: z.number().int().positive(),
  /** Whether to skip weekends for release dates */
  skipWeekends: z.boolean().default(false),
  /** Specific dates to skip (holidays, etc.) */
  skipDates: z.array(z.string().datetime({ offset: true })).default([]),
});
export type ReleaseScheduleConfig = z.infer<typeof ReleaseScheduleConfigSchema>;

/**
 * A scheduled release with its associated chapter
 */
export const ScheduledReleaseSchema = z.object({
  /** Scheduled release date (ISO 8601) */
  date: z.string().datetime({ offset: true }),
  /** Structure ID of the chapter to release */
  structureId: IdSchema.optional(),
  /** Title of the chapter (if assigned) */
  title: z.string().optional(),
  /** Whether this release has a chapter assigned */
  hasChapter: z.boolean(),
  /** Whether this chapter has been published */
  isPublished: z.boolean(),
  /** Release number (1-indexed) */
  releaseNumber: z.number().int().positive(),
});
export type ScheduledRelease = z.infer<typeof ScheduledReleaseSchema>;

/**
 * Buffer status - current state of the release buffer
 */
export const BufferStatusSchema = z.object({
  /** Number of chapters in 'approved' status */
  approvedCount: z.number().int().min(0),
  /** Number of chapters already scheduled for release */
  scheduledCount: z.number().int().min(0),
  /** Number of chapters in 'published' status */
  publishedCount: z.number().int().min(0),
  /** Current buffer size (approved chapters available for scheduling) */
  bufferSize: z.number().int().min(0),
  /** Minimum buffer from settings */
  minimumBuffer: z.number().int().min(0),
  /** Whether buffer is at or above minimum */
  isHealthy: z.boolean(),
  /** How many chapters below minimum (0 if healthy) */
  deficit: z.number().int().min(0),
  /** Warnings about buffer status */
  warnings: z.array(z.string()),
});
export type BufferStatus = z.infer<typeof BufferStatusSchema>;

/**
 * A projected future release
 */
export const ReleaseProjectionSchema = z.object({
  /** Projected release date (ISO 8601) */
  date: z.string().datetime({ offset: true }),
  /** Structure ID if a chapter is available */
  structureId: IdSchema.optional(),
  /** Title if a chapter is available */
  title: z.string().optional(),
  /** Buffer size after this release */
  bufferAfter: z.number().int().min(0),
  /** Whether this release would deplete the buffer */
  depletesBuffer: z.boolean(),
  /** Days from now */
  daysFromNow: z.number().int().min(0),
});
export type ReleaseProjection = z.infer<typeof ReleaseProjectionSchema>;

/**
 * Buffer depletion projection - when will buffer run out
 */
export const BufferDepletionSchema = z.object({
  /** Current buffer size */
  currentBuffer: z.number().int().min(0),
  /** Date when buffer hits zero (if projected to deplete) */
  depletionDate: z.string().datetime({ offset: true }).optional(),
  /** Days until depletion (if projected to deplete) */
  daysUntilDepletion: z.number().int().min(0).optional(),
  /** Number of releases until depletion */
  releasesUntilDepletion: z.number().int().min(0).optional(),
  /** Whether buffer is projected to deplete within projection window */
  willDeplete: z.boolean(),
  /** Projected releases showing buffer decline */
  projectedReleases: z.array(ReleaseProjectionSchema),
});
export type BufferDepletion = z.infer<typeof BufferDepletionSchema>;

/**
 * Urgency level for deadlines
 */
export const DeadlineUrgencySchema = z.enum(['safe', 'warning', 'critical']);
export type DeadlineUrgency = z.infer<typeof DeadlineUrgencySchema>;

/**
 * Deadline tracking status
 */
export const DeadlineStatusSchema = z.object({
  /** Next release deadline date (ISO 8601) */
  nextDeadline: z.string().datetime({ offset: true }).optional(),
  /** Days until next deadline */
  daysUntilDeadline: z.number().int().optional(),
  /** Urgency level based on buffer and upcoming releases */
  urgency: DeadlineUrgencySchema,
  /** Chapters needed per week to maintain minimum buffer */
  requiredChaptersPerWeek: z.number().min(0),
  /** Whether there's a chapter ready for the next release */
  nextReleaseReady: z.boolean(),
  /** Description of the deadline status */
  statusDescription: z.string(),
});
export type DeadlineStatus = z.infer<typeof DeadlineStatusSchema>;

/**
 * Chapter release data point - chapter with its release information
 */
export const ChapterReleaseDataPointSchema = z.object({
  /** Structure ID */
  structureId: IdSchema,
  /** Chapter title */
  title: z.string(),
  /** Chapter number (1-indexed) */
  chapterNumber: z.number().int().positive(),
  /** Content status (draft, review, approved, published) */
  status: z.enum(['draft', 'review', 'approved', 'published']),
  /** Scheduled release date if assigned */
  scheduledDate: z.string().datetime({ offset: true }).optional(),
  /** Published date if published */
  publishedDate: z.string().datetime({ offset: true }).optional(),
  /** Whether this chapter is ready for release */
  isReleasable: z.boolean(),
});
export type ChapterReleaseDataPoint = z.infer<typeof ChapterReleaseDataPointSchema>;

/**
 * Complete release planning analysis result
 */
export const ReleasePlanningResultSchema = z.object({
  /** All chapters with their release status */
  chapters: z.array(ChapterReleaseDataPointSchema),
  /** Current buffer status */
  bufferStatus: BufferStatusSchema,
  /** Buffer depletion projection */
  depletion: BufferDepletionSchema,
  /** Deadline tracking */
  deadlineStatus: DeadlineStatusSchema,
  /** Upcoming scheduled releases */
  upcomingReleases: z.array(ScheduledReleaseSchema),
  /** Statistics about the release schedule */
  stats: z.object({
    /** Total chapters in the project */
    totalChapters: z.number().int().min(0),
    /** Chapters per status */
    byStatus: z.object({
      draft: z.number().int().min(0),
      review: z.number().int().min(0),
      approved: z.number().int().min(0),
      published: z.number().int().min(0),
    }),
    /** Average days between releases (based on published) */
    averageReleaseDays: z.number().min(0).optional(),
    /** Releases per week at current pace */
    releasesPerWeek: z.number().min(0),
    /** Days of buffer at current release rate */
    bufferDays: z.number().int().min(0),
  }),
  /** Warnings about the release schedule */
  warnings: z.array(z.string()),
  /** Analysis timestamp */
  analyzedAt: TimestampSchema,
});
export type ReleasePlanningResult = z.infer<typeof ReleasePlanningResultSchema>;

/**
 * Configuration for release planning analysis
 */
export const ReleasePlanningConfigSchema = z.object({
  /** Number of days to project into the future (default: 90) */
  projectionDays: z.number().int().positive().default(90),
  /** Days before deadline to show warning (default: 7) */
  warningThresholdDays: z.number().int().min(0).default(7),
  /** Days before deadline to show critical (default: 3) */
  criticalThresholdDays: z.number().int().min(0).default(3),
  /** Reference date for calculations (default: now) */
  referenceDate: z.string().datetime({ offset: true }).optional(),
});
export type ReleasePlanningConfig = z.infer<typeof ReleasePlanningConfigSchema>;
