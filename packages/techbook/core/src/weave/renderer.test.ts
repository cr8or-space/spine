import { describe, it, expect } from 'vitest';
import {
  createBookRenderer,
  renderFile,
  renderTableOfContents,
} from './renderer';
import type { Concept, Snippet, Checkpoint, TangledFile } from '@repo/techbook-types';
import type { ChapterContent, TocEntry } from './renderer';

// Helper functions for creating test data
function makeConcept(
  id: string,
  name: string,
  type: Concept['type'] = 'term',
  introducedAt?: string
): Concept {
  return {
    id,
    entityType: 'concept',
    name,
    type,
    definition: `Definition of ${name}`,
    introducedAt,
    prerequisites: [],
    relatedSymbols: [],
    examples: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeSnippet(
  id: string,
  file: string,
  chapterId: string,
  code = 'const x = 1;',
  language = 'typescript'
): Snippet {
  return {
    id,
    entityType: 'snippet',
    name: `Snippet ${id}`,
    file,
    operation: 'introduce',
    language,
    code,
    chapterId,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeCheckpoint(id: string, name: string, chapterId: string): Checkpoint {
  return {
    id,
    entityType: 'checkpoint',
    name,
    description: `Checkpoint ${name}`,
    chapterId,
    status: 'validated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeChapterContent(
  id: string,
  title: string,
  number: number,
  snippets: Snippet[] = []
): ChapterContent {
  return {
    id,
    title,
    number,
    sections: [
      {
        id: `${id}-section-1`,
        heading: 'Introduction',
        content: 'Some content here.',
        snippetIds: snippets.map((s) => s.id),
      },
    ],
    snippets,
  };
}

function makeTangledFile(path: string, content: string): TangledFile {
  return {
    path,
    content,
    parts: [],
    sourceSnippetIds: [],
  };
}

describe('createBookRenderer', () => {
  it('should create a renderer', () => {
    const renderer = createBookRenderer('Test Book');

    expect(renderer.renderCode).toBeDefined();
    expect(renderer.renderSnippet).toBeDefined();
    expect(renderer.renderChapter).toBeDefined();
    expect(renderer.renderBook).toBeDefined();
  });
});

describe('renderCode', () => {
  it('should render code as HTML by default', () => {
    const renderer = createBookRenderer('Test');
    const html = renderer.renderCode('const x = 1;', 'typescript', { format: 'html' });

    expect(html).toContain('hl-keyword');
    expect(html).toContain('const');
  });

  it('should render code as markdown', () => {
    const renderer = createBookRenderer('Test');
    const md = renderer.renderCode('const x = 1;', 'typescript', { format: 'markdown' });

    expect(md).toContain('```typescript');
    expect(md).toContain('const x = 1;');
    expect(md).toContain('```');
  });

  it('should render code as ANSI', () => {
    const renderer = createBookRenderer('Test');
    const ansi = renderer.renderCode('const x = 1;', 'typescript', { format: 'ansi' });

    expect(ansi).toContain('\x1b[');
  });

  it('should render code as JSON', () => {
    const renderer = createBookRenderer('Test');
    const json = renderer.renderCode('const x = 1;', 'typescript', { format: 'json' });

    const parsed = JSON.parse(json);
    expect(parsed.language).toBe('typescript');
    expect(parsed.lines).toBeDefined();
  });

  it('should use custom class prefix', () => {
    const renderer = createBookRenderer('Test');
    const html = renderer.renderCode('const x = 1;', 'typescript', {
      format: 'html',
      classPrefix: 'code-',
    });

    expect(html).toContain('code-keyword');
  });
});

describe('renderSnippet', () => {
  it('should render a snippet with metadata', () => {
    const renderer = createBookRenderer('Test');
    const snippet = makeSnippet('s1', 'src/parser.ts', 'ch-1');

    const rendered = renderer.renderSnippet(snippet, { format: 'html' });

    expect(rendered.id).toBe('s1');
    expect(rendered.file).toBe('src/parser.ts');
    expect(rendered.language).toBe('typescript');
    expect(rendered.highlightedCode).toBeDefined();
  });

  it('should generate caption', () => {
    const renderer = createBookRenderer('Test');
    const snippet: Snippet = {
      ...makeSnippet('s1', 'src/parser.ts', 'ch-1'),
      part: 'parseExpression',
      operation: 'introduce',
    };

    const rendered = renderer.renderSnippet(snippet, { format: 'html' });

    expect(rendered.caption).toContain('src/parser.ts');
    expect(rendered.caption).toContain('parseExpression');
    expect(rendered.caption).toContain('introduce');
  });
});

describe('renderChapter', () => {
  it('should render chapter content', () => {
    const renderer = createBookRenderer('Test');
    const snippet = makeSnippet('s1', 'file.ts', 'ch-1');
    const chapter = makeChapterContent('ch-1', 'Getting Started', 1, [snippet]);
    const files: TangledFile[] = [];

    const rendered = renderer.renderChapter(chapter, files, { format: 'html' });

    expect(rendered.id).toBe('ch-1');
    expect(rendered.title).toBe('Getting Started');
    expect(rendered.number).toBe(1);
    expect(rendered.snippets).toHaveLength(1);
  });

  it('should include section headings', () => {
    const renderer = createBookRenderer('Test');
    const chapter = makeChapterContent('ch-1', 'Chapter 1', 1);

    const rendered = renderer.renderChapter(chapter, [], { format: 'html' });

    expect(rendered.content).toContain('<h2>');
    expect(rendered.content).toContain('Introduction');
  });

  it('should format headings for markdown', () => {
    const renderer = createBookRenderer('Test');
    const chapter = makeChapterContent('ch-1', 'Chapter 1', 1);

    const rendered = renderer.renderChapter(chapter, [], { format: 'markdown' });

    expect(rendered.content).toContain('## Introduction');
  });
});

describe('renderBook', () => {
  it('should render complete book', () => {
    const renderer = createBookRenderer('My Book');
    const concept = makeConcept('c1', 'Parser', 'type', 'ch-1');
    const snippet = makeSnippet('s1', 'parser.ts', 'ch-1');
    const checkpoint = makeCheckpoint('cp-1', 'Chapter 1 Complete', 'ch-1');
    const chapter = makeChapterContent('ch-1', 'Chapter 1', 1, [snippet]);
    const files = [makeTangledFile('parser.ts', 'const x = 1;')];

    const book = renderer.renderBook(
      [chapter],
      [concept],
      [snippet],
      [],
      [checkpoint],
      files,
      { format: 'html' }
    );

    expect(book.title).toBe('My Book');
    expect(book.chapters).toHaveLength(1);
    expect(book.glossary.length).toBeGreaterThanOrEqual(1);
    expect(book.toc).toHaveLength(1);
  });

  it('should calculate metadata', () => {
    const renderer = createBookRenderer('My Book');
    const chapter = makeChapterContent('ch-1', 'Chapter 1', 1);

    const book = renderer.renderBook(
      [chapter],
      [],
      [],
      [],
      [],
      [],
      { format: 'html' }
    );

    expect(book.metadata.wordCount).toBeGreaterThan(0);
    expect(book.metadata.generatedAt).toBeDefined();
  });

  it('should generate table of contents', () => {
    const renderer = createBookRenderer('My Book');
    const chapter1 = makeChapterContent('ch-1', 'Introduction', 1);
    const chapter2 = makeChapterContent('ch-2', 'Getting Started', 2);

    const book = renderer.renderBook(
      [chapter1, chapter2],
      [],
      [],
      [],
      [],
      [],
      { format: 'html' }
    );

    expect(book.toc).toHaveLength(2);
    expect(book.toc[0].title).toBe('Introduction');
    expect(book.toc[1].title).toBe('Getting Started');
  });

  it('should build cross-reference index', () => {
    const renderer = createBookRenderer('My Book');
    const concept = makeConcept('c1', 'Parser', 'type', 'ch-1');
    const chapter = makeChapterContent('ch-1', 'Chapter 1', 1);

    renderer.renderBook(
      [chapter],
      [concept],
      [],
      [],
      [],
      [],
      { format: 'html' }
    );

    const index = renderer.getCrossRefIndex();
    expect(index).toBeDefined();
  });
});

describe('renderCheckpointDiff', () => {
  it('should render diff between checkpoints', () => {
    const renderer = createBookRenderer('Test');
    const fromFiles = [makeTangledFile('file.ts', 'old content')];
    const toFiles = [makeTangledFile('file.ts', 'new content')];

    const diff = renderer.renderCheckpointDiff(
      fromFiles,
      toFiles,
      'cp-1',
      'cp-2',
      { format: 'html' }
    );

    expect(diff).toContain('diff-');
    expect(diff).toContain('file.ts');
  });

  it('should render diff as markdown', () => {
    const renderer = createBookRenderer('Test');
    const fromFiles: TangledFile[] = [];
    const toFiles = [makeTangledFile('new.ts', 'content')];

    const diff = renderer.renderCheckpointDiff(
      fromFiles,
      toFiles,
      'cp-1',
      'cp-2',
      { format: 'markdown' }
    );

    expect(diff).toContain('```diff');
  });
});

describe('renderGlossary', () => {
  it('should render glossary as HTML', () => {
    const renderer = createBookRenderer('Test');
    const concept = makeConcept('c1', 'Parser', 'type', 'ch-1');
    const chapter = makeChapterContent('ch-1', 'Chapter 1', 1);

    const book = renderer.renderBook(
      [chapter],
      [concept],
      [],
      [],
      [],
      [],
      { format: 'html' }
    );

    const html = renderer.renderGlossary(book.glossary, { format: 'html' });

    expect(html).toContain('<dl');
    expect(html).toContain('Parser');
  });

  it('should render glossary as markdown', () => {
    const renderer = createBookRenderer('Test');
    const concept = makeConcept('c1', 'Parser', 'type', 'ch-1');
    const chapter = makeChapterContent('ch-1', 'Chapter 1', 1);

    const book = renderer.renderBook(
      [chapter],
      [concept],
      [],
      [],
      [],
      [],
      { format: 'html' }
    );

    const md = renderer.renderGlossary(book.glossary, { format: 'markdown' });

    expect(md).toContain('**Parser**');
  });
});

describe('renderIndex', () => {
  it('should render index as HTML', () => {
    const renderer = createBookRenderer('Test');
    const concept = makeConcept('c1', 'Parser', 'type', 'ch-1');
    const chapter = makeChapterContent('ch-1', 'Chapter 1', 1);

    const book = renderer.renderBook(
      [chapter],
      [concept],
      [],
      [],
      [],
      [],
      { format: 'html' }
    );

    const html = renderer.renderIndex(book.index, { format: 'html' });

    expect(html).toContain('<ul');
    expect(html).toContain('Parser');
  });
});

describe('renderFile', () => {
  it('should render a tangled file', () => {
    const file = makeTangledFile('parser.ts', 'const x = 1;');

    const html = renderFile(file, [], { format: 'html' });

    expect(html).toContain('parser.ts');
    expect(html).toContain('const');
  });

  it('should include file history when requested', () => {
    const file = makeTangledFile('parser.ts', 'const x = 1;');
    const snippet = makeSnippet('s1', 'parser.ts', 'ch-1');

    const html = renderFile(file, [snippet], {
      format: 'html',
      includeHistory: true,
      chapters: [{ id: 'ch-1', title: 'Chapter 1', order: 0 }],
    });

    expect(html).toContain('History');
    expect(html).toContain('Chapter 1');
  });

  it('should skip header when requested', () => {
    const file = makeTangledFile('parser.ts', 'const x = 1;');

    const html = renderFile(file, [], { format: 'html', includeHeader: false });

    expect(html).not.toContain('file-header');
  });
});

describe('renderTableOfContents', () => {
  const toc: TocEntry[] = [
    {
      title: 'Introduction',
      number: 1,
      chapterId: 'ch-1',
      sections: [{ title: 'Overview', sectionId: 'sec-1' }],
    },
    {
      title: 'Getting Started',
      number: 2,
      chapterId: 'ch-2',
      sections: [],
    },
  ];

  it('should render TOC as HTML', () => {
    const html = renderTableOfContents(toc, { format: 'html' });

    expect(html).toContain('<nav');
    expect(html).toContain('Introduction');
    expect(html).toContain('Getting Started');
    expect(html).toContain('Overview');
  });

  it('should render TOC as markdown', () => {
    const md = renderTableOfContents(toc, { format: 'markdown' });

    expect(md).toContain('1. **Introduction**');
    expect(md).toContain('2. **Getting Started**');
    expect(md).toContain('- Overview');
  });

  it('should render TOC as ANSI', () => {
    const ansi = renderTableOfContents(toc, { format: 'ansi' });

    expect(ansi).toContain('1. Introduction');
    expect(ansi).toContain('• Overview');
  });

  it('should render TOC as JSON', () => {
    const json = renderTableOfContents(toc, { format: 'json' });
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].title).toBe('Introduction');
  });
});
