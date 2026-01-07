/**
 * Cross-reference generation for technical books.
 *
 * Builds indices of concepts, symbols, code snippets, and checkpoints.
 * Generates back-references and validates that all references can be resolved.
 */

import type {
  Concept,
  Snippet,
  Checkpoint,
  SymbolLink,
  TangledFile,
} from '@repo/techbook-types';

/**
 * Information about where a concept is introduced
 */
export interface ConceptIntroduction {
  /** Concept ID */
  conceptId: string;
  /** Concept name */
  conceptName: string;
  /** Chapter ID where introduced */
  chapterId: string;
  /** Chapter title (if available) */
  chapterTitle?: string;
  /** Chapter number (1-based) */
  chapterNumber?: number;
}

/**
 * Information about where a concept is used
 */
export interface ConceptUsage {
  /** Concept ID */
  conceptId: string;
  /** Chapter ID where used */
  chapterId: string;
  /** Snippet ID where used (if in code) */
  snippetId?: string;
  /** File path (if in code) */
  filePath?: string;
  /** Line number (if in code) */
  lineNumber?: number;
}

/**
 * Information about where a symbol is defined
 */
export interface SymbolDefinition {
  /** Symbol name */
  symbol: string;
  /** Concept that explains the symbol */
  conceptId: string;
  /** Snippet where the symbol is introduced */
  snippetId: string;
  /** File path */
  filePath: string;
  /** Part name (if applicable) */
  partName?: string;
  /** Chapter ID */
  chapterId: string;
}

/**
 * Reference to where a symbol is used
 */
export interface SymbolReference {
  /** Symbol name */
  symbol: string;
  /** Snippet ID where used */
  snippetId: string;
  /** File path */
  filePath: string;
  /** Chapter ID */
  chapterId: string;
  /** Line number in the tangled output */
  lineNumber?: number;
}

/**
 * Index entry for a file
 */
export interface FileIndexEntry {
  /** File path */
  path: string;
  /** Snippets that contribute to this file */
  snippetIds: string[];
  /** Chapters that modify this file */
  chapterIds: string[];
  /** Checkpoints where this file changes */
  checkpointIds: string[];
  /** Parts in this file */
  parts: string[];
}

/**
 * Index entry for a checkpoint
 */
export interface CheckpointIndexEntry {
  /** Checkpoint ID */
  checkpointId: string;
  /** Checkpoint name */
  checkpointName: string;
  /** Chapter ID */
  chapterId: string;
  /** Files at this checkpoint */
  files: string[];
  /** Concepts introduced before this checkpoint */
  conceptsAvailable: string[];
  /** Snippets up to this checkpoint */
  snippetIds: string[];
}

/**
 * Complete cross-reference index
 */
export interface CrossReferenceIndex {
  /** Concept introductions */
  concepts: Map<string, ConceptIntroduction>;
  /** Concept usages indexed by concept ID */
  conceptUsages: Map<string, ConceptUsage[]>;
  /** Symbol definitions indexed by symbol name */
  symbols: Map<string, SymbolDefinition[]>;
  /** Symbol references indexed by symbol name */
  symbolRefs: Map<string, SymbolReference[]>;
  /** File index entries */
  files: Map<string, FileIndexEntry>;
  /** Checkpoint index entries */
  checkpoints: Map<string, CheckpointIndexEntry>;
  /** Chapter to snippets mapping */
  chapterSnippets: Map<string, string[]>;
  /** Chapter to concepts mapping */
  chapterConcepts: Map<string, string[]>;
}

/**
 * Validation issue types
 */
export type CrossRefIssueType =
  | 'missing-concept-introduction'
  | 'premature-symbol-use'
  | 'undefined-symbol'
  | 'orphaned-symbol-link'
  | 'circular-prerequisite';

/**
 * A validation issue
 */
export interface CrossRefIssue {
  /** Issue type */
  type: CrossRefIssueType;
  /** Issue message */
  message: string;
  /** Affected entity ID */
  entityId?: string;
  /** Affected chapter ID */
  chapterId?: string;
  /** Affected file path */
  filePath?: string;
  /** Related symbol */
  symbol?: string;
}

/**
 * Chapter info for ordering
 */
export interface ChapterInfo {
  /** Chapter ID */
  id: string;
  /** Chapter title */
  title?: string;
  /** Order in the book */
  order: number;
}

/**
 * Options for building cross-references
 */
export interface CrossRefOptions {
  /** Chapter order (required for validation) */
  chapters: ChapterInfo[];
  /** Validate references */
  validate?: boolean;
}

/**
 * Build a cross-reference index from project data
 */
export function buildCrossReferenceIndex(
  concepts: Concept[],
  snippets: Snippet[],
  symbolLinks: SymbolLink[],
  checkpoints: Checkpoint[],
  tangledFiles: TangledFile[],
  options: CrossRefOptions
): CrossReferenceIndex {
  const { chapters } = options;
  const chapterOrderMap = new Map(chapters.map((c) => [c.id, c.order]));

  // Initialize index
  const index: CrossReferenceIndex = {
    concepts: new Map(),
    conceptUsages: new Map(),
    symbols: new Map(),
    symbolRefs: new Map(),
    files: new Map(),
    checkpoints: new Map(),
    chapterSnippets: new Map(),
    chapterConcepts: new Map(),
  };

  // Index concepts
  for (const concept of concepts) {
    if (concept.introducedAt) {
      const chapterInfo = chapters.find((c) => c.id === concept.introducedAt);
      index.concepts.set(concept.id, {
        conceptId: concept.id,
        conceptName: concept.name,
        chapterId: concept.introducedAt,
        chapterTitle: chapterInfo?.title,
        chapterNumber: chapterInfo ? chapterInfo.order + 1 : undefined,
      });

      // Track concepts by chapter
      const chapterConcepts = index.chapterConcepts.get(concept.introducedAt) ?? [];
      chapterConcepts.push(concept.id);
      index.chapterConcepts.set(concept.introducedAt, chapterConcepts);
    }

    // Initialize usage list
    index.conceptUsages.set(concept.id, []);
  }

  // Index snippets
  for (const snippet of snippets) {
    // Track snippets by chapter
    const chapterSnippets = index.chapterSnippets.get(snippet.chapterId) ?? [];
    chapterSnippets.push(snippet.id);
    index.chapterSnippets.set(snippet.chapterId, chapterSnippets);

    // Track files
    const fileEntry = index.files.get(snippet.file) ?? {
      path: snippet.file,
      snippetIds: [],
      chapterIds: [],
      checkpointIds: [],
      parts: [],
    };

    fileEntry.snippetIds.push(snippet.id);
    if (!fileEntry.chapterIds.includes(snippet.chapterId)) {
      fileEntry.chapterIds.push(snippet.chapterId);
    }
    if (snippet.part && !fileEntry.parts.includes(snippet.part)) {
      fileEntry.parts.push(snippet.part);
    }

    index.files.set(snippet.file, fileEntry);
  }

  // Index symbol links
  for (const link of symbolLinks) {
    const snippet = snippets.find((s) => s.id === link.snippetId);
    if (!snippet) continue;

    const defs = index.symbols.get(link.symbol) ?? [];
    defs.push({
      symbol: link.symbol,
      conceptId: link.conceptId,
      snippetId: link.snippetId,
      filePath: snippet.file,
      partName: snippet.part,
      chapterId: snippet.chapterId,
    });
    index.symbols.set(link.symbol, defs);

    // Track concept usage
    const usages = index.conceptUsages.get(link.conceptId) ?? [];
    usages.push({
      conceptId: link.conceptId,
      chapterId: snippet.chapterId,
      snippetId: snippet.id,
      filePath: snippet.file,
    });
    index.conceptUsages.set(link.conceptId, usages);
  }

  // Index checkpoints
  for (const checkpoint of checkpoints) {
    const checkpointOrder = chapterOrderMap.get(checkpoint.chapterId) ?? Infinity;

    // Find snippets up to this checkpoint
    const snippetsUpTo = snippets.filter((s) => {
      const order = chapterOrderMap.get(s.chapterId);
      return order !== undefined && order <= checkpointOrder;
    });

    // Find concepts introduced before this checkpoint
    const conceptsAvailable = concepts.filter((c) => {
      if (!c.introducedAt) return false;
      const order = chapterOrderMap.get(c.introducedAt);
      return order !== undefined && order <= checkpointOrder;
    });

    // Find files at this checkpoint
    const filesAtCheckpoint = new Set<string>();
    for (const snippet of snippetsUpTo) {
      filesAtCheckpoint.add(snippet.file);
    }

    // Also add files from tangled output if available
    for (const file of tangledFiles) {
      // Check if file's snippets are in scope
      const fileSnippetIds = new Set(file.sourceSnippetIds);
      if (snippetsUpTo.some((s) => fileSnippetIds.has(s.id))) {
        filesAtCheckpoint.add(file.path);
      }
    }

    index.checkpoints.set(checkpoint.id, {
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.name,
      chapterId: checkpoint.chapterId,
      files: Array.from(filesAtCheckpoint).sort(),
      conceptsAvailable: conceptsAvailable.map((c) => c.id),
      snippetIds: snippetsUpTo.map((s) => s.id),
    });
  }

  // Sort chapter snippets/concepts by order
  for (const [chapterId, snippetIds] of index.chapterSnippets) {
    const chapterSnippets = snippetIds
      .map((id) => snippets.find((s) => s.id === id))
      .filter((s): s is Snippet => s !== undefined)
      .sort((a, b) => a.order - b.order);
    index.chapterSnippets.set(
      chapterId,
      chapterSnippets.map((s) => s.id)
    );
  }

  return index;
}

/**
 * Validate cross-references
 */
export function validateCrossReferences(
  _index: CrossReferenceIndex,
  concepts: Concept[],
  snippets: Snippet[],
  symbolLinks: SymbolLink[],
  chapters: ChapterInfo[]
): CrossRefIssue[] {
  const issues: CrossRefIssue[] = [];
  const chapterOrderMap = new Map(chapters.map((c) => [c.id, c.order]));

  // Check for missing concept introductions
  for (const concept of concepts) {
    if (!concept.introducedAt) {
      issues.push({
        type: 'missing-concept-introduction',
        message: `Concept "${concept.name}" has no introduction chapter`,
        entityId: concept.id,
      });
    }
  }

  // Check for premature symbol use
  for (const link of symbolLinks) {
    const concept = concepts.find((c) => c.id === link.conceptId);
    const snippet = snippets.find((s) => s.id === link.snippetId);

    if (!concept || !snippet) {
      issues.push({
        type: 'orphaned-symbol-link',
        message: `Symbol link for "${link.symbol}" references missing concept or snippet`,
        symbol: link.symbol,
      });
      continue;
    }

    if (concept.introducedAt) {
      const conceptOrder = chapterOrderMap.get(concept.introducedAt);
      const snippetOrder = chapterOrderMap.get(snippet.chapterId);

      if (conceptOrder !== undefined && snippetOrder !== undefined && snippetOrder < conceptOrder) {
        issues.push({
          type: 'premature-symbol-use',
          message: `Symbol "${link.symbol}" used in chapter ${snippetOrder + 1} before concept "${concept.name}" is introduced in chapter ${conceptOrder + 1}`,
          symbol: link.symbol,
          entityId: concept.id,
          chapterId: snippet.chapterId,
        });
      }
    }
  }

  // Check for circular prerequisites
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function detectCycle(conceptId: string, path: string[]): string[] | null {
    if (recursionStack.has(conceptId)) {
      return [...path, conceptId];
    }
    if (visited.has(conceptId)) {
      return null;
    }

    visited.add(conceptId);
    recursionStack.add(conceptId);

    const concept = concepts.find((c) => c.id === conceptId);
    if (concept) {
      for (const prereqId of concept.prerequisites) {
        const cycle = detectCycle(prereqId, [...path, conceptId]);
        if (cycle) return cycle;
      }
    }

    recursionStack.delete(conceptId);
    return null;
  }

  for (const concept of concepts) {
    if (!visited.has(concept.id)) {
      const cycle = detectCycle(concept.id, []);
      if (cycle) {
        const cycleNames = cycle.map((id) => concepts.find((c) => c.id === id)?.name ?? id);
        issues.push({
          type: 'circular-prerequisite',
          message: `Circular prerequisite chain: ${cycleNames.join(' → ')}`,
          entityId: concept.id,
        });
      }
    }
  }

  return issues;
}

/**
 * Glossary entry for rendering
 */
export interface GlossaryEntry {
  /** Concept ID */
  id: string;
  /** Term/name */
  name: string;
  /** Type (term, type, algorithm, pattern, principle) */
  type: string;
  /** Definition */
  definition: string;
  /** Chapter where introduced */
  introducedChapter?: {
    id: string;
    title?: string;
    number?: number;
  };
  /** Prerequisites */
  prerequisites: Array<{
    id: string;
    name: string;
  }>;
  /** Related symbols */
  symbols: string[];
  /** Chapters where used */
  usedIn: Array<{
    chapterId: string;
    chapterTitle?: string;
    chapterNumber?: number;
  }>;
}

/**
 * Generate a glossary from the cross-reference index
 */
export function generateGlossary(
  concepts: Concept[],
  index: CrossReferenceIndex,
  chapters: ChapterInfo[]
): GlossaryEntry[] {
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  return concepts
    .map((concept) => {
      const introduction = index.concepts.get(concept.id);
      const usages = index.conceptUsages.get(concept.id) ?? [];

      // Get unique chapters where concept is used
      const usedChapterIds = new Set(usages.map((u) => u.chapterId));
      const usedIn = Array.from(usedChapterIds)
        .map((chapterId) => {
          const chapter = chapterMap.get(chapterId);
          return chapter
            ? { chapterId, chapterTitle: chapter.title, chapterNumber: chapter.order + 1 }
            : { chapterId };
        })
        .sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));

      // Get prerequisites with names
      const prerequisites = concept.prerequisites
        .map((prereqId) => {
          const prereq = concepts.find((c) => c.id === prereqId);
          return prereq ? { id: prereqId, name: prereq.name } : null;
        })
        .filter((p): p is { id: string; name: string } => p !== null);

      return {
        id: concept.id,
        name: concept.name,
        type: concept.type,
        definition: concept.definition,
        introducedChapter: introduction
          ? {
              id: introduction.chapterId,
              title: introduction.chapterTitle,
              number: introduction.chapterNumber,
            }
          : undefined,
        prerequisites,
        symbols: concept.relatedSymbols,
        usedIn,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Index entry for rendered output
 */
export interface IndexEntry {
  /** Term being indexed */
  term: string;
  /** Type of entry */
  type: 'concept' | 'symbol' | 'file' | 'checkpoint';
  /** References to locations */
  references: Array<{
    /** Chapter ID */
    chapterId: string;
    /** Chapter title */
    chapterTitle?: string;
    /** Chapter number */
    chapterNumber?: number;
    /** Is this the primary/definition location */
    isPrimary: boolean;
    /** Page or section reference (for rendering) */
    anchor?: string;
  }>;
}

/**
 * Generate an index from the cross-reference index
 */
export function generateIndex(
  index: CrossReferenceIndex,
  concepts: Concept[],
  chapters: ChapterInfo[]
): IndexEntry[] {
  const entries: IndexEntry[] = [];
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  // Index concepts
  for (const concept of concepts) {
    const introduction = index.concepts.get(concept.id);
    const usages = index.conceptUsages.get(concept.id) ?? [];

    const references: IndexEntry['references'] = [];

    // Add introduction as primary
    if (introduction) {
      const chapter = chapterMap.get(introduction.chapterId);
      references.push({
        chapterId: introduction.chapterId,
        chapterTitle: chapter?.title,
        chapterNumber: chapter ? chapter.order + 1 : undefined,
        isPrimary: true,
        anchor: `concept-${concept.id}`,
      });
    }

    // Add usage locations
    const usedChapterIds = new Set<string>();
    for (const usage of usages) {
      if (!usedChapterIds.has(usage.chapterId) && usage.chapterId !== introduction?.chapterId) {
        usedChapterIds.add(usage.chapterId);
        const chapter = chapterMap.get(usage.chapterId);
        references.push({
          chapterId: usage.chapterId,
          chapterTitle: chapter?.title,
          chapterNumber: chapter ? chapter.order + 1 : undefined,
          isPrimary: false,
        });
      }
    }

    // Sort by chapter number
    references.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0);
    });

    entries.push({
      term: concept.name,
      type: 'concept',
      references,
    });
  }

  // Index symbols
  for (const [symbol, definitions] of index.symbols) {
    const references: IndexEntry['references'] = [];

    for (const def of definitions) {
      const chapter = chapterMap.get(def.chapterId);
      references.push({
        chapterId: def.chapterId,
        chapterTitle: chapter?.title,
        chapterNumber: chapter ? chapter.order + 1 : undefined,
        isPrimary: true,
        anchor: `symbol-${symbol}-${def.snippetId}`,
      });
    }

    // Add usage locations
    const symbolRefs = index.symbolRefs.get(symbol) ?? [];
    const usedChapterIds = new Set<string>();
    for (const ref of symbolRefs) {
      if (!usedChapterIds.has(ref.chapterId)) {
        usedChapterIds.add(ref.chapterId);
        const chapter = chapterMap.get(ref.chapterId);
        references.push({
          chapterId: ref.chapterId,
          chapterTitle: chapter?.title,
          chapterNumber: chapter ? chapter.order + 1 : undefined,
          isPrimary: false,
        });
      }
    }

    references.sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));

    entries.push({
      term: symbol,
      type: 'symbol',
      references,
    });
  }

  // Index files
  for (const [filePath, fileEntry] of index.files) {
    const references: IndexEntry['references'] = [];

    // Sort chapters by order
    const sortedChapterIds = fileEntry.chapterIds.sort((a, b) => {
      const orderA = chapterMap.get(a)?.order ?? 0;
      const orderB = chapterMap.get(b)?.order ?? 0;
      return orderA - orderB;
    });

    for (let i = 0; i < sortedChapterIds.length; i++) {
      const chapterId = sortedChapterIds[i];
      const chapter = chapterMap.get(chapterId);
      references.push({
        chapterId,
        chapterTitle: chapter?.title,
        chapterNumber: chapter ? chapter.order + 1 : undefined,
        isPrimary: i === 0,
        anchor: `file-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
      });
    }

    entries.push({
      term: filePath,
      type: 'file',
      references,
    });
  }

  // Sort all entries alphabetically
  entries.sort((a, b) => a.term.localeCompare(b.term));

  return entries;
}

/**
 * File history for showing code evolution
 */
export interface FileHistory {
  /** File path */
  path: string;
  /** Chapters that modify this file in order */
  chapters: Array<{
    chapterId: string;
    chapterTitle?: string;
    chapterNumber: number;
    snippetIds: string[];
    operation: 'introduced' | 'modified';
  }>;
}

/**
 * Get the history of a file across chapters
 */
export function getFileHistory(
  filePath: string,
  snippets: Snippet[],
  chapters: ChapterInfo[]
): FileHistory | null {
  const chapterOrderMap = new Map(chapters.map((c) => [c.id, c.order]));
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  // Filter snippets for this file
  const fileSnippets = snippets
    .filter((s) => s.file === filePath)
    .sort((a, b) => {
      const orderA = chapterOrderMap.get(a.chapterId) ?? 0;
      const orderB = chapterOrderMap.get(b.chapterId) ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.order - b.order;
    });

  if (fileSnippets.length === 0) {
    return null;
  }

  // Group by chapter
  const chapterGroups = new Map<string, Snippet[]>();
  for (const snippet of fileSnippets) {
    const existing = chapterGroups.get(snippet.chapterId) ?? [];
    existing.push(snippet);
    chapterGroups.set(snippet.chapterId, existing);
  }

  // Build history
  const history: FileHistory['chapters'] = [];
  let isFirst = true;

  for (const [chapterId, chapterSnippets] of chapterGroups) {
    const chapter = chapterMap.get(chapterId);
    history.push({
      chapterId,
      chapterTitle: chapter?.title,
      chapterNumber: (chapter?.order ?? 0) + 1,
      snippetIds: chapterSnippets.map((s) => s.id),
      operation: isFirst ? 'introduced' : 'modified',
    });
    isFirst = false;
  }

  return {
    path: filePath,
    chapters: history,
  };
}

/**
 * Concept dependency chain for explaining prerequisites
 */
export interface ConceptChain {
  /** Target concept ID */
  conceptId: string;
  /** Concept name */
  conceptName: string;
  /** Prerequisites in learning order (topological) */
  prerequisites: Array<{
    conceptId: string;
    conceptName: string;
    depth: number;
  }>;
}

/**
 * Get the prerequisite chain for a concept
 */
export function getConceptChain(conceptId: string, concepts: Concept[]): ConceptChain | null {
  const concept = concepts.find((c) => c.id === conceptId);
  if (!concept) return null;

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const prerequisites: ConceptChain['prerequisites'] = [];
  const visited = new Set<string>();

  function collectPrereqs(id: string, depth: number): void {
    if (visited.has(id)) return;
    visited.add(id);

    const c = conceptMap.get(id);
    if (!c) return;

    // Collect deeper prerequisites first (post-order)
    for (const prereqId of c.prerequisites) {
      collectPrereqs(prereqId, depth + 1);
    }

    // Add this concept (but not the target)
    if (id !== conceptId) {
      prerequisites.push({
        conceptId: id,
        conceptName: c.name,
        depth,
      });
    }
  }

  // Start with the target concept's prerequisites
  for (const prereqId of concept.prerequisites) {
    collectPrereqs(prereqId, 1);
  }

  return {
    conceptId: concept.id,
    conceptName: concept.name,
    prerequisites,
  };
}

/**
 * Cross-reference link for rendering
 */
export interface CrossRefLink {
  /** Link text */
  text: string;
  /** Target type */
  targetType: 'concept' | 'symbol' | 'file' | 'checkpoint' | 'chapter';
  /** Target ID */
  targetId: string;
  /** Anchor within target */
  anchor?: string;
  /** Tooltip text */
  tooltip?: string;
}

/**
 * Generate cross-reference links for a piece of content
 */
export function generateLinks(
  content: string,
  index: CrossReferenceIndex,
  concepts: Concept[]
): CrossRefLink[] {
  const links: CrossRefLink[] = [];

  // Look for concept names in content
  for (const concept of concepts) {
    const regex = new RegExp(`\\b${escapeRegex(concept.name)}\\b`, 'gi');
    if (regex.test(content)) {
      const intro = index.concepts.get(concept.id);
      links.push({
        text: concept.name,
        targetType: 'concept',
        targetId: concept.id,
        anchor: `concept-${concept.id}`,
        tooltip: intro
          ? `${concept.name}: ${truncate(concept.definition, 100)} (Chapter ${intro.chapterNumber})`
          : `${concept.name}: ${truncate(concept.definition, 100)}`,
      });
    }
  }

  // Look for symbols
  for (const [symbol, definitions] of index.symbols) {
    const regex = new RegExp(`\\b${escapeRegex(symbol)}\\b`, 'g');
    if (regex.test(content)) {
      const def = definitions[0];
      const concept = concepts.find((c) => c.id === def?.conceptId);
      links.push({
        text: symbol,
        targetType: 'symbol',
        targetId: symbol,
        anchor: def ? `symbol-${symbol}-${def.snippetId}` : undefined,
        tooltip: concept ? `${symbol}: Explained in ${concept.name}` : symbol,
      });
    }
  }

  return links;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Truncate a string
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
