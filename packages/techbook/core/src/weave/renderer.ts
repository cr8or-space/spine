/**
 * Content rendering pipeline for technical books.
 *
 * Orchestrates the rendering of a technical book from source materials
 * to output formats. Coordinates syntax highlighting, diff marking,
 * and cross-reference generation.
 */

import type {
  Concept,
  Snippet,
  Checkpoint,
  TangledFile,
  SymbolLink,
} from '@repo/techbook-types';

import {
  highlight,
  toHtml as syntaxToHtml,
  toAnsi as syntaxToAnsi,
  type LanguageRules,
} from './syntax';

import {
  diffCheckpoints,
  markLines,
  formatDiffHtml,
  formatDiffAnsi,
  type WeaveDiff,
  type MarkedLine,
} from './diffs';

import {
  buildCrossReferenceIndex,
  generateGlossary,
  generateIndex,
  getFileHistory,
  type CrossReferenceIndex,
  type GlossaryEntry,
  type IndexEntry,
  type ChapterInfo,
} from './crossrefs';

/**
 * Output format for rendered content
 */
export type OutputFormat = 'html' | 'markdown' | 'ansi' | 'json';

/**
 * Chapter content for rendering
 */
export interface ChapterContent {
  /** Chapter ID */
  id: string;
  /** Chapter title */
  title: string;
  /** Chapter number (1-based) */
  number: number;
  /** Prose sections */
  sections: Section[];
  /** Snippets in this chapter */
  snippets: Snippet[];
  /** Checkpoint at end of chapter (if any) */
  checkpoint?: Checkpoint;
}

/**
 * A section of prose content
 */
export interface Section {
  /** Section ID */
  id: string;
  /** Section heading */
  heading?: string;
  /** Section content (markdown or HTML) */
  content: string;
  /** Snippets referenced in this section */
  snippetIds: string[];
}

/**
 * Rendered snippet block
 */
export interface RenderedSnippet {
  /** Snippet ID */
  id: string;
  /** Snippet name */
  name: string;
  /** Target file path */
  file: string;
  /** Target part (if any) */
  part?: string;
  /** Operation type */
  operation: string;
  /** Language */
  language: string;
  /** Highlighted code (format depends on output) */
  highlightedCode: string;
  /** Line markers (new/modified/context) */
  lineMarkers?: MarkedLine[];
  /** Caption text */
  caption?: string;
}

/**
 * Rendered chapter
 */
export interface RenderedChapter {
  /** Chapter ID */
  id: string;
  /** Chapter title */
  title: string;
  /** Chapter number */
  number: number;
  /** Rendered sections with embedded snippets */
  content: string;
  /** Rendered snippets */
  snippets: RenderedSnippet[];
  /** Checkpoint diff (if showing changes) */
  checkpointDiff?: WeaveDiff[];
  /** Cross-reference links */
  crossRefs: string[];
}

/**
 * Complete rendered book
 */
export interface RenderedBook {
  /** Book title */
  title: string;
  /** Rendered chapters */
  chapters: RenderedChapter[];
  /** Glossary */
  glossary: GlossaryEntry[];
  /** Index */
  index: IndexEntry[];
  /** Table of contents */
  toc: TocEntry[];
  /** Metadata */
  metadata: BookMetadata;
}

/**
 * Table of contents entry
 */
export interface TocEntry {
  /** Entry title */
  title: string;
  /** Chapter number */
  number: number;
  /** Chapter ID for linking */
  chapterId: string;
  /** Subsections */
  sections: Array<{
    title: string;
    sectionId: string;
  }>;
}

/**
 * Book metadata
 */
export interface BookMetadata {
  /** Total word count */
  wordCount: number;
  /** Total code line count */
  codeLineCount: number;
  /** Number of concepts */
  conceptCount: number;
  /** Number of checkpoints */
  checkpointCount: number;
  /** Number of files generated */
  fileCount: number;
  /** Generation timestamp */
  generatedAt: string;
}

/**
 * Options for rendering
 */
export interface RenderOptions {
  /** Output format */
  format: OutputFormat;
  /** Show diff markers for new/modified code */
  showDiffs?: boolean;
  /** Previous checkpoint for diff comparison */
  previousCheckpoint?: Checkpoint;
  /** Previous tangled files (for diff) */
  previousFiles?: TangledFile[];
  /** Include line numbers */
  lineNumbers?: boolean;
  /** CSS class prefix for HTML output */
  classPrefix?: string;
  /** Custom syntax highlighting rules */
  customLanguageRules?: Record<string, LanguageRules>;
  /** Include cross-reference links */
  includeCrossRefs?: boolean;
}

/**
 * Create a renderer for technical book content
 */
export interface BookRenderer {
  /** Render a single snippet */
  renderSnippet(snippet: Snippet, options?: RenderOptions): RenderedSnippet;

  /** Render highlighted code */
  renderCode(code: string, language: string, options?: RenderOptions): string;

  /** Render a chapter */
  renderChapter(
    chapter: ChapterContent,
    tangledFiles: TangledFile[],
    options?: RenderOptions
  ): RenderedChapter;

  /** Render a complete book */
  renderBook(
    chapters: ChapterContent[],
    concepts: Concept[],
    snippets: Snippet[],
    symbolLinks: SymbolLink[],
    checkpoints: Checkpoint[],
    tangledFiles: TangledFile[],
    options?: RenderOptions
  ): RenderedBook;

  /** Render a diff between checkpoints */
  renderCheckpointDiff(
    fromFiles: TangledFile[],
    toFiles: TangledFile[],
    fromCheckpointId: string,
    toCheckpointId: string,
    options?: RenderOptions
  ): string;

  /** Render the glossary */
  renderGlossary(glossary: GlossaryEntry[], options?: RenderOptions): string;

  /** Render the index */
  renderIndex(index: IndexEntry[], options?: RenderOptions): string;

  /** Get cross-reference index */
  getCrossRefIndex(): CrossReferenceIndex | null;
}

/**
 * Create a book renderer
 */
export function createBookRenderer(bookTitle: string): BookRenderer {
  let crossRefIndex: CrossReferenceIndex | null = null;

  function renderCode(code: string, language: string, options: RenderOptions = { format: 'html' }): string {
    const result = highlight(code, language, options.customLanguageRules);

    switch (options.format) {
      case 'html':
        return syntaxToHtml(result, {
          classPrefix: options.classPrefix ?? 'hl-',
          lineNumbers: options.lineNumbers ?? true,
        });
      case 'ansi':
        return syntaxToAnsi(result);
      case 'markdown':
        return `\`\`\`${language}\n${code}\n\`\`\``;
      case 'json':
        return JSON.stringify(result, null, 2);
      default:
        return code;
    }
  }

  function renderSnippet(snippet: Snippet, options: RenderOptions = { format: 'html' }): RenderedSnippet {
    const highlightedCode = renderCode(snippet.code, snippet.language, options);

    const caption = formatSnippetCaption(snippet);

    return {
      id: snippet.id,
      name: snippet.name,
      file: snippet.file,
      part: snippet.part,
      operation: snippet.operation,
      language: snippet.language,
      highlightedCode,
      caption,
    };
  }

  function renderChapter(
    chapter: ChapterContent,
    tangledFiles: TangledFile[],
    options: RenderOptions = { format: 'html' }
  ): RenderedChapter {
    const renderedSnippets: RenderedSnippet[] = [];
    const crossRefs: string[] = [];

    // Render all snippets
    for (const snippet of chapter.snippets) {
      const rendered = renderSnippet(snippet, options);

      // Add line markers if showing diffs
      if (options.showDiffs && options.previousFiles) {
        const currentFile = tangledFiles.find((f) => f.path === snippet.file);
        const previousFile = options.previousFiles.find((f) => f.path === snippet.file);

        if (currentFile) {
          rendered.lineMarkers = markLines(currentFile, previousFile ?? null);
        }
      }

      renderedSnippets.push(rendered);
    }

    // Render sections with embedded snippets
    let content = '';
    for (const section of chapter.sections) {
      if (section.heading) {
        content += formatHeading(section.heading, options.format);
      }
      content += section.content;

      // Insert snippet references
      for (const snippetId of section.snippetIds) {
        const rendered = renderedSnippets.find((s) => s.id === snippetId);
        if (rendered) {
          content += formatSnippetBlock(rendered, options);
        }
      }
    }

    // Render checkpoint diff if applicable
    let checkpointDiff: WeaveDiff[] | undefined;
    if (chapter.checkpoint && options.showDiffs && options.previousFiles) {
      const diff = diffCheckpoints(
        options.previousFiles,
        tangledFiles,
        options.previousCheckpoint?.id ?? 'initial',
        chapter.checkpoint.id
      );
      checkpointDiff = diff.files;
    }

    return {
      id: chapter.id,
      title: chapter.title,
      number: chapter.number,
      content,
      snippets: renderedSnippets,
      checkpointDiff,
      crossRefs,
    };
  }

  function renderBook(
    chapters: ChapterContent[],
    concepts: Concept[],
    snippets: Snippet[],
    symbolLinks: SymbolLink[],
    checkpoints: Checkpoint[],
    tangledFiles: TangledFile[],
    options: RenderOptions = { format: 'html' }
  ): RenderedBook {
    // Build cross-reference index
    const chapterInfos: ChapterInfo[] = chapters.map((c) => ({
      id: c.id,
      title: c.title,
      order: c.number - 1,
    }));

    crossRefIndex = buildCrossReferenceIndex(
      concepts,
      snippets,
      symbolLinks,
      checkpoints,
      tangledFiles,
      { chapters: chapterInfos }
    );

    // Generate glossary and index
    const glossary = generateGlossary(concepts, crossRefIndex, chapterInfos);
    const index = generateIndex(crossRefIndex, concepts, chapterInfos);

    // Render chapters
    const renderedChapters: RenderedChapter[] = [];
    let previousFiles: TangledFile[] = [];
    let previousCheckpoint: Checkpoint | undefined;

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterOptions: RenderOptions = {
        ...options,
        showDiffs: options.showDiffs,
        previousFiles,
        previousCheckpoint,
      };

      const rendered = renderChapter(chapter, tangledFiles, chapterOptions);
      renderedChapters.push(rendered);

      // Update previous state for next chapter
      if (chapter.checkpoint) {
        previousCheckpoint = chapter.checkpoint;
        // In a real implementation, we'd get the tangled files at this checkpoint
        previousFiles = tangledFiles;
      }
    }

    // Generate table of contents
    const toc: TocEntry[] = chapters.map((chapter) => ({
      title: chapter.title,
      number: chapter.number,
      chapterId: chapter.id,
      sections: chapter.sections
        .filter((s) => s.heading)
        .map((s) => ({
          title: s.heading!,
          sectionId: s.id,
        })),
    }));

    // Calculate metadata
    const metadata = calculateMetadata(chapters, snippets, concepts, checkpoints, tangledFiles);

    return {
      title: bookTitle,
      chapters: renderedChapters,
      glossary,
      index,
      toc,
      metadata,
    };
  }

  function renderCheckpointDiff(
    fromFiles: TangledFile[],
    toFiles: TangledFile[],
    fromCheckpointId: string,
    toCheckpointId: string,
    options: RenderOptions = { format: 'html' }
  ): string {
    const diff = diffCheckpoints(fromFiles, toFiles, fromCheckpointId, toCheckpointId);

    const parts: string[] = [];

    for (const fileDiff of diff.files) {
      switch (options.format) {
        case 'html':
          parts.push(formatDiffHtml(fileDiff, { classPrefix: options.classPrefix }));
          break;
        case 'ansi':
          parts.push(formatDiffAnsi(fileDiff, { color: true }));
          break;
        case 'markdown':
          parts.push(formatDiffMarkdown(fileDiff));
          break;
        case 'json':
          parts.push(JSON.stringify(fileDiff, null, 2));
          break;
      }
    }

    return parts.join(options.format === 'html' ? '\n' : '\n\n');
  }

  function renderGlossary(glossary: GlossaryEntry[], options: RenderOptions = { format: 'html' }): string {
    switch (options.format) {
      case 'html':
        return renderGlossaryHtml(glossary, options.classPrefix ?? 'glossary-');
      case 'markdown':
        return renderGlossaryMarkdown(glossary);
      case 'ansi':
        return renderGlossaryAnsi(glossary);
      case 'json':
        return JSON.stringify(glossary, null, 2);
      default:
        return '';
    }
  }

  function renderIndex(index: IndexEntry[], options: RenderOptions = { format: 'html' }): string {
    switch (options.format) {
      case 'html':
        return renderIndexHtml(index, options.classPrefix ?? 'index-');
      case 'markdown':
        return renderIndexMarkdown(index);
      case 'ansi':
        return renderIndexAnsi(index);
      case 'json':
        return JSON.stringify(index, null, 2);
      default:
        return '';
    }
  }

  function getCrossRefIndex(): CrossReferenceIndex | null {
    return crossRefIndex;
  }

  return {
    renderSnippet,
    renderCode,
    renderChapter,
    renderBook,
    renderCheckpointDiff,
    renderGlossary,
    renderIndex,
    getCrossRefIndex,
  };
}

// Helper functions

function formatSnippetCaption(snippet: Snippet): string {
  const parts = [snippet.file];
  if (snippet.part) {
    parts.push(`(${snippet.part})`);
  }
  parts.push(`— ${snippet.operation}`);
  return parts.join(' ');
}

function formatHeading(heading: string, format: OutputFormat): string {
  switch (format) {
    case 'html':
      return `<h2>${escapeHtml(heading)}</h2>\n`;
    case 'markdown':
      return `## ${heading}\n\n`;
    case 'ansi':
      return `\x1b[1m${heading}\x1b[0m\n\n`;
    default:
      return `${heading}\n\n`;
  }
}

function formatSnippetBlock(snippet: RenderedSnippet, options: RenderOptions): string {
  const { format, classPrefix = 'snippet-' } = options;

  switch (format) {
    case 'html':
      return `
<div class="${classPrefix}block">
  <div class="${classPrefix}caption">${escapeHtml(snippet.caption ?? snippet.name)}</div>
  <pre class="${classPrefix}code"><code class="language-${snippet.language}">${snippet.highlightedCode}</code></pre>
</div>
`;
    case 'markdown':
      return `
**${snippet.caption ?? snippet.name}**

\`\`\`${snippet.language}
${snippet.highlightedCode}
\`\`\`

`;
    case 'ansi':
      return `
\x1b[1m${snippet.caption ?? snippet.name}\x1b[0m

${snippet.highlightedCode}

`;
    default:
      return snippet.highlightedCode;
  }
}

function formatDiffMarkdown(diff: WeaveDiff): string {
  const lines: string[] = [];

  if (diff.isNew) {
    lines.push(`### New file: ${diff.path}`);
  } else if (diff.isDeleted) {
    lines.push(`### Deleted file: ${diff.path}`);
  } else {
    lines.push(`### Modified: ${diff.path}`);
  }

  lines.push('');
  lines.push('```diff');

  for (const hunk of diff.hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
    for (const line of hunk.lines) {
      const prefix = line.changeType === 'added' ? '+' : line.changeType === 'removed' ? '-' : ' ';
      lines.push(`${prefix}${line.content}`);
    }
  }

  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function renderGlossaryHtml(glossary: GlossaryEntry[], classPrefix: string): string {
  const entries = glossary.map((entry) => {
    const prereqs = entry.prerequisites.length > 0
      ? `<div class="${classPrefix}prereqs">Prerequisites: ${entry.prerequisites.map((p) => `<a href="#concept-${p.id}">${escapeHtml(p.name)}</a>`).join(', ')}</div>`
      : '';

    const symbols = entry.symbols.length > 0
      ? `<div class="${classPrefix}symbols">Related symbols: <code>${entry.symbols.join('</code>, <code>')}</code></div>`
      : '';

    return `
<div class="${classPrefix}entry" id="concept-${entry.id}">
  <dt class="${classPrefix}term">${escapeHtml(entry.name)}</dt>
  <dd class="${classPrefix}definition">
    <span class="${classPrefix}type">(${entry.type})</span>
    ${escapeHtml(entry.definition)}
    ${prereqs}
    ${symbols}
  </dd>
</div>`;
  });

  return `<dl class="${classPrefix}list">\n${entries.join('\n')}\n</dl>`;
}

function renderGlossaryMarkdown(glossary: GlossaryEntry[]): string {
  return glossary.map((entry) => {
    let md = `**${entry.name}** _(${entry.type})_\n\n${entry.definition}`;

    if (entry.prerequisites.length > 0) {
      md += `\n\nPrerequisites: ${entry.prerequisites.map((p) => p.name).join(', ')}`;
    }

    if (entry.symbols.length > 0) {
      md += `\n\nRelated symbols: \`${entry.symbols.join('`, `')}\``;
    }

    return md + '\n';
  }).join('\n---\n\n');
}

function renderGlossaryAnsi(glossary: GlossaryEntry[]): string {
  return glossary.map((entry) => {
    let text = `\x1b[1m${entry.name}\x1b[0m (${entry.type})\n  ${entry.definition}`;

    if (entry.prerequisites.length > 0) {
      text += `\n  Prerequisites: ${entry.prerequisites.map((p) => p.name).join(', ')}`;
    }

    if (entry.symbols.length > 0) {
      text += `\n  Symbols: ${entry.symbols.join(', ')}`;
    }

    return text;
  }).join('\n\n');
}

function renderIndexHtml(index: IndexEntry[], classPrefix: string): string {
  const entries = index.map((entry) => {
    const refs = entry.references.map((ref) => {
      const text = ref.chapterTitle ?? `Chapter ${ref.chapterNumber}`;
      const anchor = ref.anchor ? `#${ref.anchor}` : `#chapter-${ref.chapterId}`;
      const cls = ref.isPrimary ? `${classPrefix}primary` : '';
      return `<a href="${anchor}" class="${cls}">${escapeHtml(text)}</a>`;
    }).join(', ');

    return `<li class="${classPrefix}entry"><span class="${classPrefix}term">${escapeHtml(entry.term)}</span>: ${refs}</li>`;
  });

  return `<ul class="${classPrefix}list">\n${entries.join('\n')}\n</ul>`;
}

function renderIndexMarkdown(index: IndexEntry[]): string {
  return index.map((entry) => {
    const refs = entry.references.map((ref) => {
      const text = ref.chapterTitle ?? `Chapter ${ref.chapterNumber}`;
      return ref.isPrimary ? `**${text}**` : text;
    }).join(', ');

    return `- **${entry.term}**: ${refs}`;
  }).join('\n');
}

function renderIndexAnsi(index: IndexEntry[]): string {
  return index.map((entry) => {
    const refs = entry.references.map((ref) => {
      const text = ref.chapterTitle ?? `Chapter ${ref.chapterNumber}`;
      return ref.isPrimary ? `\x1b[1m${text}\x1b[0m` : text;
    }).join(', ');

    return `${entry.term}: ${refs}`;
  }).join('\n');
}

function calculateMetadata(
  chapters: ChapterContent[],
  snippets: Snippet[],
  concepts: Concept[],
  checkpoints: Checkpoint[],
  tangledFiles: TangledFile[]
): BookMetadata {
  let wordCount = 0;
  for (const chapter of chapters) {
    for (const section of chapter.sections) {
      wordCount += section.content.split(/\s+/).length;
    }
  }

  let codeLineCount = 0;
  for (const snippet of snippets) {
    codeLineCount += snippet.code.split('\n').length;
  }

  return {
    wordCount,
    codeLineCount,
    conceptCount: concepts.length,
    checkpointCount: checkpoints.length,
    fileCount: tangledFiles.length,
    generatedAt: new Date().toISOString(),
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Options for generating a single file render
 */
export interface FileRenderOptions extends RenderOptions {
  /** Include file header */
  includeHeader?: boolean;
  /** Include file history */
  includeHistory?: boolean;
  /** Chapter info for history */
  chapters?: ChapterInfo[];
}

/**
 * Render a single file with history and annotations
 */
export function renderFile(
  file: TangledFile,
  snippets: Snippet[],
  options: FileRenderOptions = { format: 'html' }
): string {
  const { format, includeHeader = true, includeHistory = false, chapters = [] } = options;

  const parts: string[] = [];

  if (includeHeader) {
    switch (format) {
      case 'html':
        parts.push(`<div class="file-header"><h3>${escapeHtml(file.path)}</h3></div>`);
        break;
      case 'markdown':
        parts.push(`### ${file.path}\n`);
        break;
      case 'ansi':
        parts.push(`\x1b[1m${file.path}\x1b[0m\n`);
        break;
    }
  }

  if (includeHistory && chapters.length > 0) {
    const history = getFileHistory(file.path, snippets, chapters);
    if (history) {
      switch (format) {
        case 'html':
          parts.push('<div class="file-history">');
          parts.push('<h4>History</h4><ul>');
          for (const ch of history.chapters) {
            parts.push(`<li>Chapter ${ch.chapterNumber}: ${ch.operation} (${ch.snippetIds.length} snippets)</li>`);
          }
          parts.push('</ul></div>');
          break;
        case 'markdown':
          parts.push('\n**History:**\n');
          for (const ch of history.chapters) {
            parts.push(`- Chapter ${ch.chapterNumber}: ${ch.operation} (${ch.snippetIds.length} snippets)`);
          }
          parts.push('');
          break;
        case 'ansi':
          parts.push('\nHistory:');
          for (const ch of history.chapters) {
            parts.push(`  Chapter ${ch.chapterNumber}: ${ch.operation} (${ch.snippetIds.length} snippets)`);
          }
          parts.push('');
          break;
      }
    }
  }

  // Detect language from file extension
  const extension = file.path.split('.').pop() ?? '';
  const language = extensionToLanguage(extension);

  // Render the code
  const renderer = createBookRenderer('');
  const rendered = renderer.renderCode(file.content, language, options);

  switch (format) {
    case 'html':
      parts.push(`<pre class="file-content"><code class="language-${language}">${rendered}</code></pre>`);
      break;
    default:
      parts.push(rendered);
  }

  return parts.join('\n');
}

/**
 * Map file extension to language identifier
 */
function extensionToLanguage(ext: string): string {
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    sh: 'shell',
    bash: 'shell',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    html: 'html',
    css: 'css',
    sql: 'sql',
    toml: 'toml',
  };
  return map[ext.toLowerCase()] ?? 'text';
}

/**
 * Render table of contents
 */
export function renderTableOfContents(toc: TocEntry[], options: RenderOptions = { format: 'html' }): string {
  switch (options.format) {
    case 'html':
      return renderTocHtml(toc, options.classPrefix ?? 'toc-');
    case 'markdown':
      return renderTocMarkdown(toc);
    case 'ansi':
      return renderTocAnsi(toc);
    case 'json':
      return JSON.stringify(toc, null, 2);
    default:
      return '';
  }
}

function renderTocHtml(toc: TocEntry[], classPrefix: string): string {
  const entries = toc.map((entry) => {
    const sections = entry.sections.length > 0
      ? `<ul class="${classPrefix}sections">${entry.sections.map((s) => `<li><a href="#${s.sectionId}">${escapeHtml(s.title)}</a></li>`).join('')}</ul>`
      : '';

    return `<li class="${classPrefix}chapter"><a href="#chapter-${entry.chapterId}">Chapter ${entry.number}: ${escapeHtml(entry.title)}</a>${sections}</li>`;
  });

  return `<nav class="${classPrefix}nav"><ul class="${classPrefix}list">\n${entries.join('\n')}\n</ul></nav>`;
}

function renderTocMarkdown(toc: TocEntry[]): string {
  const entries = toc.map((entry) => {
    let md = `${entry.number}. **${entry.title}**`;
    if (entry.sections.length > 0) {
      md += '\n' + entry.sections.map((s) => `   - ${s.title}`).join('\n');
    }
    return md;
  });

  return entries.join('\n\n');
}

function renderTocAnsi(toc: TocEntry[]): string {
  const entries = toc.map((entry) => {
    let text = `\x1b[1m${entry.number}. ${entry.title}\x1b[0m`;
    if (entry.sections.length > 0) {
      text += '\n' + entry.sections.map((s) => `   • ${s.title}`).join('\n');
    }
    return text;
  });

  return entries.join('\n\n');
}
