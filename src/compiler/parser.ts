// Recursive-descent parser for MiniCompiler.
//
// Grammar (EBNF):
//   program        = { statement } ;
//   statement      = var_decl | assignment | print_stmt | if_stmt | while_stmt | block ;
//   var_decl       = type IDENTIFIER [ "=" expression ] ";" ;
//   assignment     = IDENTIFIER "=" expression ";" ;
//   print_stmt     = "print" "(" expression ")" ";" ;
//   if_stmt        = "if" "(" expression ")" block [ "else" block ] ;
//   while_stmt     = "while" "(" expression ")" block ;
//   block          = "{" { statement } "}" ;
//   expression     = logic_or ;
//   logic_or       = logic_and { "||" logic_and } ;
//   logic_and      = equality { "&&" equality } ;
//   equality       = relational { ("==" | "!=") relational } ;
//   relational     = additive { ("<" | "<=" | ">" | ">=") additive } ;
//   additive       = term { ("+" | "-") term } ;
//   term           = factor { ("*" | "/" | "%") factor } ;
//   factor         = unary ;
//   unary          = ("-" | "!") unary | primary ;
//   primary        = INTEGER_LITERAL | FLOAT_LITERAL | STRING_LITERAL
//                  | "true" | "false" | IDENTIFIER | "(" expression ")" ;
//
// Precedence (lowest → highest):
//   ||  →  &&  →  == !=  →  < <= > >=  →  + -  →  * / %  →  unary  →  primary
// All binary operators are left-associative.

import { Token, TokenType } from './tokens';
import {
  ProgramNode,
  StmtNode,
  ExprNode,
  BlockNode,
  DataType,
  NodeLocation,
} from './ast';

export interface ParseError {
  code: string;
  message: string;
  line: number;
  column: number;
  lexeme: string;
}

export interface ParseResult {
  program: ProgramNode | null;
  errors: ParseError[];
}

const TYPE_KEYWORDS: Partial<Record<TokenType, DataType>> = {
  INT: 'int',
  FLOAT: 'float',
  STRING: 'string',
  BOOL: 'bool',
};

export class Parser {
  private tokens: Token[];
  private errors: ParseError[] = [];
  private pos = 0;

  constructor(tokens: Token[]) {
    // Comments do not participate in the grammar — filter them out.
    this.tokens = tokens.filter((t) => t.type !== 'COMMENT');
  }

  parse(): ParseResult {
    const statements: StmtNode[] = [];
    while (!this.isAtEnd()) {
      const before = this.pos;
      const stmt = this.statement();
      if (stmt) statements.push(stmt);
      // Safety against infinite loops on malformed input.
      if (this.pos === before) this.advance();
    }
    if (this.errors.length > 0) {
      return { program: { type: 'Program', statements }, errors: this.errors };
    }
    return { program: { type: 'Program', statements }, errors: this.errors };
  }

  // ---- Token helpers ----
  private peek(): Token {
    return this.tokens[this.pos];
  }

  private peekAt(offset: number): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private previous(): Token {
    return this.tokens[Math.max(this.pos - 1, 0)];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    const t = this.peek();
    if (!this.isAtEnd()) this.pos++;
    return t;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): Token | null {
    if (types.includes(this.peek().type)) return this.advance();
    return null;
  }

  private loc(t: Token): NodeLocation {
    return { line: t.line, column: t.startColumn };
  }

  private error(code: string, message: string, token: Token): void {
    this.errors.push({
      code,
      message,
      line: token.line,
      column: token.startColumn,
      lexeme: token.lexeme,
    });
  }

  private expect(type: TokenType, what: string): Token | null {
    if (this.check(type)) return this.advance();
    const t = this.peek();
    this.error(
      'SYN_EXPECTED_TOKEN',
      `Se esperaba ${what} pero se encontró "${t.lexeme}" (${t.type}).`,
      t
    );
    return null;
  }

  // ---- Statements ----
  private statement(): StmtNode | null {
    const t = this.peek();
    switch (t.type) {
      case 'INT':
      case 'FLOAT':
      case 'STRING':
      case 'BOOL':
        return this.varDecl();
      case 'IF':
        return this.ifStmt();
      case 'WHILE':
        return this.whileStmt();
      case 'PRINT':
        return this.printStmt();
      case 'LEFT_BRACE':
        return this.block();
      case 'IDENTIFIER':
        return this.assignment();
      default:
        this.error(
          'SYN_UNEXPECTED_TOKEN',
          `Token inesperado "${t.lexeme}". No inicia una instrucción válida.`,
          t
        );
        this.synchronize();
        return null;
    }
  }

  private varDecl(): StmtNode | null {
    const typeTok = this.advance();
    const dataType = TYPE_KEYWORDS[typeTok.type]!;
    const nameTok = this.expect('IDENTIFIER', 'un identificador');
    if (!nameTok) {
      this.synchronize();
      return null;
    }
    let initializer: ExprNode | null = null;
    if (this.match('ASSIGN')) {
      initializer = this.expression();
    }
    if (!this.expect('SEMICOLON', '";"')) {
      this.synchronize();
    }
    return {
      type: 'VarDecl',
      dataType,
      name: nameTok.lexeme,
      initializer,
      line: typeTok.line,
      column: typeTok.startColumn,
    };
  }

  private assignment(): StmtNode | null {
    const nameTok = this.advance();
    if (!this.expect('ASSIGN', '"="')) {
      this.synchronize();
      return null;
    }
    const value = this.expression();
    if (!this.expect('SEMICOLON', '";"')) {
      this.synchronize();
    }
    return {
      type: 'Assignment',
      name: nameTok.lexeme,
      value: value as ExprNode,
      line: nameTok.line,
      column: nameTok.startColumn,
    };
  }

  private printStmt(): StmtNode | null {
    const printTok = this.advance();
    if (!this.expect('LEFT_PAREN', '"("')) {
      this.synchronize();
      return null;
    }
    const arg = this.expression();
    if (!this.expect('RIGHT_PAREN', '")"')) {
      this.synchronize();
    }
    if (!this.expect('SEMICOLON', '";"')) {
      this.synchronize();
    }
    return {
      type: 'Print',
      argument: arg as ExprNode,
      line: printTok.line,
      column: printTok.startColumn,
    };
  }

  private ifStmt(): StmtNode | null {
    const ifTok = this.advance();
    if (!this.expect('LEFT_PAREN', '"("')) {
      this.synchronize();
      return null;
    }
    const condition = this.expression();
    if (!this.expect('RIGHT_PAREN', '")"')) {
      this.synchronize();
    }
    const thenBranch = this.block();
    if (!thenBranch) return null;
    let elseBranch: BlockNode | null = null;
    if (this.match('ELSE')) {
      const eb = this.block();
      if (eb) elseBranch = eb;
    }
    return {
      type: 'If',
      condition: condition as ExprNode,
      thenBranch: thenBranch as BlockNode,
      elseBranch,
      line: ifTok.line,
      column: ifTok.startColumn,
    };
  }

  private whileStmt(): StmtNode | null {
    const whileTok = this.advance();
    if (!this.expect('LEFT_PAREN', '"("')) {
      this.synchronize();
      return null;
    }
    const condition = this.expression();
    if (!this.expect('RIGHT_PAREN', '")"')) {
      this.synchronize();
    }
    const body = this.block();
    if (!body) return null;
    return {
      type: 'While',
      condition: condition as ExprNode,
      body: body as BlockNode,
      line: whileTok.line,
      column: whileTok.startColumn,
    };
  }

  private block(): BlockNode | null {
    const brace = this.peek();
    if (!this.expect('LEFT_BRACE', '"{"')) {
      this.synchronize();
      return null;
    }
    const statements: StmtNode[] = [];
    while (!this.check('RIGHT_BRACE') && !this.isAtEnd()) {
      const before = this.pos;
      const stmt = this.statement();
      if (stmt) statements.push(stmt);
      if (this.pos === before) this.advance();
    }
    if (!this.expect('RIGHT_BRACE', '"}"')) {
      this.synchronize();
    }
    return {
      type: 'Block',
      statements,
      line: brace.line,
      column: brace.startColumn,
    };
  }

  // ---- Expressions (precedence climbing via dedicated functions) ----
  private expression(): ExprNode | null {
    return this.logicOr();
  }

  private logicOr(): ExprNode | null {
    let left = this.logicAnd();
    while (this.match('OR')) {
      const op = this.previous();
      const right = this.logicAnd();
      left = this.makeBinary(op, left, right);
    }
    return left;
  }

  private logicAnd(): ExprNode | null {
    let left = this.equality();
    while (this.match('AND')) {
      const op = this.previous();
      const right = this.equality();
      left = this.makeBinary(op, left, right);
    }
    return left;
  }

  private equality(): ExprNode | null {
    let left = this.relational();
    while (this.match('EQUAL', 'NOT_EQUAL')) {
      const op = this.previous();
      const right = this.relational();
      left = this.makeBinary(op, left, right);
    }
    return left;
  }

  private relational(): ExprNode | null {
    let left = this.additive();
    while (this.match('LESS_THAN', 'LESS_EQUAL', 'GREATER_THAN', 'GREATER_EQUAL')) {
      const op = this.previous();
      const right = this.additive();
      left = this.makeBinary(op, left, right);
    }
    return left;
  }

  private additive(): ExprNode | null {
    let left = this.term();
    while (this.match('PLUS', 'MINUS')) {
      const op = this.previous();
      const right = this.term();
      left = this.makeBinary(op, left, right);
    }
    return left;
  }

  private term(): ExprNode | null {
    let left = this.factor();
    while (this.match('MULTIPLY', 'DIVIDE', 'MODULO')) {
      const op = this.previous();
      const right = this.factor();
      left = this.makeBinary(op, left, right);
    }
    return left;
  }

  private factor(): ExprNode | null {
    return this.unary();
  }

  private unary(): ExprNode | null {
    if (this.match('MINUS', 'NOT')) {
      const op = this.previous();
      const operand = this.unary();
      return {
        type: 'UnaryOp',
        operator: op.type,
        operand: operand as ExprNode,
        line: op.line,
        column: op.startColumn,
      };
    }
    return this.primary();
  }

  private primary(): ExprNode | null {
    const t = this.peek();
    switch (t.type) {
      case 'INTEGER_LITERAL':
        this.advance();
        return { type: 'IntegerLiteral', value: t.value as number, line: t.line, column: t.startColumn };
      case 'FLOAT_LITERAL':
        this.advance();
        return { type: 'FloatLiteral', value: t.value as number, line: t.line, column: t.startColumn };
      case 'STRING_LITERAL':
        this.advance();
        return { type: 'StringLiteral', value: t.value as string, line: t.line, column: t.startColumn };
      case 'TRUE':
        this.advance();
        return { type: 'BoolLiteral', value: true, line: t.line, column: t.startColumn };
      case 'FALSE':
        this.advance();
        return { type: 'BoolLiteral', value: false, line: t.line, column: t.startColumn };
      case 'IDENTIFIER':
        this.advance();
        return { type: 'Identifier', name: t.lexeme, line: t.line, column: t.startColumn };
      case 'LEFT_PAREN': {
        this.advance();
        const inner = this.expression();
        if (!this.expect('RIGHT_PAREN', '")"')) {
          // Missing closing paren — do not consume; let the caller recover.
        }
        return inner;
      }
      case 'EOF':
        this.error('SYN_UNEXPECTED_EOF', 'Expresión incompleta: se alcanzó el final del código.', t);
        return null;
      default:
        this.error(
          'SYN_UNEXPECTED_TOKEN',
          `Token inesperado "${t.lexeme}" en una expresión.`,
          t
        );
        this.advance();
        return null;
    }
  }

  private makeBinary(op: Token, left: ExprNode | null, right: ExprNode | null): ExprNode {
    return {
      type: 'BinaryOp',
      operator: op.type,
      left: left as ExprNode,
      right: right as ExprNode,
      line: op.line,
      column: op.startColumn,
    };
  }

  // Panic-mode recovery: advance until we reach a likely statement boundary.
  private synchronize(): void {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().type === 'SEMICOLON') return;
      switch (this.peek().type) {
        case 'INT':
        case 'FLOAT':
        case 'STRING':
        case 'BOOL':
        case 'IF':
        case 'WHILE':
        case 'PRINT':
        case 'RIGHT_BRACE':
        case 'LEFT_BRACE':
          return;
      }
      this.advance();
    }
  }
}

export function parse(tokens: Token[]): ParseResult {
  return new Parser(tokens).parse();
}
