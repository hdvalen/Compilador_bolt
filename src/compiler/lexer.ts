// The MiniCompiler lexer.
// Walks the source character by character, groups characters into lexemes,
// and classifies them as tokens or lexical errors.

import { Token, LexicalError, KEYWORDS, TokenType } from './tokens';

export interface LexResult {
  tokens: Token[];
  errors: LexicalError[];
}

export type { LexicalError };

// Single-character operators/punctuation → token type.
const SINGLE_CHAR: Record<string, TokenType> = {
  '+': 'PLUS',
  '-': 'MINUS',
  '*': 'MULTIPLY',
  '/': 'DIVIDE', // also start of // comment
  '%': 'MODULO',
  '=': 'ASSIGN', // may become EQUAL
  '<': 'LESS_THAN', // may become LESS_EQUAL
  '>': 'GREATER_THAN', // may become GREATER_EQUAL
  '(': 'LEFT_PAREN',
  ')': 'RIGHT_PAREN',
  '{': 'LEFT_BRACE',
  '}': 'RIGHT_BRACE',
  ';': 'SEMICOLON',
  ',': 'COMMA',
  '!': 'NOT', // may become NOT_EQUAL
};

// Two-character operators.
const TWO_CHAR: Record<string, TokenType> = {
  '==': 'EQUAL',
  '!=': 'NOT_EQUAL',
  '<=': 'LESS_EQUAL',
  '>=': 'GREATER_EQUAL',
  '&&': 'AND',
  '||': 'OR',
};

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function isAlpha(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

function isAlphaNum(c: string): boolean {
  return isAlpha(c) || isDigit(c);
}

export function tokenize(source: string): LexResult {
  const tokens: Token[] = [];
  const errors: LexicalError[] = [];

  let i = 0;
  let line = 1;
  // column tracks the current 1-indexed column of source[i].
  let column = 1;

  function pushError(code: string, message: string, lexeme: string, col: number) {
    errors.push({ code, message, line, column: col, lexeme });
  }

  function makeToken(
    type: TokenType,
    lexeme: string,
    value: number | string | boolean | null,
    startLine: number,
    startCol: number
  ): Token {
    return {
      type,
      lexeme,
      value,
      line: startLine,
      startColumn: startCol,
      endColumn: startCol + lexeme.length - 1,
    };
  }

  while (i < source.length) {
    const c = source[i];

    // Whitespace and newlines — track position, emit no token.
    if (c === '\n') {
      i++;
      line++;
      column = 1;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      column++;
      continue;
    }

    // Comments: // to end of line. Emit a COMMENT token so the UI can show it.
    if (c === '/' && source[i + 1] === '/') {
      const startCol = column;
      const start = i;
      i += 2;
      column += 2;
      while (i < source.length && source[i] !== '\n') {
        i++;
        column++;
      }
      const lexeme = source.slice(start, i);
      tokens.push(makeToken('COMMENT', lexeme, null, line, startCol));
      continue;
    }

    // Strings: "..." with simple escape handling.
    if (c === '"') {
      const startCol = column;
      const startLine = line;
      const start = i;
      i++;
      column++;
      let closed = false;
      let value = '';
      while (i < source.length) {
        const ch = source[i];
        if (ch === '\\' && i + 1 < source.length) {
          const next = source[i + 1];
          const map: Record<string, string> = {
            n: '\n',
            t: '\t',
            '"': '"',
            '\\': '\\',
          };
          value += next in map ? map[next] : next;
          i += 2;
          column += 2;
          continue;
        }
        if (ch === '"') {
          i++;
          column++;
          closed = true;
          break;
        }
        if (ch === '\n') {
          // Unterminated at newline — stop here to avoid swallowing the file.
          break;
        }
        value += ch;
        i++;
        column++;
      }
      const lexeme = source.slice(start, i);
      if (!closed) {
        pushError(
          'LEX_UNTERMINATED_STRING',
          'Cadena de texto sin cerrar. Falta la comilla de cierre (").',
          lexeme,
          startCol
        );
        // Still produce a STRING_LITERAL token so the parser can try to recover.
        tokens.push(makeToken('STRING_LITERAL', lexeme, value, startLine, startCol));
      } else {
        tokens.push(makeToken('STRING_LITERAL', lexeme, value, startLine, startCol));
      }
      continue;
    }

    // Numbers: integer or decimal. Detect malformed decimals like "12.".
    if (isDigit(c)) {
      const startCol = column;
      const startLine = line;
      const start = i;
      while (i < source.length && isDigit(source[i])) {
        i++;
        column++;
      }
      let isFloat = false;
      if (source[i] === '.' && isDigit(source[i + 1])) {
        isFloat = true;
        i++; // consume '.'
        column++;
        while (i < source.length && isDigit(source[i])) {
          i++;
          column++;
        }
      } else if (source[i] === '.' && !isDigit(source[i + 1])) {
        // Trailing dot with no fractional digits — consume the dot and error.
        const badLexeme = source.slice(start, i + 1);
        pushError(
          'LEX_MALFORMED_NUMBER',
          'Número mal formado: se encontró un punto decimal sin dígitos decimales.',
          badLexeme,
          startCol
        );
        i++;
        column++;
        tokens.push(
          makeToken('FLOAT_LITERAL', badLexeme, parseFloat(badLexeme), startLine, startCol)
        );
        continue;
      }
      const lexeme = source.slice(start, i);
      const value = isFloat ? parseFloat(lexeme) : parseInt(lexeme, 10);
      tokens.push(
        makeToken(isFloat ? 'FLOAT_LITERAL' : 'INTEGER_LITERAL', lexeme, value, startLine, startCol)
      );
      continue;
    }

    // Identifiers and keywords.
    if (isAlpha(c)) {
      const startCol = column;
      const startLine = line;
      const start = i;
      while (i < source.length && isAlphaNum(source[i])) {
        i++;
        column++;
      }
      const lexeme = source.slice(start, i);
      const kw = KEYWORDS[lexeme];
      if (kw) {
        let value: boolean | null = null;
        if (kw === 'TRUE') value = true;
        else if (kw === 'FALSE') value = false;
        tokens.push(makeToken(kw, lexeme, value, startLine, startCol));
      } else {
        tokens.push(makeToken('IDENTIFIER', lexeme, lexeme, startLine, startCol));
      }
      continue;
    }

    // Two-character operators.
    const two = source.slice(i, i + 2);
    if (TWO_CHAR[two]) {
      const startCol = column;
      const startLine = line;
      // && and || are logical operators, not errors even though & and | alone are invalid.
      tokens.push(makeToken(TWO_CHAR[two], two, null, startLine, startCol));
      i += 2;
      column += 2;
      continue;
    }

    // Single-character operators / punctuation.
    if (SINGLE_CHAR[c]) {
      const startCol = column;
      const startLine = line;
      tokens.push(makeToken(SINGLE_CHAR[c], c, null, startLine, startCol));
      i++;
      column++;
      continue;
    }

    // Anything else is an invalid character.
    pushError(
      'LEX_INVALID_CHAR',
      `Carácter inválido "${c}". No pertenece al alfabeto de MiniCompiler.`,
      c,
      column
    );
    i++;
    column++;
  }

  tokens.push({
    type: 'EOF',
    lexeme: '',
    value: null,
    line,
    startColumn: column,
    endColumn: column,
  });

  return { tokens, errors };
}
