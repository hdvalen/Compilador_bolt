import { SemanticDiagnostic, SymbolEntry } from '@/compiler/semantic';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface SemanticPanelProps {
  diagnostics: SemanticDiagnostic[];
  symbols: SymbolEntry[];
}

const TYPE_CLASS: Record<string, string> = {
  int: 'bg-emerald-500/15 text-emerald-300',
  float: 'bg-amber-500/15 text-amber-300',
  string: 'bg-rose-500/15 text-rose-300',
  bool: 'bg-cyan-500/15 text-cyan-300',
};

export function SemanticPanel({ diagnostics, symbols }: SemanticPanelProps) {
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat icon={<AlertCircle size={14} className="text-red-400" />} label="Errores" value={errors.length} tone="red" />
        <Stat icon={<AlertTriangle size={14} className="text-amber-400" />} label="Advertencias" value={warnings.length} tone="amber" />
        <Stat icon={<Info size={14} className="text-cyan-400" />} label="Símbolos" value={symbols.length} tone="cyan" />
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-200">Tabla de símbolos</h4>
        <div className="overflow-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-800 text-slate-400">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Ámbito</th>
                <th className="px-3 py-2">Línea</th>
                <th className="px-3 py-2">Inicializada</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((s, i) => (
                <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="px-3 py-1.5 font-mono text-slate-200">{s.name}</td>
                  <td className="px-3 py-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_CLASS[s.dataType] ?? 'bg-slate-600/40 text-slate-300'}`}>
                      {s.dataType}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-400">{s.category}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-400">{s.scopePath}</td>
                  <td className="px-3 py-1.5 text-slate-400">{s.declarationLine}</td>
                  <td className="px-3 py-1.5">
                    {s.initialized ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <span className="text-amber-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
              {symbols.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No se declararon variables.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-200">Diagnósticos</h4>
        <ul className="space-y-2">
          {diagnostics.map((d, i) => (
            <li
              key={i}
              className={`rounded-lg border p-3 text-xs ${
                d.severity === 'error'
                  ? 'border-red-500/40 bg-red-500/10'
                  : 'border-amber-500/40 bg-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {d.severity === 'error' ? (
                  <AlertCircle size={14} className="text-red-400" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-400" />
                )}
                <span className="font-mono text-slate-400">{d.code}</span>
                <span className="ml-auto font-mono text-slate-400">
                  L{d.line}:C{d.column}
                </span>
              </div>
              <p className="mt-1 text-slate-200">{d.message}</p>
              <p className="mt-1 text-slate-400">
                <span className="text-slate-500">Sugerencia: </span>
                {d.suggestion}
              </p>
            </li>
          ))}
          {diagnostics.length === 0 && (
            <li className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 size={14} /> Sin problemas semánticos.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Stat({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone: 'red' | 'amber' | 'cyan' }) {
  const tones = {
    red: 'border-red-500/40 bg-red-500/5 text-red-300',
    amber: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
    cyan: 'border-cyan-500/40 bg-cyan-500/5 text-cyan-300',
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="mt-1 text-slate-400">{label}</p>
    </div>
  );
}
