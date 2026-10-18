import { CompilerResult } from '@/compiler';
import { CheckCircle2, XCircle, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface ReportPanelProps {
  result: CompilerResult;
}

export function ReportPanel({ result }: ReportPanelProps) {
  const lexErrors = result.lexical.errors.length;
  const synErrors = result.syntactic.errors.length;
  const semErrors = result.semantic
    ? result.semantic.diagnostics.filter((d) => d.severity === 'error').length
    : 0;
  const semWarnings = result.semantic
    ? result.semantic.diagnostics.filter((d) => d.severity === 'warning').length
    : 0;
  const tokenCount = result.lexical.tokens.length - 1; // exclude EOF
  const ok = result.overall === 'success';

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`flex items-center gap-3 rounded-lg border p-4 ${
          ok
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : 'border-red-500/40 bg-red-500/10'
        }`}
      >
        {ok ? (
          <CheckCircle2 size={28} className="text-emerald-400" />
        ) : (
          <XCircle size={28} className="text-red-400" />
        )}
        <div>
          <p className={`text-lg font-bold ${ok ? 'text-emerald-300' : 'text-red-300'}`}>
            {ok ? 'Compilación exitosa' : 'Compilación con errores'}
          </p>
          <p className="text-sm text-slate-300">
            {ok
              ? 'El código pasó las tres fases del compilador sin errores.'
              : `Falló en la fase: ${result.failedPhase}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Tokens generados" value={tokenCount} icon={<AlertCircle size={14} className="text-cyan-400" />} />
        <Stat label="Errores léxicos" value={lexErrors} icon={<AlertCircle size={14} className="text-red-400" />} tone={lexErrors ? 'red' : 'neutral'} />
        <Stat label="Errores sintácticos" value={synErrors} icon={<AlertCircle size={14} className="text-red-400" />} tone={synErrors ? 'red' : 'neutral'} />
        <Stat label="Errores semánticos" value={semErrors} icon={<AlertCircle size={14} className="text-red-400" />} tone={semErrors ? 'red' : 'neutral'} />
        <Stat label="Advertencias" value={semWarnings} icon={<AlertTriangle size={14} className="text-amber-400" />} tone={semWarnings ? 'amber' : 'neutral'} />
        <Stat
          label="Tiempo total"
          value={`${(
            result.lexical.phase.durationMs +
            result.syntactic.phase.durationMs +
            (result.semantic?.phase.durationMs ?? 0)
          ).toFixed(1)} ms`}
          icon={<Clock size={14} className="text-slate-400" />}
        />
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-200">Resumen por fase</h4>
        <ul className="space-y-2 text-sm">
          <PhaseRow name="Análisis léxico" status={result.lexical.phase.status} detail={`${tokenCount} tokens · ${lexErrors} errores`} />
          <PhaseRow name="Análisis sintáctico" status={result.syntactic.phase.status} detail={`${synErrors} errores`} />
          <PhaseRow
            name="Análisis semántico"
            status={result.semantic?.phase.status ?? 'pending'}
            detail={result.semantic ? `${semErrors} errores · ${semWarnings} advertencias · ${result.semantic.symbols.length} símbolos` : 'No ejecutada'}
          />
        </ul>
      </div>
    </div>
  );
}

function Stat({
  label, value, icon, tone = 'neutral',
}: { label: string; value: number | string; icon: React.ReactNode; tone?: 'red' | 'amber' | 'neutral' }) {
  const tones = {
    red: 'border-red-500/40 bg-red-500/5',
    amber: 'border-amber-500/40 bg-amber-500/5',
    neutral: 'border-slate-700 bg-slate-800/40',
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

function PhaseRow({
  name, status, detail,
}: { name: string; status: string; detail: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: 'Exitosa', cls: 'text-emerald-300 bg-emerald-500/15' },
    error: { label: 'Con errores', cls: 'text-red-300 bg-red-500/15' },
    pending: { label: 'Pendiente', cls: 'text-slate-400 bg-slate-600/30' },
    running: { label: 'Ejecutando', cls: 'text-cyan-300 bg-cyan-500/15' },
  };
  const s = map[status] ?? map.pending;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2">
      <span className="font-medium text-slate-200">{name}</span>
      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
      <span className="ml-auto text-xs text-slate-400">{detail}</span>
    </li>
  );
}
