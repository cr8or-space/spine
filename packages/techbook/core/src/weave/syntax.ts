/**
 * Syntax highlighting for code blocks.
 *
 * Provides lightweight syntax highlighting with language detection
 * and token-based markup. Designed to produce format-agnostic output
 * that can be rendered to HTML, ANSI, or other formats.
 */

import type { Snippet } from '@repo/techbook-types';

/**
 * Token types for syntax highlighting
 */
export type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'operator'
  | 'punctuation'
  | 'identifier'
  | 'type'
  | 'function'
  | 'property'
  | 'text';

/**
 * A highlighted token
 */
export interface HighlightToken {
  /** Token type for styling */
  type: TokenType;
  /** Token text content */
  text: string;
  /** Start column (1-based) */
  column: number;
}

/**
 * A line of highlighted code
 */
export interface HighlightedLine {
  /** Line number (1-based) */
  lineNumber: number;
  /** Tokens in this line */
  tokens: HighlightToken[];
  /** Raw text of the line */
  raw: string;
}

/**
 * Result of highlighting a code block
 */
export interface HighlightResult {
  /** Language used for highlighting */
  language: string;
  /** Highlighted lines */
  lines: HighlightedLine[];
  /** Source snippet ID (if from a snippet) */
  snippetId?: string;
}

/**
 * Language detection from file extension
 */
export interface LanguageMapping {
  /** File extensions (without dot) */
  extensions: string[];
  /** Language identifier */
  language: string;
}

/**
 * Language rules for highlighting
 */
export interface LanguageRules {
  /** Keywords */
  keywords: string[];
  /** Type keywords (classes, interfaces, etc.) */
  types?: string[];
  /** Single-line comment prefix */
  lineComment?: string;
  /** Block comment delimiters */
  blockComment?: { start: string; end: string };
  /** String delimiters */
  strings?: string[];
  /** Operators */
  operators?: string[];
}

/**
 * Default language mappings
 */
export const DEFAULT_LANGUAGE_MAPPINGS: LanguageMapping[] = [
  { extensions: ['ts', 'tsx'], language: 'typescript' },
  { extensions: ['js', 'jsx', 'mjs', 'cjs'], language: 'javascript' },
  { extensions: ['py', 'pyw'], language: 'python' },
  { extensions: ['rs'], language: 'rust' },
  { extensions: ['go'], language: 'go' },
  { extensions: ['java'], language: 'java' },
  { extensions: ['rb'], language: 'ruby' },
  { extensions: ['c', 'h'], language: 'c' },
  { extensions: ['cpp', 'cc', 'cxx', 'hpp', 'hxx'], language: 'cpp' },
  { extensions: ['cs'], language: 'csharp' },
  { extensions: ['sh', 'bash', 'zsh'], language: 'shell' },
  { extensions: ['json'], language: 'json' },
  { extensions: ['yaml', 'yml'], language: 'yaml' },
  { extensions: ['md', 'markdown'], language: 'markdown' },
  { extensions: ['html', 'htm'], language: 'html' },
  { extensions: ['css'], language: 'css' },
  { extensions: ['sql'], language: 'sql' },
  { extensions: ['toml'], language: 'toml' },
];

/**
 * Default language rules for common languages
 */
export const DEFAULT_LANGUAGE_RULES: Record<string, LanguageRules> = {
  typescript: {
    keywords: [
      'async',
      'await',
      'break',
      'case',
      'catch',
      'class',
      'const',
      'continue',
      'debugger',
      'default',
      'delete',
      'do',
      'else',
      'enum',
      'export',
      'extends',
      'false',
      'finally',
      'for',
      'from',
      'function',
      'if',
      'implements',
      'import',
      'in',
      'instanceof',
      'interface',
      'let',
      'new',
      'null',
      'of',
      'private',
      'protected',
      'public',
      'readonly',
      'return',
      'static',
      'super',
      'switch',
      'this',
      'throw',
      'true',
      'try',
      'type',
      'typeof',
      'undefined',
      'var',
      'void',
      'while',
      'with',
      'yield',
      'as',
      'is',
      'keyof',
      'namespace',
      'module',
      'declare',
      'abstract',
      'override',
    ],
    types: [
      'string',
      'number',
      'boolean',
      'object',
      'any',
      'unknown',
      'never',
      'void',
      'Array',
      'Promise',
      'Map',
      'Set',
      'Record',
      'Partial',
      'Required',
      'Readonly',
      'Pick',
      'Omit',
    ],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    strings: ['"', "'", '`'],
    operators: [
      '=>',
      '===',
      '!==',
      '==',
      '!=',
      '<=',
      '>=',
      '&&',
      '||',
      '??',
      '?.',
      '!.',
      '++',
      '--',
      '+=',
      '-=',
      '*=',
      '/=',
      '...',
      '+',
      '-',
      '*',
      '/',
      '%',
      '<',
      '>',
      '=',
      '!',
      '&',
      '|',
      '^',
      '~',
      ':',
      '?',
    ],
  },
  javascript: {
    keywords: [
      'async',
      'await',
      'break',
      'case',
      'catch',
      'class',
      'const',
      'continue',
      'debugger',
      'default',
      'delete',
      'do',
      'else',
      'export',
      'extends',
      'false',
      'finally',
      'for',
      'from',
      'function',
      'if',
      'import',
      'in',
      'instanceof',
      'let',
      'new',
      'null',
      'of',
      'return',
      'static',
      'super',
      'switch',
      'this',
      'throw',
      'true',
      'try',
      'typeof',
      'undefined',
      'var',
      'void',
      'while',
      'with',
      'yield',
    ],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    strings: ['"', "'", '`'],
    operators: [
      '=>',
      '===',
      '!==',
      '==',
      '!=',
      '<=',
      '>=',
      '&&',
      '||',
      '??',
      '++',
      '--',
      '+=',
      '-=',
      '*=',
      '/=',
      '...',
      '+',
      '-',
      '*',
      '/',
      '%',
      '<',
      '>',
      '=',
      '!',
      '&',
      '|',
      '^',
      '~',
      ':',
      '?',
    ],
  },
  python: {
    keywords: [
      'False',
      'None',
      'True',
      'and',
      'as',
      'assert',
      'async',
      'await',
      'break',
      'class',
      'continue',
      'def',
      'del',
      'elif',
      'else',
      'except',
      'finally',
      'for',
      'from',
      'global',
      'if',
      'import',
      'in',
      'is',
      'lambda',
      'nonlocal',
      'not',
      'or',
      'pass',
      'raise',
      'return',
      'try',
      'while',
      'with',
      'yield',
    ],
    types: ['int', 'str', 'float', 'bool', 'list', 'dict', 'tuple', 'set', 'bytes', 'type'],
    lineComment: '#',
    strings: ['"', "'", '"""', "'''"],
    operators: [
      '==',
      '!=',
      '<=',
      '>=',
      '**',
      '//',
      '+=',
      '-=',
      '*=',
      '/=',
      '->',
      '+',
      '-',
      '*',
      '/',
      '%',
      '<',
      '>',
      '=',
      '@',
      ':',
    ],
  },
  rust: {
    keywords: [
      'as',
      'async',
      'await',
      'break',
      'const',
      'continue',
      'crate',
      'dyn',
      'else',
      'enum',
      'extern',
      'false',
      'fn',
      'for',
      'if',
      'impl',
      'in',
      'let',
      'loop',
      'match',
      'mod',
      'move',
      'mut',
      'pub',
      'ref',
      'return',
      'self',
      'Self',
      'static',
      'struct',
      'super',
      'trait',
      'true',
      'type',
      'unsafe',
      'use',
      'where',
      'while',
    ],
    types: [
      'i8',
      'i16',
      'i32',
      'i64',
      'i128',
      'isize',
      'u8',
      'u16',
      'u32',
      'u64',
      'u128',
      'usize',
      'f32',
      'f64',
      'bool',
      'char',
      'str',
      'String',
      'Option',
      'Result',
      'Vec',
      'Box',
      'Rc',
      'Arc',
    ],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    strings: ['"', "'"],
    operators: [
      '=>',
      '->',
      '==',
      '!=',
      '<=',
      '>=',
      '&&',
      '||',
      '..=',
      '..',
      '::',
      '+=',
      '-=',
      '*=',
      '/=',
      '+',
      '-',
      '*',
      '/',
      '%',
      '<',
      '>',
      '=',
      '!',
      '&',
      '|',
      '^',
      '?',
    ],
  },
  go: {
    keywords: [
      'break',
      'case',
      'chan',
      'const',
      'continue',
      'default',
      'defer',
      'else',
      'fallthrough',
      'for',
      'func',
      'go',
      'goto',
      'if',
      'import',
      'interface',
      'map',
      'package',
      'range',
      'return',
      'select',
      'struct',
      'switch',
      'type',
      'var',
      'true',
      'false',
      'nil',
    ],
    types: [
      'int',
      'int8',
      'int16',
      'int32',
      'int64',
      'uint',
      'uint8',
      'uint16',
      'uint32',
      'uint64',
      'uintptr',
      'float32',
      'float64',
      'complex64',
      'complex128',
      'byte',
      'rune',
      'string',
      'bool',
      'error',
    ],
    lineComment: '//',
    blockComment: { start: '/*', end: '*/' },
    strings: ['"', '`', "'"],
    operators: [
      ':=',
      '==',
      '!=',
      '<=',
      '>=',
      '&&',
      '||',
      '<-',
      '++',
      '--',
      '+=',
      '-=',
      '*=',
      '/=',
      '...',
      '+',
      '-',
      '*',
      '/',
      '%',
      '<',
      '>',
      '=',
      '!',
      '&',
      '|',
      '^',
      ':',
    ],
  },
  json: {
    keywords: ['true', 'false', 'null'],
    strings: ['"'],
    operators: [':', ','],
  },
  shell: {
    keywords: [
      'if',
      'then',
      'else',
      'elif',
      'fi',
      'case',
      'esac',
      'for',
      'while',
      'until',
      'do',
      'done',
      'in',
      'function',
      'return',
      'exit',
      'local',
      'export',
      'source',
      'alias',
      'unalias',
      'set',
      'unset',
      'readonly',
      'declare',
      'typeset',
      'shift',
      'break',
      'continue',
      'trap',
    ],
    lineComment: '#',
    strings: ['"', "'"],
    operators: ['||', '&&', '|', '&', '>', '<', '>>', '<<', '=', '==', '!=', '-eq', '-ne', '-lt', '-gt', '-le', '-ge'],
  },
};

/**
 * Detect language from file extension
 */
export function detectLanguage(
  filePath: string,
  mappings: LanguageMapping[] = DEFAULT_LANGUAGE_MAPPINGS
): string | undefined {
  const extension = filePath.split('.').pop()?.toLowerCase();
  if (!extension) return undefined;

  const mapping = mappings.find((m) => m.extensions.includes(extension));
  return mapping?.language;
}

/**
 * Get language rules for a language
 */
export function getLanguageRules(
  language: string,
  customRules?: Record<string, LanguageRules>
): LanguageRules | undefined {
  const allRules = customRules ? { ...DEFAULT_LANGUAGE_RULES, ...customRules } : DEFAULT_LANGUAGE_RULES;
  return allRules[language.toLowerCase()];
}

/**
 * Tokenize a line of code based on language rules
 */
function tokenizeLine(line: string, rules: LanguageRules): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let pos = 0;

  // Create regex patterns
  const keywordSet = new Set(rules.keywords);
  const typeSet = new Set(rules.types ?? []);
  const operatorPattern = rules.operators?.length
    ? new RegExp(
        `^(${rules.operators.map((op) => op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`
      )
    : null;

  // Check for line comment at start (accounting for leading whitespace)
  if (rules.lineComment) {
    const trimmedStart = line.search(/\S/);
    if (trimmedStart >= 0 && line.substring(trimmedStart).startsWith(rules.lineComment)) {
      // Leading whitespace
      if (trimmedStart > 0) {
        tokens.push({
          type: 'text',
          text: line.substring(0, trimmedStart),
          column: 1,
        });
      }
      // Comment
      tokens.push({
        type: 'comment',
        text: line.substring(trimmedStart),
        column: trimmedStart + 1,
      });
      return tokens;
    }
  }

  while (pos < line.length) {
    const char = line[pos];
    const remaining = line.substring(pos);

    // Skip whitespace
    if (/\s/.test(char)) {
      let end = pos + 1;
      while (end < line.length && /\s/.test(line[end])) {
        end++;
      }
      tokens.push({
        type: 'text',
        text: line.substring(pos, end),
        column: pos + 1,
      });
      pos = end;
      continue;
    }

    // Check for line comment
    if (rules.lineComment && remaining.startsWith(rules.lineComment)) {
      tokens.push({
        type: 'comment',
        text: remaining,
        column: pos + 1,
      });
      break;
    }

    // Check for block comment start
    if (rules.blockComment && remaining.startsWith(rules.blockComment.start)) {
      const endIndex = remaining.indexOf(rules.blockComment.end, rules.blockComment.start.length);
      if (endIndex >= 0) {
        const commentText = remaining.substring(0, endIndex + rules.blockComment.end.length);
        tokens.push({
          type: 'comment',
          text: commentText,
          column: pos + 1,
        });
        pos += commentText.length;
      } else {
        // Comment extends to end of line
        tokens.push({
          type: 'comment',
          text: remaining,
          column: pos + 1,
        });
        break;
      }
      continue;
    }

    // Check for strings
    if (rules.strings) {
      let matched = false;
      for (const delim of rules.strings.sort((a, b) => b.length - a.length)) {
        if (remaining.startsWith(delim)) {
          let end = delim.length;
          let escaped = false;

          // Find closing delimiter
          while (end < remaining.length) {
            if (escaped) {
              escaped = false;
              end++;
              continue;
            }
            if (remaining[end] === '\\') {
              escaped = true;
              end++;
              continue;
            }
            if (remaining.substring(end).startsWith(delim)) {
              end += delim.length;
              break;
            }
            end++;
          }

          tokens.push({
            type: 'string',
            text: remaining.substring(0, end),
            column: pos + 1,
          });
          pos += end;
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }

    // Check for numbers
    const numberMatch = remaining.match(/^-?(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+\.?\d*(?:[eE][+-]?\d+)?)/);
    if (numberMatch) {
      tokens.push({
        type: 'number',
        text: numberMatch[0],
        column: pos + 1,
      });
      pos += numberMatch[0].length;
      continue;
    }

    // Check for operators
    if (operatorPattern) {
      const opMatch = remaining.match(operatorPattern);
      if (opMatch) {
        tokens.push({
          type: 'operator',
          text: opMatch[0],
          column: pos + 1,
        });
        pos += opMatch[0].length;
        continue;
      }
    }

    // Check for identifiers (including keywords)
    const identMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (identMatch) {
      const text = identMatch[0];
      let type: TokenType = 'identifier';

      if (keywordSet.has(text)) {
        type = 'keyword';
      } else if (typeSet.has(text)) {
        type = 'type';
      } else if (remaining[text.length] === '(') {
        type = 'function';
      }

      tokens.push({
        type,
        text,
        column: pos + 1,
      });
      pos += text.length;
      continue;
    }

    // Check for punctuation
    if (/[{}()[\];,.]/.test(char)) {
      tokens.push({
        type: 'punctuation',
        text: char,
        column: pos + 1,
      });
      pos++;
      continue;
    }

    // Default: treat as text
    tokens.push({
      type: 'text',
      text: char,
      column: pos + 1,
    });
    pos++;
  }

  return tokens;
}

/**
 * Highlight a block of code
 */
export function highlight(
  code: string,
  language: string,
  customRules?: Record<string, LanguageRules>
): HighlightResult {
  const rules = getLanguageRules(language, customRules);
  const lines = code.split('\n');

  const highlightedLines: HighlightedLine[] = lines.map((line, index) => {
    const tokens = rules
      ? tokenizeLine(line, rules)
      : [{ type: 'text' as TokenType, text: line, column: 1 }];

    return {
      lineNumber: index + 1,
      tokens,
      raw: line,
    };
  });

  return {
    language,
    lines: highlightedLines,
  };
}

/**
 * Highlight a snippet
 */
export function highlightSnippet(
  snippet: Snippet,
  customRules?: Record<string, LanguageRules>
): HighlightResult {
  const result = highlight(snippet.code, snippet.language, customRules);
  return {
    ...result,
    snippetId: snippet.id,
  };
}

/**
 * Convert highlighted code to plain text with markers
 */
export function toPlainTextWithMarkers(result: HighlightResult): string {
  return result.lines
    .map((line) => line.tokens.map((t) => t.text).join(''))
    .join('\n');
}

/**
 * Options for HTML rendering
 */
export interface HtmlRenderOptions {
  /** CSS class prefix for token types */
  classPrefix?: string;
  /** Include line numbers */
  lineNumbers?: boolean;
  /** Start line number (for offset) */
  startLine?: number;
  /** Lines to highlight (1-based) */
  highlightLines?: number[];
  /** Custom class for highlighted lines */
  highlightClass?: string;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert highlighted code to HTML
 */
export function toHtml(result: HighlightResult, options: HtmlRenderOptions = {}): string {
  const {
    classPrefix = 'hl-',
    lineNumbers = false,
    startLine = 1,
    highlightLines = [],
    highlightClass = 'highlighted',
  } = options;

  const highlightSet = new Set(highlightLines);

  const lineHtml = result.lines.map((line, idx) => {
    const actualLineNum = startLine + idx;
    const isHighlighted = highlightSet.has(line.lineNumber);

    const tokenHtml = line.tokens
      .map((token) => {
        if (token.type === 'text') {
          return escapeHtml(token.text);
        }
        return `<span class="${classPrefix}${token.type}">${escapeHtml(token.text)}</span>`;
      })
      .join('');

    const lineClass = isHighlighted ? ` class="${highlightClass}"` : '';

    if (lineNumbers) {
      return `<span${lineClass}><span class="${classPrefix}line-number">${actualLineNum}</span>${tokenHtml}</span>`;
    }

    return isHighlighted ? `<span${lineClass}>${tokenHtml}</span>` : tokenHtml;
  });

  return lineHtml.join('\n');
}

/**
 * ANSI color codes for terminal output
 */
const ANSI_COLORS: Record<TokenType, string> = {
  keyword: '\x1b[34m',    // Blue
  string: '\x1b[32m',     // Green
  number: '\x1b[33m',     // Yellow
  comment: '\x1b[90m',    // Gray
  operator: '\x1b[36m',   // Cyan
  punctuation: '\x1b[37m', // White
  identifier: '\x1b[0m',  // Reset
  type: '\x1b[35m',       // Magenta
  function: '\x1b[33m',   // Yellow
  property: '\x1b[36m',   // Cyan
  text: '\x1b[0m',        // Reset
};

const ANSI_RESET = '\x1b[0m';

/**
 * Convert highlighted code to ANSI-colored terminal output
 */
export function toAnsi(result: HighlightResult): string {
  return result.lines
    .map((line) =>
      line.tokens
        .map((token) => {
          if (token.type === 'text') {
            return token.text;
          }
          return `${ANSI_COLORS[token.type]}${token.text}${ANSI_RESET}`;
        })
        .join('')
    )
    .join('\n');
}

/**
 * Count tokens by type
 */
export function countTokensByType(result: HighlightResult): Record<TokenType, number> {
  const counts: Record<TokenType, number> = {
    keyword: 0,
    string: 0,
    number: 0,
    comment: 0,
    operator: 0,
    punctuation: 0,
    identifier: 0,
    type: 0,
    function: 0,
    property: 0,
    text: 0,
  };

  for (const line of result.lines) {
    for (const token of line.tokens) {
      counts[token.type]++;
    }
  }

  return counts;
}

/**
 * Get all unique tokens of a specific type
 */
export function getUniqueTokens(result: HighlightResult, type: TokenType): string[] {
  const tokens = new Set<string>();

  for (const line of result.lines) {
    for (const token of line.tokens) {
      if (token.type === type) {
        tokens.add(token.text);
      }
    }
  }

  return Array.from(tokens).sort();
}
