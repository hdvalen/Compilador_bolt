// Symbol table for MiniCompiler with nested scopes.
// Each scope tracks declared variables and their metadata. Scopes form a
// stack: pushing creates a child scope (if/while blocks), popping returns to
// the enclosing scope.

import { DataType } from './ast';

export interface SymbolEntry {
  name: string;
  dataType: DataType;
  category: 'variable';
  scopeId: number;
  scopePath: string; // human-readable scope name, e.g. "global > if@3"
  declarationLine: number;
  initialized: boolean;
}

export class Scope {
  id: number;
  name: string;
  parent: Scope | null;
  symbols = new Map<string, SymbolEntry>();

  constructor(id: number, name: string, parent: Scope | null) {
    this.id = id;
    this.name = name;
    this.parent = parent;
  }

  // Search this scope and ancestors for a symbol.
  resolve(name: string): SymbolEntry | null {
    if (this.symbols.has(name)) return this.symbols.get(name)!;
    return this.parent ? this.parent.resolve(name) : null;
  }

  // Only look in this scope — used to detect duplicate declarations.
  resolveLocal(name: string): SymbolEntry | null {
    return this.symbols.get(name) ?? null;
  }

  pathString(): string {
    const parts: string[] = [];
    let s: Scope | null = this;
    while (s) {
      parts.unshift(s.name);
      s = s.parent;
    }
    return parts.join(' > ');
  }
}

export class SymbolTable {
  private global: Scope;
  private current: Scope;
  private nextId = 0;
  private allScopes: Scope[] = [];

  constructor() {
    this.global = new Scope(this.nextId++, 'global', null);
    this.current = this.global;
    this.allScopes.push(this.global);
  }

  pushScope(name: string): void {
    const scope = new Scope(this.nextId++, name, this.current);
    this.allScopes.push(scope);
    this.current = scope;
  }

  popScope(): void {
    if (this.current.parent) this.current = this.current.parent;
  }

  declare(
    name: string,
    dataType: DataType,
    declarationLine: number,
    initialized: boolean
  ): SymbolEntry {
    const entry: SymbolEntry = {
      name,
      dataType,
      category: 'variable',
      scopeId: this.current.id,
      scopePath: this.current.pathString(),
      declarationLine,
      initialized,
    };
    this.current.symbols.set(name, entry);
    return entry;
  }

  resolve(name: string): SymbolEntry | null {
    return this.current.resolve(name);
  }

  resolveLocal(name: string): SymbolEntry | null {
    return this.current.resolveLocal(name);
  }

  markInitialized(name: string): void {
    const entry = this.current.resolve(name);
    if (entry) entry.initialized = true;
  }

  // Collect every symbol from every scope for the UI table.
  allSymbols(): SymbolEntry[] {
    const out: SymbolEntry[] = [];
    for (const scope of this.allScopes) {
      for (const entry of scope.symbols.values()) out.push(entry);
    }
    return out;
  }
}
