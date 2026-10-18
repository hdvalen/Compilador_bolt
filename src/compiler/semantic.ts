// Semantic analyzer for MiniCompiler.
//
// Walks the AST, builds the symbol table, and enforces the language's
// semantic rules:
//   1.  Use of undeclared variables.
//   2.  Duplicate declarations in the same scope.
//   3.  Type compatibility in assignments (with allowed widening).
//   4.  Operand type compatibility in arithmetic operations.
//   5.  Type compatibility in comparisons.
//   6.  if/while conditions must be boolean.
//   7.  Disallowed operations (e.g. string + string, bool arithmetic).
//   8.  Scope management for if/while blocks.
//   9.  No access to variables out of scope (enforced by resolve()).
//   10. Static detection of division by zero.
//   11. Initialization rules: using a variable before it has been assigned.
//   12. Permitted implicit conversions: int → float. No other widening.

import {
  ProgramNode,
  StmtNode,
  ExprNode,
  DataType,
  BinaryOpNode,
  UnaryOpNode,
  VarDeclNode,
  AssignmentNode,
  IfNode,
  WhileNode,
  BlockNode,
} from './ast';
import { SymbolTable, SymbolEntry } from './symbolTable';
import { TokenType } from './tokens';

export type { SymbolEntry };

export type Severity = 'error' | 'warning';

export interface SemanticDiagnostic {
  code: string;
  severity: Severity;
  message: string;
  line: number;
  column: number;
  suggestion: string;
}

export interface SemanticResult {
  diagnostics: SemanticDiagnostic[];
  symbols: SymbolEntry[];
}

// Permitted widening: int can become float implicitly. Nothing else.
const WIDENING: Record<DataType, DataType[]> = {
  int: ['int', 'float'],
  float: ['float'],
  string: ['string'],
  bool: ['bool'],
};

function canAssign(target: DataType, source: DataType): boolean {
  return WIDENING[target].includes(source);
}

function isNumeric(t: DataType): boolean {
  return t === 'int' || t === 'float';
}

// Fold a literal expression to a number when it is constant, so we can
// detect static division by zero.
function constNumber(expr: ExprNode): number | null {
  if (expr.type === 'IntegerLiteral' || expr.type === 'FloatLiteral') {
    return (expr as { value: number }).value;
  }
  if (expr.type === 'UnaryOp') {
    const u = expr as UnaryOpNode;
    const inner = constNumber(u.operand);
    if (inner === null) return null;
    return u.operator === 'MINUS' ? -inner : inner;
  }
  if (expr.type === 'BinaryOp') {
    const b = expr as BinaryOpNode;
    const l = constNumber(b.left);
    const r = constNumber(b.right);
    if (l === null || r === null) return null;
    switch (b.operator) {
      case 'PLUS': return l + r;
      case 'MINUS': return l - r;
      case 'MULTIPLY': return l * r;
      case 'DIVIDE': return r !== 0 ? l / r : null;
      case 'MODULO': return r !== 0 ? l % r : null;
    }
  }
  return null;
}

export function analyze(program: ProgramNode): SemanticResult {
  const table = new SymbolTable();
  const diagnostics: SemanticDiagnostic[] = [];
  let blockCounter = 0;

  function diag(
    code: string,
    severity: Severity,
    message: string,
    line: number,
    column: number,
    suggestion: string
  ) {
    diagnostics.push({ code, severity, message, line, column, suggestion });
  }

  function checkExpr(expr: ExprNode): DataType | null {
    switch (expr.type) {
      case 'IntegerLiteral':
        return 'int';
      case 'FloatLiteral':
        return 'float';
      case 'StringLiteral':
        return 'string';
      case 'BoolLiteral':
        return 'bool';
      case 'Identifier': {
        const entry = table.resolve(expr.name);
        if (!entry) {
          diag(
            'SEM_UNDECLARED_VARIABLE',
            'error',
            `La variable "${expr.name}" no ha sido declarada.`,
            expr.line,
            expr.column,
            `Declara "${expr.name}" con su tipo antes de usarla, por ejemplo: int ${expr.name} = ...;`
          );
          return null;
        }
        if (!entry.initialized) {
          diag(
            'SEM_UNINITIALIZED_USE',
            'warning',
            `La variable "${expr.name}" se usa pero podría no estar inicializada.`,
            expr.line,
            expr.column,
            `Asigna un valor a "${expr.name}" antes de usarla.`
          );
        }
        return entry.dataType;
      }
      case 'UnaryOp': {
        const u = expr as UnaryOpNode;
        const operandType = checkExpr(u.operand);
        if (operandType === null) return null;
        if (u.operator === 'MINUS') {
          if (!isNumeric(operandType)) {
            diag(
              'SEM_UNARY_TYPE',
              'error',
              `El operador "-" no se aplica a un valor de tipo ${operandType}.`,
              u.line,
              u.column,
              'El operador "-" solo aplica a tipos int o float.'
            );
            return null;
          }
          return operandType;
        }
        // NOT
        if (operandType !== 'bool') {
          diag(
            'SEM_UNARY_TYPE',
            'error',
            `El operador "!" requiere un valor booleano, pero se obtuvo ${operandType}.`,
            u.line,
            u.column,
            'Usa "!" solo sobre expresiones booleanas.'
          );
          return null;
        }
        return 'bool';
      }
      case 'BinaryOp': {
        const b = expr as BinaryOpNode;
        // Static division-by-zero check.
        if (b.operator === 'DIVIDE' || b.operator === 'MODULO') {
          const rightConst = constNumber(b.right);
          if (rightConst === 0) {
            diag(
              'SEM_DIVISION_BY_ZERO',
              'error',
              `División por cero detectada estáticamente.`,
              b.line,
              b.column,
              'Asegúrate de que el divisor no sea cero.'
            );
          }
        }
        const lt = checkExpr(b.left);
        const rt = checkExpr(b.right);
        if (lt === null || rt === null) return null;

        switch (b.operator) {
          case 'PLUS':
          case 'MINUS':
          case 'MULTIPLY':
          case 'DIVIDE':
          case 'MODULO': {
            if (!isNumeric(lt) || !isNumeric(rt)) {
              diag(
                'SEM_ARITH_TYPE',
                'error',
                `El operador "${b.operator}" requiere operandos numéricos, pero se obtuvieron ${lt} y ${rt}.`,
                b.line,
                b.column,
                'Las operaciones aritméticas solo admiten int y float.'
              );
              return null;
            }
            // int op int → int; anything with float → float.
            return lt === 'float' || rt === 'float' ? 'float' : 'int';
          }
          case 'EQUAL':
          case 'NOT_EQUAL':
          case 'LESS_THAN':
          case 'LESS_EQUAL':
          case 'GREATER_THAN':
          case 'GREATER_EQUAL': {
            // Comparisons require compatible (comparable) types.
            const compatible =
              (isNumeric(lt) && isNumeric(rt)) ||
              (lt === 'string' && rt === 'string') ||
              (lt === 'bool' && rt === 'bool');
            if (!compatible) {
              diag(
                'SEM_COMPARE_TYPE',
                'error',
                `No se pueden comparar valores de tipo ${lt} y ${rt}.`,
                b.line,
                b.column,
                'Compara solo tipos compatibles (números con números, strings con strings, bool con bool).'
              );
              return null;
            }
            return 'bool';
          }
          case 'AND':
          case 'OR': {
            if (lt !== 'bool' || rt !== 'bool') {
              diag(
                'SEM_LOGIC_TYPE',
                'error',
                `El operador "${b.operator}" requiere operandos booleanos, pero se obtuvieron ${lt} y ${rt}.`,
                b.line,
                b.column,
                'Los operadores lógicos && y || solo admiten valores bool.'
              );
              return null;
            }
            return 'bool';
          }
        }
        return null;
      }
    }
  }

  function checkStatement(stmt: StmtNode): void {
    switch (stmt.type) {
      case 'VarDecl': {
        const d = stmt as VarDeclNode;
        if (table.resolveLocal(d.name)) {
          diag(
            'SEM_DUPLICATE_DECLARATION',
            'error',
            `La variable "${d.name}" ya está declarada en este ámbito.`,
            d.line,
            d.column,
            `Usa un nombre distinto o elimina la declaración duplicada.`
          );
          return;
        }
        let initType: DataType | null = null;
        if (d.initializer) {
          initType = checkExpr(d.initializer);
        }
        const initialized = d.initializer !== null;
        table.declare(d.name, d.dataType, d.line, initialized);
        if (d.initializer && initType) {
          if (!canAssign(d.dataType, initType)) {
            diag(
              'SEM_ASSIGN_TYPE',
              'error',
              `No se puede asignar un valor de tipo ${initType} a una variable de tipo ${d.dataType}.`,
              d.line,
              d.column,
              `El tipo ${d.dataType} solo admite valores ${WIDENING[d.dataType].join(' o ')}.`
            );
          }
        }
        return;
      }
      case 'Assignment': {
        const a = stmt as AssignmentNode;
        const entry = table.resolve(a.name);
        if (!entry) {
          diag(
            'SEM_UNDECLARED_VARIABLE',
            'error',
            `La variable "${a.name}" no ha sido declarada.`,
            a.line,
            a.column,
            `Declara "${a.name}" antes de asignarle un valor.`
          );
          // Still type-check the right-hand side so we surface more errors.
          checkExpr(a.value);
          return;
        }
        const valueType = checkExpr(a.value);
        if (valueType && !canAssign(entry.dataType, valueType)) {
          diag(
            'SEM_ASSIGN_TYPE',
            'error',
            `No se puede asignar un valor de tipo ${valueType} a la variable "${a.name}" de tipo ${entry.dataType}.`,
            a.line,
            a.column,
            `Convierte el valor a ${entry.dataType} o usa una variable del tipo correcto.`
          );
        }
        entry.initialized = true;
        return;
      }
      case 'Print': {
        checkExpr(stmt.argument);
        return;
      }
      case 'If': {
        const f = stmt as IfNode;
        const condType = checkExpr(f.condition);
        if (condType !== null && condType !== 'bool') {
          diag(
            'SEM_NON_BOOLEAN_CONDITION',
            'error',
            `La condición del "if" debe ser booleana, pero se obtuvo ${condType}.`,
            f.line,
            f.column,
            'Usa un operador relacional o lógico para que la condición sea bool.'
          );
        }
        blockCounter++;
        table.pushScope(`if@${f.line}`);
        for (const s of f.thenBranch.statements) checkStatement(s);
        table.popScope();
        if (f.elseBranch) {
          blockCounter++;
          table.pushScope(`else@${f.line}`);
          for (const s of f.elseBranch.statements) checkStatement(s);
          table.popScope();
        }
        return;
      }
      case 'While': {
        const w = stmt as WhileNode;
        const condType = checkExpr(w.condition);
        if (condType !== null && condType !== 'bool') {
          diag(
            'SEM_NON_BOOLEAN_CONDITION',
            'error',
            `La condición del "while" debe ser booleana, pero se obtuvo ${condType}.`,
            w.line,
            w.column,
            'Usa un operador relacional o lógico para que la condición sea bool.'
          );
        }
        blockCounter++;
        table.pushScope(`while@${w.line}`);
        for (const s of w.body.statements) checkStatement(s);
        table.popScope();
        return;
      }
      case 'Block': {
        const blk = stmt as BlockNode;
        blockCounter++;
        table.pushScope(`block@${blk.line}`);
        for (const s of blk.statements) checkStatement(s);
        table.popScope();
        return;
      }
    }
  }

  for (const stmt of program.statements) checkStatement(stmt);

  return { diagnostics, symbols: table.allSymbols() };
}
