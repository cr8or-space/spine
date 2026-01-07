/**
 * Diff marking between checkpoints.
 *
 * Provides diff generation and marking for showing code evolution
 * between checkpoints in a technical book. Designed for progressive-build
 * books where code grows chapter by chapter.
 */

import type { Snippet, TangledFile, Checkpoint, FilePart } from '@repo/techbook-types';

/**
 * Type of change for a line
 */
export type LineChangeType = 'added' | 'removed' | 'modified' | 'context';

/**
 * A line with change information
 */
export interface DiffLine {
  /** Line number in the old version (undefined if added) */
  oldLineNumber?: number;
  /** Line number in the new version (undefined if removed) */
  newLineNumber?: number;
  /** Type of change */
  changeType: LineChangeType;
  /** Line content */
  content: string;
}

/**
 * A hunk of changes (contiguous region)
 */
export interface DiffHunk {
  /** Starting line in old file */
  oldStart: number;
  /** Number of lines in old file */
  oldCount: number;
  /** Starting line in new file */
  newStart: number;
  /** Number of lines in new file */
  newCount: number;
  /** Lines in this hunk */
  lines: DiffLine[];
}

/**
 * Diff result for a single file.
 *
 * Note: Named WeaveDiff to avoid conflict with FileDiff in checkpoints/snapshots.
 */
export interface WeaveDiff {
  /** File path */
  path: string;
  /** Whether the file is new */
  isNew: boolean;
  /** Whether the file was deleted */
  isDeleted: boolean;
  /** Hunks of changes */
  hunks: DiffHunk[];
  /** Parts that were added */
  addedParts: string[];
  /** Parts that were removed */
  removedParts: string[];
  /** Parts that were modified */
  modifiedParts: string[];
  /** Source snippets for changes */
  snippetIds: string[];
}

/**
 * Complete diff between two checkpoint states
 */
export interface CheckpointDiff {
  /** Source checkpoint (earlier) */
  fromCheckpointId: string;
  /** Target checkpoint (later) */
  toCheckpointId: string;
  /** Diffs for each changed file */
  files: WeaveDiff[];
  /** Summary statistics */
  stats: DiffStats;
}

/**
 * Diff statistics
 */
export interface DiffStats {
  /** Number of files added */
  filesAdded: number;
  /** Number of files deleted */
  filesDeleted: number;
  /** Number of files modified */
  filesModified: number;
  /** Total lines added */
  linesAdded: number;
  /** Total lines removed */
  linesRemoved: number;
  /** Snippets that contributed to changes */
  snippetIds: string[];
}

/**
 * Options for diff generation
 */
export interface DiffOptions {
  /** Number of context lines around changes */
  contextLines?: number;
  /** Ignore whitespace-only changes */
  ignoreWhitespace?: boolean;
  /** Include unchanged files */
  includeUnchanged?: boolean;
}

/**
 * Split content into lines
 */
function splitLines(content: string): string[] {
  return content.split('\n');
}

/**
 * Compute Longest Common Subsequence (LCS) for diff
 */
function computeLCS(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Backtrack through LCS matrix to get diff operations
 */
function backtrackDiff(
  dp: number[][],
  oldLines: string[],
  newLines: string[],
  ignoreWhitespace: boolean
): DiffLine[] {
  const result: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  // Backtrack through the LCS matrix
  while (i > 0 || j > 0) {
    const oldLine = i > 0 ? oldLines[i - 1] : '';
    const newLine = j > 0 ? newLines[j - 1] : '';

    const areEqual = ignoreWhitespace
      ? oldLine.trim() === newLine.trim()
      : oldLine === newLine;

    if (i > 0 && j > 0 && areEqual) {
      result.unshift({
        oldLineNumber: i,
        newLineNumber: j,
        changeType: 'context',
        content: newLine,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        newLineNumber: j,
        changeType: 'added',
        content: newLine,
      });
      j--;
    } else if (i > 0) {
      result.unshift({
        oldLineNumber: i,
        changeType: 'removed',
        content: oldLine,
      });
      i--;
    }
  }

  return result;
}

/**
 * Group diff lines into hunks with context
 */
function groupIntoHunks(lines: DiffLine[], contextLines: number): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffLine[] = [];
  let contextBuffer: DiffLine[] = [];
  let inChange = false;

  for (const line of lines) {
    const isChange = line.changeType !== 'context';

    if (isChange) {
      if (!inChange) {
        // Starting a new change region
        // Add context lines before
        const contextToAdd = contextBuffer.slice(-contextLines);
        currentHunk.push(...contextToAdd);
        inChange = true;
      }
      currentHunk.push(line);
      contextBuffer = [];
    } else {
      contextBuffer.push(line);

      if (inChange) {
        // We're in a change region, add context after
        if (contextBuffer.length <= contextLines) {
          currentHunk.push(line);
        } else {
          // End this hunk
          if (currentHunk.length > 0) {
            hunks.push(createHunk(currentHunk));
          }
          currentHunk = [];
          inChange = false;
          contextBuffer = [line];
        }
      }
    }
  }

  // Final hunk
  if (currentHunk.length > 0) {
    hunks.push(createHunk(currentHunk));
  }

  return hunks;
}

/**
 * Create a hunk from lines
 */
function createHunk(lines: DiffLine[]): DiffHunk {
  const oldLines = lines.filter((l) => l.oldLineNumber !== undefined);
  const newLines = lines.filter((l) => l.newLineNumber !== undefined);

  const oldStart = oldLines.length > 0 ? Math.min(...oldLines.map((l) => l.oldLineNumber!)) : 0;
  const oldEnd = oldLines.length > 0 ? Math.max(...oldLines.map((l) => l.oldLineNumber!)) : 0;
  const newStart = newLines.length > 0 ? Math.min(...newLines.map((l) => l.newLineNumber!)) : 0;
  const newEnd = newLines.length > 0 ? Math.max(...newLines.map((l) => l.newLineNumber!)) : 0;

  return {
    oldStart,
    oldCount: oldEnd - oldStart + 1,
    newStart,
    newCount: newEnd - newStart + 1,
    lines,
  };
}

/**
 * Compute diff between two strings
 */
export function diffStrings(
  oldContent: string,
  newContent: string,
  options: DiffOptions = {}
): DiffLine[] {
  const { ignoreWhitespace = false } = options;

  const oldLines = splitLines(oldContent);
  const newLines = splitLines(newContent);

  const dp = computeLCS(oldLines, newLines);
  return backtrackDiff(dp, oldLines, newLines, ignoreWhitespace);
}

/**
 * Compute diff between two files
 */
export function diffFiles(
  oldFile: TangledFile | null,
  newFile: TangledFile | null,
  options: DiffOptions = {}
): WeaveDiff {
  const { contextLines = 3 } = options;

  // Handle new or deleted files
  if (!oldFile && newFile) {
    const lines = splitLines(newFile.content);
    return {
      path: newFile.path,
      isNew: true,
      isDeleted: false,
      hunks: [
        {
          oldStart: 0,
          oldCount: 0,
          newStart: 1,
          newCount: lines.length,
          lines: lines.map((content, idx) => ({
            newLineNumber: idx + 1,
            changeType: 'added' as LineChangeType,
            content,
          })),
        },
      ],
      addedParts: newFile.parts.map((p) => p.name),
      removedParts: [],
      modifiedParts: [],
      snippetIds: newFile.sourceSnippetIds,
    };
  }

  if (oldFile && !newFile) {
    const lines = splitLines(oldFile.content);
    return {
      path: oldFile.path,
      isNew: false,
      isDeleted: true,
      hunks: [
        {
          oldStart: 1,
          oldCount: lines.length,
          newStart: 0,
          newCount: 0,
          lines: lines.map((content, idx) => ({
            oldLineNumber: idx + 1,
            changeType: 'removed' as LineChangeType,
            content,
          })),
        },
      ],
      addedParts: [],
      removedParts: oldFile.parts.map((p) => p.name),
      modifiedParts: [],
      snippetIds: [],
    };
  }

  if (!oldFile || !newFile) {
    throw new Error('Both files are null');
  }

  // Compare parts
  const oldPartNames = new Set(oldFile.parts.map((p) => p.name));
  const newPartNames = new Set(newFile.parts.map((p) => p.name));

  const addedParts = newFile.parts.filter((p) => !oldPartNames.has(p.name)).map((p) => p.name);
  const removedParts = oldFile.parts.filter((p) => !newPartNames.has(p.name)).map((p) => p.name);

  // Check which parts were modified (exist in both but with different line ranges)
  const modifiedParts: string[] = [];
  for (const newPart of newFile.parts) {
    if (oldPartNames.has(newPart.name)) {
      const oldPart = oldFile.parts.find((p) => p.name === newPart.name);
      if (oldPart) {
        const oldLines = getPartLines(oldFile.content, oldPart);
        const newLines = getPartLines(newFile.content, newPart);
        if (oldLines !== newLines) {
          modifiedParts.push(newPart.name);
        }
      }
    }
  }

  // Compute line diff
  const diffLines = diffStrings(oldFile.content, newFile.content, options);
  const hunks = groupIntoHunks(diffLines, contextLines);

  // Collect snippet IDs that are new in this version
  const oldSnippetSet = new Set(oldFile.sourceSnippetIds);
  const newSnippetIds = newFile.sourceSnippetIds.filter((id) => !oldSnippetSet.has(id));

  return {
    path: newFile.path,
    isNew: false,
    isDeleted: false,
    hunks,
    addedParts,
    removedParts,
    modifiedParts,
    snippetIds: newSnippetIds,
  };
}

/**
 * Get the lines for a specific part
 */
function getPartLines(content: string, part: FilePart): string {
  if (part.startLine === undefined || part.endLine === undefined) {
    return '';
  }

  const lines = splitLines(content);
  return lines.slice(part.startLine - 1, part.endLine).join('\n');
}

/**
 * Compute diff between two checkpoint states
 */
export function diffCheckpoints(
  fromFiles: TangledFile[],
  toFiles: TangledFile[],
  fromCheckpointId: string,
  toCheckpointId: string,
  options: DiffOptions = {}
): CheckpointDiff {
  const { includeUnchanged = false } = options;

  const fromFileMap = new Map(fromFiles.map((f) => [f.path, f]));
  const toFileMap = new Map(toFiles.map((f) => [f.path, f]));

  const allPaths = new Set([...fromFileMap.keys(), ...toFileMap.keys()]);

  const files: WeaveDiff[] = [];
  let linesAdded = 0;
  let linesRemoved = 0;
  const allSnippetIds = new Set<string>();

  for (const path of allPaths) {
    const fromFile = fromFileMap.get(path) ?? null;
    const toFile = toFileMap.get(path) ?? null;

    // Skip unchanged files unless requested
    // Only skip if both files have contentHash defined and they match
    if (!includeUnchanged && fromFile && toFile) {
      if (fromFile.contentHash && toFile.contentHash && fromFile.contentHash === toFile.contentHash) {
        continue;
      }
      // Also skip if content is identical
      if (!fromFile.contentHash && !toFile.contentHash && fromFile.content === toFile.content) {
        continue;
      }
    }

    const fileDiff = diffFiles(fromFile, toFile, options);

    // Count changes
    for (const hunk of fileDiff.hunks) {
      for (const line of hunk.lines) {
        if (line.changeType === 'added') linesAdded++;
        if (line.changeType === 'removed') linesRemoved++;
      }
    }

    // Collect snippet IDs
    for (const id of fileDiff.snippetIds) {
      allSnippetIds.add(id);
    }

    // Only include if there are changes or it's new/deleted
    if (fileDiff.hunks.length > 0 || fileDiff.isNew || fileDiff.isDeleted) {
      files.push(fileDiff);
    }
  }

  // Sort files by path
  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    fromCheckpointId,
    toCheckpointId,
    files,
    stats: {
      filesAdded: files.filter((f) => f.isNew).length,
      filesDeleted: files.filter((f) => f.isDeleted).length,
      filesModified: files.filter((f) => !f.isNew && !f.isDeleted && f.hunks.length > 0).length,
      linesAdded,
      linesRemoved,
      snippetIds: Array.from(allSnippetIds),
    },
  };
}

/**
 * Options for formatting diffs
 */
export interface DiffFormatOptions {
  /** Show line numbers */
  lineNumbers?: boolean;
  /** Use color */
  color?: boolean;
  /** Show file headers */
  fileHeaders?: boolean;
  /** Show hunk headers */
  hunkHeaders?: boolean;
}

/**
 * Format a diff as unified diff text
 */
export function formatUnifiedDiff(diff: WeaveDiff, options: DiffFormatOptions = {}): string {
  const { lineNumbers = true, fileHeaders = true, hunkHeaders = true } = options;

  const lines: string[] = [];

  if (fileHeaders) {
    if (diff.isNew) {
      lines.push(`--- /dev/null`);
      lines.push(`+++ ${diff.path}`);
    } else if (diff.isDeleted) {
      lines.push(`--- ${diff.path}`);
      lines.push(`+++ /dev/null`);
    } else {
      lines.push(`--- ${diff.path}`);
      lines.push(`+++ ${diff.path}`);
    }
  }

  for (const hunk of diff.hunks) {
    if (hunkHeaders) {
      lines.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
    }

    for (const line of hunk.lines) {
      let prefix = ' ';
      if (line.changeType === 'added') prefix = '+';
      if (line.changeType === 'removed') prefix = '-';

      if (lineNumbers) {
        const oldNum = line.oldLineNumber?.toString().padStart(4) ?? '    ';
        const newNum = line.newLineNumber?.toString().padStart(4) ?? '    ';
        lines.push(`${oldNum} ${newNum} ${prefix}${line.content}`);
      } else {
        lines.push(`${prefix}${line.content}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format a diff as HTML
 */
export function formatDiffHtml(
  diff: WeaveDiff,
  options: DiffFormatOptions & { classPrefix?: string } = {}
): string {
  const { lineNumbers = true, classPrefix = 'diff-' } = options;

  const escapeHtml = (text: string): string =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const lines: string[] = [];

  lines.push(`<div class="${classPrefix}file">`);
  lines.push(`<div class="${classPrefix}header">${escapeHtml(diff.path)}</div>`);

  for (const hunk of diff.hunks) {
    lines.push(`<div class="${classPrefix}hunk">`);

    for (const line of hunk.lines) {
      const changeClass = `${classPrefix}${line.changeType}`;
      const oldNum = lineNumbers
        ? `<span class="${classPrefix}line-old">${line.oldLineNumber ?? ''}</span>`
        : '';
      const newNum = lineNumbers
        ? `<span class="${classPrefix}line-new">${line.newLineNumber ?? ''}</span>`
        : '';

      lines.push(
        `<div class="${changeClass}">${oldNum}${newNum}<span class="${classPrefix}content">${escapeHtml(line.content)}</span></div>`
      );
    }

    lines.push(`</div>`);
  }

  lines.push(`</div>`);

  return lines.join('\n');
}

/**
 * ANSI colors for terminal diff output
 */
const ANSI_RED = '\x1b[31m';
const ANSI_GREEN = '\x1b[32m';
const ANSI_CYAN = '\x1b[36m';
const ANSI_RESET = '\x1b[0m';

/**
 * Format a diff for terminal output with colors
 */
export function formatDiffAnsi(diff: WeaveDiff, options: DiffFormatOptions = {}): string {
  const { lineNumbers = true, fileHeaders = true, hunkHeaders = true, color = true } = options;

  const lines: string[] = [];

  const red = color ? ANSI_RED : '';
  const green = color ? ANSI_GREEN : '';
  const cyan = color ? ANSI_CYAN : '';
  const reset = color ? ANSI_RESET : '';

  if (fileHeaders) {
    lines.push(`${cyan}--- ${diff.isNew ? '/dev/null' : diff.path}${reset}`);
    lines.push(`${cyan}+++ ${diff.isDeleted ? '/dev/null' : diff.path}${reset}`);
  }

  for (const hunk of diff.hunks) {
    if (hunkHeaders) {
      lines.push(
        `${cyan}@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@${reset}`
      );
    }

    for (const line of hunk.lines) {
      let prefix = ' ';
      let lineColor = '';

      if (line.changeType === 'added') {
        prefix = '+';
        lineColor = green;
      }
      if (line.changeType === 'removed') {
        prefix = '-';
        lineColor = red;
      }

      if (lineNumbers) {
        const oldNum = (line.oldLineNumber?.toString() ?? '').padStart(4);
        const newNum = (line.newLineNumber?.toString() ?? '').padStart(4);
        lines.push(`${oldNum} ${newNum} ${lineColor}${prefix}${line.content}${reset}`);
      } else {
        lines.push(`${lineColor}${prefix}${line.content}${reset}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Get snippets that contributed to changes between checkpoints
 */
export function getChangedSnippets(
  snippets: Snippet[],
  fromCheckpoint: Checkpoint,
  toCheckpoint: Checkpoint,
  chapterOrder: string[]
): Snippet[] {
  const chapterIndex = new Map<string, number>();
  chapterOrder.forEach((id, idx) => chapterIndex.set(id, idx));

  const fromChapterIdx = chapterIndex.get(fromCheckpoint.chapterId) ?? -1;
  const toChapterIdx = chapterIndex.get(toCheckpoint.chapterId) ?? -1;

  // Get snippets between the two checkpoints (exclusive from, inclusive to)
  return snippets.filter((snippet) => {
    const snippetChapterIdx = chapterIndex.get(snippet.chapterId);
    if (snippetChapterIdx === undefined) return false;
    return snippetChapterIdx > fromChapterIdx && snippetChapterIdx <= toChapterIdx;
  });
}

/**
 * Mark lines in a file as new, modified, or context based on checkpoint diff
 */
export interface MarkedLine {
  /** Line number (1-based) */
  lineNumber: number;
  /** Line content */
  content: string;
  /** Line status */
  status: 'new' | 'modified' | 'context';
  /** Snippet ID that introduced this line (if new/modified) */
  snippetId?: string;
}

/**
 * Mark lines in a tangled file based on what's new since a previous checkpoint
 */
export function markLines(
  currentFile: TangledFile,
  previousFile: TangledFile | null,
  options: DiffOptions = {}
): MarkedLine[] {
  const lines = splitLines(currentFile.content);

  if (!previousFile) {
    // All lines are new
    return lines.map((content, idx) => ({
      lineNumber: idx + 1,
      content,
      status: 'new' as const,
    }));
  }

  // Get the diff
  const diffLines = diffStrings(previousFile.content, currentFile.content, options);

  // Map new line numbers to their status
  const lineStatusMap = new Map<number, 'new' | 'modified' | 'context'>();

  for (const diffLine of diffLines) {
    if (diffLine.newLineNumber !== undefined) {
      if (diffLine.changeType === 'added') {
        lineStatusMap.set(diffLine.newLineNumber, 'new');
      } else if (diffLine.changeType === 'modified') {
        lineStatusMap.set(diffLine.newLineNumber, 'modified');
      } else {
        lineStatusMap.set(diffLine.newLineNumber, 'context');
      }
    }
  }

  return lines.map((content, idx) => ({
    lineNumber: idx + 1,
    content,
    status: lineStatusMap.get(idx + 1) ?? 'context',
  }));
}

/**
 * Summary of changes for display
 */
export interface DiffSummary {
  /** Total files changed */
  totalFiles: number;
  /** Files added */
  filesAdded: number;
  /** Files deleted */
  filesDeleted: number;
  /** Files modified */
  filesModified: number;
  /** Lines added */
  linesAdded: number;
  /** Lines removed */
  linesRemoved: number;
  /** Net line change */
  netChange: number;
}

/**
 * Get a summary of diff statistics
 */
export function getDiffSummary(diff: CheckpointDiff): DiffSummary {
  return {
    totalFiles: diff.files.length,
    filesAdded: diff.stats.filesAdded,
    filesDeleted: diff.stats.filesDeleted,
    filesModified: diff.stats.filesModified,
    linesAdded: diff.stats.linesAdded,
    linesRemoved: diff.stats.linesRemoved,
    netChange: diff.stats.linesAdded - diff.stats.linesRemoved,
  };
}
