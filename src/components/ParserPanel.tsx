import { useState } from 'react';
import { ParseError } from '@/compiler/parser';
import { TreeViewer } from './TreeViewer';
import { AlertCircle, FileJson, GitBranch } from 'lucide-react';

interface ParserPanelProps {
  astJson: unknown;
  errors: ParseError[];
}

type Tab = 'arbol' | 'json' | 'errores';

export function ParserPanel({ astJson, errors }: ParserPanelProps) {
  const [tab, setTab] = useState<Tab>('arbol');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'arbol', label: 'Árbol sintáctico', icon: <GitBranch size={14} /> },
    { id: 'json', label: 'AST (JSON)', icon: <FileJson size={14} /> },
    { id: 'errores', label: `Errores (${errors.length})`, icon: <AlertCircle size={14} /> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-lg bg-slate-800/60 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === t.id ? 'bg-cyan-500 text-slate-900' : 'text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'arbol' && (
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-700 bg-slate-900/60 p-3 font-mono text-xs">
          <TreeViewer data={astJson} />
        </div>
      )}

      {tab === 'json' && (
        <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">
          {astJson ? JSON.stringify(astJson, null, 2) : 'No hay AST disponible.'}
        </pre>
      )}

      {tab === 'errores' && (
        <ul className="space-y-2">
          {errors.map((e, i) => (
            <li key={i} className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400" />
                <span className="font-mono text-slate-400">{e.code}</span>
                <span className="ml-auto font-mono text-slate-400">
                  L{e.line}:C{e.column}
                </span>
              </div>
              <p className="mt-1 text-slate-200">{e.message}</p>
            </li>
          ))}
          {errors.length === 0 && (
            <li className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              No se detectaron errores sintácticos.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
