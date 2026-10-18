import { useMemo, useState } from 'react';
import { Token, categoryOf, TokenCategory } from '@/compiler/tokens';
import { LexicalError } from '@/compiler/lexer';
import { AlertCircle, Filter } from 'lucide-react';

interface TokensPanelProps {
  tokens: Token[];
  errors: LexicalError[];
}

const CATEGORY_LABEL: Record<TokenCategory | 'all', string> = {
  all: 'Todos',
  keyword: 'Palabras reservadas',
  identifier: 'Identificadores',
  literal: 'Literales',
  operator: 'Operadores',
  delimitador: 'Delimitadores',
  puntuacion: 'Puntuación',
  comentario: 'Comentarios',
};

const TYPE_CLASS: Record<string, string> = {
  INT: 'bg-emerald-500/15 text-emerald-300', FLOAT: 'bg-emerald-500/15 text-emerald-300',
  STRING: 'bg-emerald-500/15 text-emerald-300', BOOL: 'bg-emerald-500/15 text-emerald-300',
  IF: 'bg-emerald-500/15 text-emerald-300', ELSE: 'bg-emerald-500/15 text-emerald-300',
  WHILE: 'bg-emerald-500/15 text-emerald-300', PRINT: 'bg-emerald-500/15 text-emerald-300',
  TRUE: 'bg-emerald-500/15 text-emerald-300', FALSE: 'bg-emerald-500/15 text-emerald-300',
  IDENTIFIER: 'bg-cyan-500/15 text-cyan-300',
  INTEGER_LITERAL: 'bg-amber-500/15 text-amber-300', FLOAT_LITERAL: 'bg-amber-500/15 text-amber-300',
  STRING_LITERAL: 'bg-rose-500/15 text-rose-300',
  COMMENT: 'bg-slate-500/15 text-slate-400',
};

export function TokensPanel({ tokens, errors }: TokensPanelProps) {
  const [filter, setFilter] = useState<TokenCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const visible = tokens.filter((t) => t.type !== 'EOF');
    if (filter === 'all') return visible;
    return visible.filter((t) => categoryOf(t.type) === filter);
  }, [tokens, filter]);

  const badge = (type: string) => TYPE_CLASS[type] ?? 'bg-slate-500/15 text-slate-300';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        {(Object.keys(CATEGORY_LABEL) as (TokenCategory | 'all')[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              filter === k
                ? 'bg-cyan-500 text-slate-900'
                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60'
            }`}
          >
            {CATEGORY_LABEL[k]}
          </button>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-300">
            <AlertCircle size={16} /> Errores léxicos ({errors.length})
          </h4>
          <ul className="space-y-1.5 text-xs">
            {errors.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-2 text-slate-300">
                <span className="font-mono text-red-300">L{e.line}:C{e.column}</span>
                <span className="text-slate-400">{e.code}</span>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-slate-700">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-800 text-slate-400">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Lexema</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Línea</th>
              <th className="px-3 py-2">Columna</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {filtered.map((t, i) => (
              <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/40">
                <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge(t.type)}`}>
                    {t.type}
                  </span>
                </td>
                <td className="max-w-[12rem] truncate px-3 py-1.5 text-slate-200">
                  {t.lexeme || '\u00a0'}
                </td>
                <td className="max-w-[10rem] truncate px-3 py-1.5 text-slate-400">
                  {t.value === null ? '\u2014' : String(t.value)}
                </td>
                <td className="px-3 py-1.5 text-slate-400">{t.line}</td>
                <td className="px-3 py-1.5 text-slate-400">
                  {t.startColumn}-{t.endColumn}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No hay tokens en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        {filtered.length} token(s) mostrados · {tokens.length - 1} en total (sin contar EOF).
      </p>
    </div>
  );
}
