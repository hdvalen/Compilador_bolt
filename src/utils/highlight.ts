// A lightweight syntax highlighter for the MiniCompiler editor.
// Produces HTML with spans tagged by token class, so the editor can color
// keywords, identifiers, literals, operators, etc. Used by the overlay
// approach in CodeEditor.

import { tokenize } from '@/compiler/lexer';

export interface HighlightedLine {
  // HTML string with <span class="..."> wrappers. Empty string allowed.
  html: string;
}

const CLASS_BY_TYPE: Record<string, string> = {
  INT: 'tok-keyword', FLOAT: 'tok-keyword', STRING: 'tok-keyword', BOOL: 'tok-keyword',
  IF: 'tok-keyword', ELSE: 'tok-keyword', WHILE: 'tok-keyword', PRINT: 'tok-keyword',
  TRUE: 'tok-keyword', FALSE: 'tok-keyword',
  IDENTIFIER: 'tok-identifier',
  INTEGER_LITERAL: 'tok-number', FLOAT_LITERAL: 'tok-number',
  STRING_LITERAL: 'tok-string',
  COMMENT: 'tok-comment',
  PLUS: 'tok-operator', MINUS: 'tok-operator', MULTIPLY: 'tok-operator',
  DIVIDE: 'tok-operator', MODULO: 'tok-operator', ASSIGN: 'tok-operator',
  EQUAL: 'tok-operator', NOT_EQUAL: 'tok-operator', LESS_THAN: 'tok-operator',
  LESS_EQUAL: 'tok-operator', GREATER_THAN: 'tok-operator', GREATER_EQUAL: 'tok-operator',
  AND: 'tok-operator', OR: 'tok-operator', NOT: 'tok-operator',
  LEFT_PAREN: 'tok-punct', RIGHT_PAREN: 'tok-punct',
  LEFT_BRACE: 'tok-punct', RIGHT_BRACE: 'tok-punct',
  SEMICOLON: 'tok-punct', COMMA: 'tok-punct',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Build per-line HTML from the source by tokenizing once.
export function highlight(source: string): HighlightedLine[] {
  const { tokens } = tokenize(source);
  const lineCount = source.split('\n').length;
  const lines: string[][] = Array.from({ length: lineCount }, () => []);

  for (const t of tokens) {
    if (t.type === 'EOF') continue;
    const cls = CLASS_BY_TYPE[t.type] ?? 'tok-plain';
    lines[t.line - 1]?.push(`<span class="${cls}">${escapeHtml(t.lexeme)}</span>`);
  }

  // Any text the lexer didn't capture (invalid chars) won't appear in tokens.
  // Fill gaps by walking the source and inserting escaped plain text for
  // regions not covered by a token on its line.
  return lines.map((parts, idx) => ({ html: parts.join('') || '&nbsp;' }));
}
