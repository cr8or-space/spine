/**
 * Version service implementation
 *
 * Provides diff generation, version comparison, and history tracking.
 */

import type {
  Content,
  ContentDiff,
  ContentVersion,
  DiffHunk,
  VersionComparison,
  VersionSource,
  WordDiff,
} from '@repo/types';

import type {
  VersionHistory,
  VersionHistoryEntry,
  VersionService,
  VersionServiceConfig,
} from './types';
import { DEFAULT_VERSION_CONFIG } from './types';

/**
 * Simple LCS-based diff algorithm for line-level diffs
 */
function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Backtrack to find the actual diff operations
 */
interface DiffOp {
  type: 'equal' | 'insert' | 'delete';
  fromIndex?: number;
  toIndex?: number;
  line: string;
}

function backtrackDiff(a: string[], b: string[], dp: number[][]): DiffOp[] {
  const ops: DiffOp[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal', fromIndex: i - 1, toIndex: j - 1, line: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'insert', toIndex: j - 1, line: b[j - 1] });
      j--;
    } else if (i > 0) {
      ops.unshift({ type: 'delete', fromIndex: i - 1, line: a[i - 1] });
      i--;
    }
  }

  return ops;
}

/**
 * Group diff operations into hunks with context
 */
function groupIntoHunks(ops: DiffOp[], contextLines: number): DiffHunk[] {
  if (ops.length === 0) return [];

  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let lastChangeIndex = -1;

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const isChange = op.type !== 'equal';

    if (isChange) {
      if (currentHunk === null || i - lastChangeIndex > contextLines * 2) {
        // Start a new hunk
        if (currentHunk !== null) {
          hunks.push(currentHunk);
        }

        // Add leading context
        const contextStart = Math.max(0, i - contextLines);
        const contextOps = ops.slice(contextStart, i).filter((o) => o.type === 'equal');

        currentHunk = {
          type: 'context',
          lines: [],
          fromLine: contextOps[0]?.fromIndex ?? op.fromIndex ?? 0,
          toLine: contextOps[0]?.toIndex ?? op.toIndex ?? 0,
          fromCount: 0,
          toCount: 0,
        };

        // Add context lines
        for (const contextOp of contextOps) {
          currentHunk.lines.push(contextOp.line);
          currentHunk.fromCount = (currentHunk.fromCount ?? 0) + 1;
          currentHunk.toCount = (currentHunk.toCount ?? 0) + 1;
        }
      }

      // Add the change to current hunk
      if (currentHunk) {
        if (op.type === 'delete') {
          // For deletions, we need to track them separately
          currentHunk.lines.push(`-${op.line}`);
          currentHunk.fromCount = (currentHunk.fromCount ?? 0) + 1;
        } else if (op.type === 'insert') {
          currentHunk.lines.push(`+${op.line}`);
          currentHunk.toCount = (currentHunk.toCount ?? 0) + 1;
        }
      }

      lastChangeIndex = i;
    } else if (currentHunk !== null && i - lastChangeIndex <= contextLines) {
      // Add trailing context
      currentHunk.lines.push(op.line);
      currentHunk.fromCount = (currentHunk.fromCount ?? 0) + 1;
      currentHunk.toCount = (currentHunk.toCount ?? 0) + 1;
    }
  }

  if (currentHunk !== null) {
    hunks.push(currentHunk);
  }

  // Convert to proper hunk format
  return hunks.map((hunk) => {
    const lines: string[] = [];
    let type: DiffHunk['type'] = 'context';

    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        lines.push(line.slice(1));
        type = 'remove';
      } else if (line.startsWith('+')) {
        lines.push(line.slice(1));
        type = type === 'remove' ? 'context' : 'add'; // Mixed hunks become context
      } else {
        lines.push(line);
      }
    }

    // Determine the primary type of the hunk
    const adds = hunk.lines.filter((l) => l.startsWith('+')).length;
    const removes = hunk.lines.filter((l) => l.startsWith('-')).length;
    if (adds > 0 && removes === 0) type = 'add';
    else if (removes > 0 && adds === 0) type = 'remove';
    else type = 'context';

    return {
      type,
      lines: hunk.lines.map((l) => (l.startsWith('+') || l.startsWith('-') ? l.slice(1) : l)),
      fromLine: hunk.fromLine,
      toLine: hunk.toLine,
      fromCount: hunk.fromCount,
      toCount: hunk.toCount,
    };
  });
}

/**
 * Split text into lines
 */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/**
 * Split text into words for word-level diff
 */
function splitWords(text: string): string[] {
  // Split on whitespace but keep the whitespace as separate tokens
  return text.split(/(\s+)/).filter(Boolean);
}

/**
 * Calculate statistics from diff operations
 */
function calculateStats(
  ops: DiffOp[]
): { additions: number; deletions: number; unchanged: number; changePercent: number } {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const op of ops) {
    if (op.type === 'insert') additions++;
    else if (op.type === 'delete') deletions++;
    else unchanged++;
  }

  const total = additions + deletions + unchanged;
  const changePercent = total > 0 ? ((additions + deletions) / total) * 100 : 0;

  return { additions, deletions, unchanged, changePercent };
}

/**
 * Get version by number from content
 */
function getVersion(content: Content, version: number): ContentVersion | undefined {
  return content.versions.find((v) => v.version === version);
}

/**
 * Create the version service
 */
export function createVersionService(config?: VersionServiceConfig): VersionService {
  const mergedConfig: Required<VersionServiceConfig> = {
    ...DEFAULT_VERSION_CONFIG,
    ...config,
  };

  function computeDiffHunks(
    fromText: string,
    toText: string,
    contextLines?: number
  ): DiffHunk[] {
    const fromLines = splitLines(fromText);
    const toLines = splitLines(toText);
    const dp = computeLCS(fromLines, toLines);
    const ops = backtrackDiff(fromLines, toLines, dp);
    return groupIntoHunks(ops, contextLines ?? mergedConfig.contextLines);
  }

  function computeWordDiffs(fromText: string, toText: string): WordDiff[] {
    const fromWords = splitWords(fromText);
    const toWords = splitWords(toText);
    const dp = computeLCS(fromWords, toWords);
    const ops = backtrackDiff(fromWords, toWords, dp);

    return ops.map((op) => ({
      type: op.type === 'equal' ? 'unchanged' : op.type === 'insert' ? 'add' : 'remove',
      text: op.line,
    }));
  }

  function getDiff(
    content: Content,
    fromVersion: number,
    toVersion: number
  ): ContentDiff | undefined {
    const fromVer = getVersion(content, fromVersion);
    const toVer = getVersion(content, toVersion);

    if (!fromVer || !toVer) return undefined;

    const hunks = computeDiffHunks(fromVer.text, toVer.text);

    // Calculate stats from the raw diff operations
    const fromLines = splitLines(fromVer.text);
    const toLines = splitLines(toVer.text);
    const dp = computeLCS(fromLines, toLines);
    const ops = backtrackDiff(fromLines, toLines, dp);
    const stats = calculateStats(ops);

    // Calculate time delta
    const fromTime = new Date(fromVer.createdAt).getTime();
    const toTime = new Date(toVer.createdAt).getTime();

    return {
      contentId: content.id,
      fromVersion,
      toVersion,
      hunks,
      stats,
      timeDelta: {
        fromTimestamp: fromVer.createdAt,
        toTimestamp: toVer.createdAt,
        durationMs: toTime - fromTime,
      },
      sources: {
        from: fromVer.source,
        to: toVer.source,
      },
    };
  }

  function getComparison(
    content: Content,
    fromVersion: number,
    toVersion: number,
    includeWordDiffs?: boolean
  ): VersionComparison | undefined {
    const diff = getDiff(content, fromVersion, toVersion);
    if (!diff) return undefined;

    const fromVer = getVersion(content, fromVersion);
    const toVer = getVersion(content, toVersion);

    if (!fromVer || !toVer) return undefined;

    // Compute word diffs if requested
    let wordDiffs: VersionComparison['wordDiffs'];
    if (includeWordDiffs ?? mergedConfig.includeWordDiffs) {
      const fromParagraphs = fromVer.text.split(/\n\n+/);
      const toParagraphs = toVer.text.split(/\n\n+/);

      // Simple paragraph alignment - could be improved
      const maxParagraphs = Math.max(fromParagraphs.length, toParagraphs.length);
      wordDiffs = [];

      for (let i = 0; i < maxParagraphs; i++) {
        const fromPara = fromParagraphs[i] ?? '';
        const toPara = toParagraphs[i] ?? '';

        if (fromPara !== toPara) {
          wordDiffs.push({
            paragraphIndex: i,
            words: computeWordDiffs(fromPara, toPara),
          });
        }
      }
    }

    // Generate summary
    const { additions, deletions, changePercent } = diff.stats;
    const isMajor = changePercent > 30 || additions + deletions > 50;

    // Estimate review time (roughly 100 changes per minute)
    const estimatedReviewTime = Math.ceil((additions + deletions) / 100) * 60;

    let description: string;
    if (additions > 0 && deletions === 0) {
      description = `Added ${additions} line${additions === 1 ? '' : 's'}`;
    } else if (deletions > 0 && additions === 0) {
      description = `Removed ${deletions} line${deletions === 1 ? '' : 's'}`;
    } else if (additions > 0 && deletions > 0) {
      description = `Changed ${additions + deletions} line${additions + deletions === 1 ? '' : 's'} (${additions} added, ${deletions} removed)`;
    } else {
      description = 'No changes';
    }

    return {
      diff,
      wordDiffs,
      summary: {
        description,
        isMajor,
        estimatedReviewTime,
      },
    };
  }

  function getHistory(content: Content, limit?: number): VersionHistory {
    // Sort versions by version number descending
    const sortedVersions = [...content.versions].sort((a, b) => b.version - a.version);
    const limitedVersions = limit ? sortedVersions.slice(0, limit) : sortedVersions;

    // Build entries with computed info
    const entries: VersionHistoryEntry[] = limitedVersions.map((version, index) => {
      const prevVersion = sortedVersions[index + 1];
      const wordCountDelta = prevVersion
        ? version.wordCount - prevVersion.wordCount
        : version.wordCount;

      let timeSincePrevious: number | undefined;
      if (prevVersion) {
        const currentTime = new Date(version.createdAt).getTime();
        const prevTime = new Date(prevVersion.createdAt).getTime();
        timeSincePrevious = currentTime - prevTime;
      }

      return {
        version,
        wordCountDelta,
        isCurrent: version.version === content.currentVersion,
        timeSincePrevious,
      };
    });

    // Calculate statistics
    const allVersions = content.versions;
    const netWordCountChange =
      allVersions.length > 0
        ? allVersions[allVersions.length - 1].wordCount - allVersions[0].wordCount
        : 0;

    // Calculate average time between versions
    let totalTime = 0;
    let timeCount = 0;
    for (let i = 1; i < allVersions.length; i++) {
      const currentTime = new Date(allVersions[i].createdAt).getTime();
      const prevTime = new Date(allVersions[i - 1].createdAt).getTime();
      totalTime += currentTime - prevTime;
      timeCount++;
    }
    const avgTimeBetweenVersions = timeCount > 0 ? totalTime / timeCount : 0;

    // Find most common source
    const sourceCounts = new Map<VersionSource, number>();
    for (const v of allVersions) {
      sourceCounts.set(v.source, (sourceCounts.get(v.source) ?? 0) + 1);
    }
    let mostCommonSource: VersionSource = 'edited';
    let maxCount = 0;
    for (const [source, count] of sourceCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonSource = source;
      }
    }

    // Get date range
    const sortedByDate = [...allVersions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstVersionDate = sortedByDate[0]?.createdAt ?? new Date().toISOString();
    const lastVersionDate =
      sortedByDate[sortedByDate.length - 1]?.createdAt ?? new Date().toISOString();

    return {
      contentId: content.id,
      currentVersion: content.currentVersion,
      totalVersions: allVersions.length,
      entries,
      stats: {
        netWordCountChange,
        avgTimeBetweenVersions,
        mostCommonSource,
        firstVersionDate,
        lastVersionDate,
      },
    };
  }

  function canRollback(
    content: Content,
    targetVersion: number
  ): { canRollback: boolean; reason?: string } {
    // Can't rollback published content
    if (content.status === 'published') {
      return { canRollback: false, reason: 'Cannot rollback published content' };
    }

    // Can't rollback locked content
    if (content.locked) {
      return { canRollback: false, reason: `Content is locked: ${content.lockReason ?? 'No reason given'}` };
    }

    // Check if target version exists
    const targetVer = getVersion(content, targetVersion);
    if (!targetVer) {
      return { canRollback: false, reason: `Version ${targetVersion} does not exist` };
    }

    // Can't rollback to current version
    if (targetVersion === content.currentVersion) {
      return { canRollback: false, reason: 'Already at this version' };
    }

    return { canRollback: true };
  }

  function getChangeSummary(
    content: Content,
    fromVersion: number,
    toVersion: number
  ): string | undefined {
    const comparison = getComparison(content, fromVersion, toVersion);
    if (!comparison) return undefined;

    const fromVer = getVersion(content, fromVersion);
    const toVer = getVersion(content, toVersion);

    if (!fromVer || !toVer) return undefined;

    const parts: string[] = [];

    // Add source info
    parts.push(`From ${fromVer.source} (v${fromVersion}) to ${toVer.source} (v${toVersion})`);

    // Add change description
    if (comparison.summary) {
      parts.push(comparison.summary.description);
    }

    // Add word count change
    const wordDelta = toVer.wordCount - fromVer.wordCount;
    if (wordDelta !== 0) {
      parts.push(`Word count: ${wordDelta > 0 ? '+' : ''}${wordDelta} (${toVer.wordCount} total)`);
    }

    // Add time info
    if (comparison.diff.timeDelta) {
      const hours = Math.floor(comparison.diff.timeDelta.durationMs / (1000 * 60 * 60));
      const minutes = Math.floor(
        (comparison.diff.timeDelta.durationMs % (1000 * 60 * 60)) / (1000 * 60)
      );

      if (hours > 0) {
        parts.push(`Time between versions: ${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        parts.push(`Time between versions: ${minutes}m`);
      }
    }

    return parts.join('\n');
  }

  return {
    getDiff,
    getComparison,
    getHistory,
    canRollback,
    getChangeSummary,
    computeDiffHunks,
    computeWordDiffs,
  };
}
