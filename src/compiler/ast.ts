// AST node definitions for MiniCompiler.
// Every statement and expression in the language has a corresponding node.
// Each node carries line/column so the semantic analyzer and UI can report
// precise locations.

import { TokenType } from './tokens';

export type DataType = 'int' | 'float' | 'string' | 'bool';

export interface NodeLocation {
  line: number;
  column: number;
}

// ---- Expressions ----
export type ExprNode =
  | IntegerLiteralNode
  | FloatLiteralNode
  | StringLiteralNode
  | BoolLiteralNode
  | IdentifierNode
  | UnaryOpNode
  | BinaryOpNode;

export interface IntegerLiteralNode extends NodeLocation {
  type: 'IntegerLiteral';
  value: number;
}

export interface FloatLiteralNode extends NodeLocation {
  type: 'FloatLiteral';
  value: number;
}

export interface StringLiteralNode extends NodeLocation {
  type: 'StringLiteral';
  value: string;
}

export interface BoolLiteralNode extends NodeLocation {
  type: 'BoolLiteral';
  value: boolean;
}

export interface IdentifierNode extends NodeLocation {
  type: 'Identifier';
  name: string;
}

export interface UnaryOpNode extends NodeLocation {
  type: 'UnaryOp';
  operator: TokenType; // MINUS or NOT
  operand: ExprNode;
}

export interface BinaryOpNode extends NodeLocation {
  type: 'BinaryOp';
  operator: TokenType; // arithmetic / relational / logical
  left: ExprNode;
  right: ExprNode;
}

// ---- Statements ----
export type StmtNode =
  | VarDeclNode
  | AssignmentNode
  | PrintNode
  | IfNode
  | WhileNode
  | BlockNode;

export interface VarDeclNode extends NodeLocation {
  type: 'VarDecl';
  dataType: DataType;
  name: string;
  initializer: ExprNode | null;
}

export interface AssignmentNode extends NodeLocation {
  type: 'Assignment';
  name: string;
  value: ExprNode;
}

export interface PrintNode extends NodeLocation {
  type: 'Print';
  argument: ExprNode;
}

export interface IfNode extends NodeLocation {
  type: 'If';
  condition: ExprNode;
  thenBranch: BlockNode;
  elseBranch: BlockNode | null;
}

export interface WhileNode extends NodeLocation {
  type: 'While';
  condition: ExprNode;
  body: BlockNode;
}

export interface BlockNode extends NodeLocation {
  type: 'Block';
  statements: StmtNode[];
}

export interface ProgramNode {
  type: 'Program';
  statements: StmtNode[];
}

// Operator metadata used by the parser for precedence and by the semantic
// analyzer for type checking.
export type OperatorClass = 'arithmetic' | 'relational' | 'logical' | 'unary';

export function operatorClass(op: TokenType): OperatorClass {
  switch (op) {
    case 'PLUS':
    case 'MINUS':
    case 'MULTIPLY':
    case 'DIVIDE':
    case 'MODULO':
      return 'arithmetic';
    case 'EQUAL':
    case 'NOT_EQUAL':
    case 'LESS_THAN':
    case 'LESS_EQUAL':
    case 'GREATER_THAN':
    case 'GREATER_EQUAL':
      return 'relational';
    case 'AND':
    case 'OR':
      return 'logical';
    case 'NOT':
      return 'unary';
  }
  return 'arithmetic';
}

// Convert a node into a plain JSON tree (used by the UI's AST JSON view).
export function astToJson(node: ProgramNode | StmtNode | ExprNode): unknown {
  if (node === null) return null;
  switch (node.type) {
    case 'Program':
      return { type: 'Program', statements: node.statements.map(astToJson) };
    case 'Block':
      return { type: 'Block', statements: node.statements.map(astToJson) };
    case 'VarDecl':
      return {
        type: 'VarDecl',
        dataType: node.dataType,
        name: node.name,
        initializer: node.initializer ? astToJson(node.initializer) : null,
        line: node.line,
      };
    case 'Assignment':
      return {
        type: 'Assignment',
        name: node.name,
        value: astToJson(node.value),
        line: node.line,
      };
    case 'Print':
      return { type: 'Print', argument: astToJson(node.argument), line: node.line };
    case 'If':
      return {
        type: 'If',
        condition: astToJson(node.condition),
        thenBranch: astToJson(node.thenBranch),
        elseBranch: node.elseBranch ? astToJson(node.elseBranch) : null,
        line: node.line,
      };
    case 'While':
      return {
        type: 'While',
        condition: astToJson(node.condition),
        body: astToJson(node.body),
        line: node.line,
      };
    case 'IntegerLiteral':
      return { type: 'IntegerLiteral', value: node.value, line: node.line };
    case 'FloatLiteral':
      return { type: 'FloatLiteral', value: node.value, line: node.line };
    case 'StringLiteral':
      return { type: 'StringLiteral', value: node.value, line: node.line };
    case 'BoolLiteral':
      return { type: 'BoolLiteral', value: node.value, line: node.line };
    case 'Identifier':
      return { type: 'Identifier', name: node.name, line: node.line };
    case 'UnaryOp':
      return {
        type: 'UnaryOp',
        operator: node.operator,
        operand: astToJson(node.operand),
        line: node.line,
      };
    case 'BinaryOp':
      return {
        type: 'BinaryOp',
        operator: node.operator,
        left: astToJson(node.left),
        right: astToJson(node.right),
        line: node.line,
      };
  }
}
