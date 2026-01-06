/**
 * Types for version management
 */

import type {
  Content,
  ContentDiff,
  ContentVersion,
  DiffHunk,
  VersionComparison,
  VersionMetadata,
  VersionSource,
  WordDiff,
} from '@repo/serial-types';

/**
 * Configuration for version service
 */
export interface VersionServiceConfig {
  /** Number of context lines to include in diffs (default: 3) */
  contextLines?: number;
  /** Maximum number of versions to keep (default: unlimited) */
  maxVersions?: number;
  /** Whether to compute word-level diffs (default: false, can be expensive) */
  includeWordDiffs?: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_VERSION_CONFIG: Required<VersionServiceConfig> = {
  contextLines: 3,
  maxVersions: 0, // 0 = unlimited
  includeWordDiffs: false,
};

/**
 * Input for creating a new version
 */
export interface CreateVersionInput {
  /** The new text content */
  text: string;
  /** How this version was created */
  source: VersionSource;
  /** Optional metadata */
  metadata?: VersionMetadata;
}

/**
 * Version history entry with additional computed info
 */
export interface VersionHistoryEntry {
  /** The version data */
  version: ContentVersion;
  /** Word count change from previous version */
  wordCountDelta: number;
  /** Whether this is the current version */
  isCurrent: boolean;
  /** Time since previous version in milliseconds */
  timeSincePrevious?: number;
}

/**
 * Version history for a content item
 */
export interface VersionHistory {
  /** Content ID */
  contentId: string;
  /** Current version number */
  currentVersion: number;
  /** Total number of versions */
  totalVersions: number;
  /** Version entries (most recent first) */
  entries: VersionHistoryEntry[];
  /** Statistics */
  stats: {
    /** Total word count changes (net) */
    netWordCountChange: number;
    /** Average time between versions in milliseconds */
    avgTimeBetweenVersions: number;
    /** Most common source type */
    mostCommonSource: VersionSource;
    /** First version date */
    firstVersionDate: string;
    /** Last version date */
    lastVersionDate: string;
  };
}

/**
 * Version service interface
 */
export interface VersionService {
  /**
   * Get diff between two versions
   */
  getDiff(
    content: Content,
    fromVersion: number,
    toVersion: number
  ): ContentDiff | undefined;

  /**
   * Get detailed comparison including word-level diffs
   */
  getComparison(
    content: Content,
    fromVersion: number,
    toVersion: number,
    includeWordDiffs?: boolean
  ): VersionComparison | undefined;

  /**
   * Get version history with computed metadata
   */
  getHistory(content: Content, limit?: number): VersionHistory;

  /**
   * Check if rolling back to a version is safe
   */
  canRollback(content: Content, targetVersion: number): {
    canRollback: boolean;
    reason?: string;
  };

  /**
   * Get a summary of changes between versions
   */
  getChangeSummary(
    content: Content,
    fromVersion: number,
    toVersion: number
  ): string | undefined;

  /**
   * Calculate line-level diff hunks between two texts
   */
  computeDiffHunks(
    fromText: string,
    toText: string,
    contextLines?: number
  ): DiffHunk[];

  /**
   * Calculate word-level diffs for a paragraph
   */
  computeWordDiffs(fromText: string, toText: string): WordDiff[];
}

export type { Content, ContentDiff, ContentVersion, DiffHunk, VersionComparison, WordDiff };
