// Compiler coordinator: runs the three phases in sequence and decides which
// phases can run based on the success of earlier ones. This is the single
// entry point used by the UI and (conceptually) by the API.

import { tokenize } from './lexer';
import { parse, ParseError } from './parser';
import { analyze } from './semantic';
import { astToJson, ProgramNode } from './ast';
import { Token, LexicalError } from './tokens';
import { SemanticDiagnostic, SymbolEntry } from './semantic';

export type PhaseStatus = 'pending' | 'running' | 'success' | 'error';

export interface PhaseState {
  status: PhaseStatus;
  durationMs: number;
}

export interface CompilerResult {
  lexical: {
    tokens: Token[];
    errors: LexicalError[];
    phase: PhaseState;
  };
  syntactic: {
    ast: ProgramNode | null;
    astJson: unknown;
    errors: ParseError[];
    phase: PhaseState;
  };
  semantic: {
    diagnostics: SemanticDiagnostic[];
    symbols: SymbolEntry[];
    phase: PhaseState;
  } | null;
  overall: 'success' | 'error';
  // The first phase that produced a blocking error, if any.
  failedPhase: 'lexical' | 'syntactic' | 'semantic' | null;
}

export function runLexer(source: string) {
  const start = performance.now();
  const { tokens, errors } = tokenize(source);
  const phase: PhaseState = {
    status: errors.length > 0 ? 'error' : 'success',
    durationMs: performance.now() - start,
  };
  return { tokens, errors, phase };
}

export function runParser(tokens: Token[]) {
  const start = performance.now();
  const { program, errors } = parse(tokens);
  const phase: PhaseState = {
    status: errors.length > 0 ? 'error' : 'success',
    durationMs: performance.now() - start,
  };
  return {
    ast: program,
    astJson: program ? astToJson(program) : null,
    errors,
    phase,
  };
}

export function runSemantic(ast: ProgramNode) {
  const start = performance.now();
  const { diagnostics, symbols } = analyze(ast);
  const hasError = diagnostics.some((d) => d.severity === 'error');
  const phase: PhaseState = {
    status: hasError ? 'error' : 'success',
    durationMs: performance.now() - start,
  };
  return { diagnostics, symbols, phase };
}

export function compile(source: string): CompilerResult {
  const lex = runLexer(source);
  // If lexing produced errors we still attempt parsing using the tokens we
  // got, so the user can see syntactic problems too. Parsing is lenient.
  const syn = runParser(lex.tokens);

  let sem: CompilerResult['semantic'] = null;
  // Only run semantic analysis when we have a usable AST. If parsing failed
  // to produce any statements at all, skip semantics rather than pretending
  // it succeeded.
  if (syn.ast && syn.ast.statements.length > 0 && syn.errors.length === 0) {
    const s = runSemantic(syn.ast);
    sem = { diagnostics: s.diagnostics, symbols: s.symbols, phase: s.phase };
  } else if (syn.ast && syn.ast.statements.length > 0 && syn.errors.length > 0) {
    // Parser recovered but had errors — still run semantics on the partial
    // AST so the user sees as much as possible, but mark the phase clearly.
    const s = runSemantic(syn.ast);
    sem = { diagnostics: s.diagnostics, symbols: s.symbols, phase: s.phase };
  }

  let failedPhase: CompilerResult['failedPhase'] = null;
  if (lex.phase.status === 'error') failedPhase = 'lexical';
  else if (syn.phase.status === 'error') failedPhase = 'syntactic';
  else if (sem && sem.phase.status === 'error') failedPhase = 'semantic';

  const overall: CompilerResult['overall'] = failedPhase ? 'error' : 'success';

  return {
    lexical: lex,
    syntactic: syn,
    semantic: sem,
    overall,
    failedPhase,
  };
}
