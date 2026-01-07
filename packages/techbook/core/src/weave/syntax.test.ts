import { describe, it, expect } from 'vitest';
import {
  highlight,
  highlightSnippet,
  detectLanguage,
  getLanguageRules,
  toHtml,
  toAnsi,
  toPlainTextWithMarkers,
  countTokensByType,
  getUniqueTokens,
  DEFAULT_LANGUAGE_MAPPINGS,
  DEFAULT_LANGUAGE_RULES,
} from './syntax';
import type { Snippet } from '@repo/techbook-types';

describe('detectLanguage', () => {
  it('should detect TypeScript from .ts extension', () => {
    expect(detectLanguage('src/parser.ts')).toBe('typescript');
  });

  it('should detect TypeScript from .tsx extension', () => {
    expect(detectLanguage('components/App.tsx')).toBe('typescript');
  });

  it('should detect JavaScript from .js extension', () => {
    expect(detectLanguage('index.js')).toBe('javascript');
  });

  it('should detect Python from .py extension', () => {
    expect(detectLanguage('main.py')).toBe('python');
  });

  it('should detect Rust from .rs extension', () => {
    expect(detectLanguage('main.rs')).toBe('rust');
  });

  it('should detect Go from .go extension', () => {
    expect(detectLanguage('main.go')).toBe('go');
  });

  it('should return undefined for unknown extensions', () => {
    expect(detectLanguage('file.xyz')).toBeUndefined();
  });

  it('should handle files without extensions', () => {
    expect(detectLanguage('Makefile')).toBeUndefined();
  });

  it('should be case-insensitive for extensions', () => {
    expect(detectLanguage('file.TS')).toBe('typescript');
    expect(detectLanguage('file.Py')).toBe('python');
  });

  it('should use custom mappings when provided', () => {
    const customMappings = [{ extensions: ['custom'], language: 'custom-lang' }];
    expect(detectLanguage('file.custom', customMappings)).toBe('custom-lang');
  });
});

describe('getLanguageRules', () => {
  it('should return rules for TypeScript', () => {
    const rules = getLanguageRules('typescript');
    expect(rules).toBeDefined();
    expect(rules?.keywords).toContain('const');
    expect(rules?.keywords).toContain('interface');
    expect(rules?.keywords).toContain('type');
  });

  it('should return rules for JavaScript', () => {
    const rules = getLanguageRules('javascript');
    expect(rules).toBeDefined();
    expect(rules?.keywords).toContain('const');
    expect(rules?.keywords).toContain('function');
  });

  it('should return rules for Python', () => {
    const rules = getLanguageRules('python');
    expect(rules).toBeDefined();
    expect(rules?.keywords).toContain('def');
    expect(rules?.keywords).toContain('class');
    expect(rules?.lineComment).toBe('#');
  });

  it('should return rules for Rust', () => {
    const rules = getLanguageRules('rust');
    expect(rules).toBeDefined();
    expect(rules?.keywords).toContain('fn');
    expect(rules?.keywords).toContain('impl');
    expect(rules?.keywords).toContain('struct');
  });

  it('should return rules for Go', () => {
    const rules = getLanguageRules('go');
    expect(rules).toBeDefined();
    expect(rules?.keywords).toContain('func');
    expect(rules?.keywords).toContain('go');
  });

  it('should return undefined for unknown language', () => {
    expect(getLanguageRules('unknown-lang')).toBeUndefined();
  });

  it('should be case-insensitive', () => {
    expect(getLanguageRules('TypeScript')).toBeDefined();
    expect(getLanguageRules('PYTHON')).toBeDefined();
  });

  it('should merge custom rules', () => {
    const customRules = {
      'my-lang': {
        keywords: ['custom', 'keywords'],
        lineComment: '//',
      },
    };
    const rules = getLanguageRules('my-lang', customRules);
    expect(rules).toBeDefined();
    expect(rules?.keywords).toContain('custom');
  });
});

describe('highlight', () => {
  it('should highlight TypeScript code', () => {
    const code = 'const x: number = 42;';
    const result = highlight(code, 'typescript');

    expect(result.language).toBe('typescript');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lineNumber).toBe(1);
    expect(result.lines[0].raw).toBe(code);

    // Should have keyword token for 'const'
    const constToken = result.lines[0].tokens.find((t) => t.text === 'const');
    expect(constToken).toBeDefined();
    expect(constToken?.type).toBe('keyword');

    // Should have number token for '42'
    const numberToken = result.lines[0].tokens.find((t) => t.text === '42');
    expect(numberToken).toBeDefined();
    expect(numberToken?.type).toBe('number');
  });

  it('should highlight multi-line code', () => {
    const code = `function add(a, b) {
  return a + b;
}`;
    const result = highlight(code, 'javascript');

    expect(result.lines).toHaveLength(3);
    expect(result.lines[0].lineNumber).toBe(1);
    expect(result.lines[1].lineNumber).toBe(2);
    expect(result.lines[2].lineNumber).toBe(3);
  });

  it('should highlight strings', () => {
    const code = 'const msg = "hello world";';
    const result = highlight(code, 'typescript');

    const stringToken = result.lines[0].tokens.find((t) => t.text === '"hello world"');
    expect(stringToken).toBeDefined();
    expect(stringToken?.type).toBe('string');
  });

  it('should highlight comments', () => {
    const code = '// This is a comment';
    const result = highlight(code, 'typescript');

    const commentToken = result.lines[0].tokens.find((t) => t.type === 'comment');
    expect(commentToken).toBeDefined();
    expect(commentToken?.text).toContain('This is a comment');
  });

  it('should highlight Python comments', () => {
    const code = '# Python comment';
    const result = highlight(code, 'python');

    const commentToken = result.lines[0].tokens.find((t) => t.type === 'comment');
    expect(commentToken).toBeDefined();
  });

  it('should highlight function calls', () => {
    const code = 'console.log("test")';
    const result = highlight(code, 'javascript');

    const funcToken = result.lines[0].tokens.find((t) => t.text === 'log');
    expect(funcToken).toBeDefined();
    expect(funcToken?.type).toBe('function');
  });

  it('should handle unknown language gracefully', () => {
    const code = 'some text here';
    const result = highlight(code, 'unknown-lang');

    expect(result.language).toBe('unknown-lang');
    expect(result.lines).toHaveLength(1);
    // Should produce text tokens when no rules
    expect(result.lines[0].tokens[0].type).toBe('text');
  });

  it('should highlight operators', () => {
    const code = 'a + b === c';
    const result = highlight(code, 'typescript');

    const tokens = result.lines[0].tokens;
    const opTokens = tokens.filter((t) => t.type === 'operator');
    expect(opTokens.length).toBeGreaterThanOrEqual(1);
  });

  it('should highlight type annotations', () => {
    const code = 'const x: string = "hello";';
    const result = highlight(code, 'typescript');

    const typeToken = result.lines[0].tokens.find((t) => t.text === 'string');
    expect(typeToken).toBeDefined();
    expect(typeToken?.type).toBe('type');
  });
});

describe('highlightSnippet', () => {
  it('should highlight a snippet and include snippet ID', () => {
    const snippet: Snippet = {
      id: 'snip-1',
      entityType: 'snippet',
      name: 'Test snippet',
      file: 'src/test.ts',
      operation: 'introduce',
      language: 'typescript',
      code: 'const x = 1;',
      chapterId: 'ch-1',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = highlightSnippet(snippet);

    expect(result.language).toBe('typescript');
    expect(result.snippetId).toBe('snip-1');
    expect(result.lines).toHaveLength(1);
  });
});

describe('toHtml', () => {
  it('should convert highlighted code to HTML', () => {
    const result = highlight('const x = 1;', 'typescript');
    const html = toHtml(result);

    expect(html).toContain('hl-keyword');
    expect(html).toContain('hl-number');
    expect(html).toContain('const');
  });

  it('should include line numbers when requested', () => {
    const result = highlight('line1\nline2', 'typescript');
    const html = toHtml(result, { lineNumbers: true });

    expect(html).toContain('hl-line-number');
    expect(html).toContain('1');
    expect(html).toContain('2');
  });

  it('should use custom class prefix', () => {
    const result = highlight('const x = 1;', 'typescript');
    const html = toHtml(result, { classPrefix: 'code-' });

    expect(html).toContain('code-keyword');
  });

  it('should highlight specific lines', () => {
    const result = highlight('line1\nline2\nline3', 'typescript');
    const html = toHtml(result, { highlightLines: [2] });

    expect(html).toContain('highlighted');
  });

  it('should escape HTML entities', () => {
    const result = highlight('const x = "<div>";', 'typescript');
    const html = toHtml(result);

    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
    expect(html).not.toContain('><div>');
  });

  it('should use custom start line', () => {
    const result = highlight('line', 'typescript');
    const html = toHtml(result, { lineNumbers: true, startLine: 10 });

    expect(html).toContain('10');
  });
});

describe('toAnsi', () => {
  it('should convert highlighted code to ANSI colored output', () => {
    const result = highlight('const x = 1;', 'typescript');
    const ansi = toAnsi(result);

    // Should contain ANSI escape codes
    expect(ansi).toContain('\x1b[');
  });

  it('should include reset codes', () => {
    const result = highlight('const x = 1;', 'typescript');
    const ansi = toAnsi(result);

    expect(ansi).toContain('\x1b[0m');
  });
});

describe('toPlainTextWithMarkers', () => {
  it('should return plain text without formatting', () => {
    const result = highlight('const x = 1;', 'typescript');
    const plain = toPlainTextWithMarkers(result);

    expect(plain).toBe('const x = 1;');
  });

  it('should preserve newlines', () => {
    const code = 'line1\nline2\nline3';
    const result = highlight(code, 'typescript');
    const plain = toPlainTextWithMarkers(result);

    expect(plain).toBe(code);
  });
});

describe('countTokensByType', () => {
  it('should count tokens by type', () => {
    const result = highlight('const x = 1; // comment', 'typescript');
    const counts = countTokensByType(result);

    expect(counts.keyword).toBeGreaterThanOrEqual(1);
    expect(counts.number).toBeGreaterThanOrEqual(1);
    expect(counts.comment).toBeGreaterThanOrEqual(1);
  });

  it('should return zero for unused types', () => {
    const result = highlight('x', 'typescript');
    const counts = countTokensByType(result);

    expect(counts.string).toBe(0);
  });
});

describe('getUniqueTokens', () => {
  it('should get unique tokens of a specific type', () => {
    const result = highlight('const x = 1; const y = 2;', 'typescript');
    const keywords = getUniqueTokens(result, 'keyword');

    expect(keywords).toContain('const');
    expect(keywords).toHaveLength(1); // Only one unique keyword
  });

  it('should return sorted tokens', () => {
    const result = highlight('let b = 1; const a = 2;', 'typescript');
    const keywords = getUniqueTokens(result, 'keyword');

    expect(keywords[0]).toBe('const');
    expect(keywords[1]).toBe('let');
  });

  it('should return empty array for unused type', () => {
    const result = highlight('x', 'typescript');
    const strings = getUniqueTokens(result, 'string');

    expect(strings).toHaveLength(0);
  });
});

describe('DEFAULT_LANGUAGE_MAPPINGS', () => {
  it('should include common file extensions', () => {
    const allExtensions = DEFAULT_LANGUAGE_MAPPINGS.flatMap((m) => m.extensions);

    expect(allExtensions).toContain('ts');
    expect(allExtensions).toContain('js');
    expect(allExtensions).toContain('py');
    expect(allExtensions).toContain('rs');
    expect(allExtensions).toContain('go');
  });
});

describe('DEFAULT_LANGUAGE_RULES', () => {
  it('should include rules for common languages', () => {
    expect(DEFAULT_LANGUAGE_RULES.typescript).toBeDefined();
    expect(DEFAULT_LANGUAGE_RULES.javascript).toBeDefined();
    expect(DEFAULT_LANGUAGE_RULES.python).toBeDefined();
    expect(DEFAULT_LANGUAGE_RULES.rust).toBeDefined();
    expect(DEFAULT_LANGUAGE_RULES.go).toBeDefined();
  });
});
