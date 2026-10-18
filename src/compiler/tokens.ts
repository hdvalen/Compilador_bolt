// Definition of the MiniCompiler token system.
// Tokens are the vocabulary of the language: keywords, identifiers,
// literals, operators, delimiters and punctuation, plus error tokens.

export type TokenType =
  // Keywords
  | 'INT'
  | 'FLOAT'
  | 'STRING'
  | 'BOOL'
  | 'IF'
  | 'ELSE'
  | 'WHILE'
  | 'PRINT'
  | 'TRUE'
  | 'FALSE'
  // Literals
  | 'IDENTIFIER'
  | 'INTEGER_LITERAL'
  | 'FLOAT_LITERAL'
  | 'STRING_LITERAL'
  // Arithmetic operators
  | 'PLUS'
  | 'MINUS'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'MODULO'
  // Assignment
  | 'ASSIGN'
  // Relational operators
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'LESS_THAN'
  | 'LESS_EQUAL'
  | 'GREATER_THAN'
  | 'GREATER_EQUAL'
  // Logical operators
  | 'AND'
  | 'OR'
  | 'NOT'
  // Delimiters
  | 'LEFT_PAREN'
  | 'RIGHT_PAREN'
  | 'LEFT_BRACE'
  | 'RIGHT_BRACE'
  // Punctuation
  | 'SEMICOLON'
  | 'COMMA'
  // Special
  | 'COMMENT'
  | 'EOF';

export interface Token {
  type: TokenType;
  lexeme: string;
  value: number | string | boolean | null;
  line: number;
  startColumn: number;
  endColumn: number;
}

export interface LexicalError {
  code: string;
  message: string;
  line: number;
  column: number;
  lexeme: string;
}

// Keyword table — maps reserved words to their token types.
export const KEYWORDS: Record<string, TokenType> = {
  int: 'INT',
  float: 'FLOAT',
  string: 'STRING',
  bool: 'BOOL',
  if: 'IF',
  else: 'ELSE',
  while: 'WHILE',
  print: 'PRINT',
  true: 'TRUE',
  false: 'FALSE',
};

// Token categories used by the UI for filtering.
export type TokenCategory =
  | 'keyword'
  | 'identifier'
  | 'literal'
  | 'operator'
  | 'delimitador'
  | 'puntuacion'
  | 'comentario';

export function categoryOf(type: TokenType): TokenCategory {
  switch (type) {
    case 'INT':
    case 'FLOAT':
    case 'STRING':
    case 'BOOL':
    case 'IF':
    case 'ELSE':
    case 'WHILE':
    case 'PRINT':
    case 'TRUE':
    case 'FALSE':
      return 'keyword';
    case 'IDENTIFIER':
      return 'identifier';
    case 'INTEGER_LITERAL':
    case 'FLOAT_LITERAL':
    case 'STRING_LITERAL':
      return 'literal';
    case 'PLUS':
    case 'MINUS':
    case 'MULTIPLY':
    case 'DIVIDE':
    case 'MODULO':
    case 'ASSIGN':
    case 'EQUAL':
    case 'NOT_EQUAL':
    case 'LESS_THAN':
    case 'LESS_EQUAL':
    case 'GREATER_THAN':
    case 'GREATER_EQUAL':
    case 'AND':
    case 'OR':
    case 'NOT':
      return 'operator';
    case 'LEFT_PAREN':
    case 'RIGHT_PAREN':
    case 'LEFT_BRACE':
    case 'RIGHT_BRACE':
      return 'delimitador';
    case 'SEMICOLON':
    case 'COMMA':
      return 'puntuacion';
    case 'COMMENT':
    case 'EOF':
      return 'comentario';
  }
}
