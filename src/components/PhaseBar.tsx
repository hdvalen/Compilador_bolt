import { PhaseState } from '@/compiler';
import { ScanText, Binary, Boxes, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

export type PhaseId = 'lexical' | 'syntactic' | 'semantic';

interface PhaseBarProps {
  phases: {
    lexical: PhaseState;
    syntactic: PhaseState;
    semantic: PhaseState | null;
  };
  selected: PhaseId | 'report';
  onSelect: (id: PhaseId | 'report') => void;
  failedPhase: string | null;
}

const PHASES: { id: PhaseId; label: string; icon: React.ReactNode }[] = [
  { id: 'lexical', label: 'Léxico', icon: <ScanText size={18} /> },
  { id: 'syntactic', label: 'Sintáctico', icon: <Binary size={18} /> },
  { id: 'semantic', label: 'Semántico', icon: <Boxes size={18} /> },
];

export function PhaseBar({ phases, selected, onSelect, failedPhase }: PhaseBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2 overflow-x-auto">
        {PHASES.map((p, i) => {
          const state = phases[p.id];
          const isActive = selected === p.id;
          return (
            <div key={p.id} className="flex items-center gap-2">
              <button
                onClick={() => onSelect(p.id)}
                className={`flex min-w-[9rem] flex-col gap-1 rounded-lg border px-3 py-2 text-left transition ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={isActive ? 'text-cyan-300' : 'text-slate-400'}>{p.icon}</span>
                  <span className="text-xs text-slate-500">Fase {i + 1}</span>
                  <StatusBadge status={state?.status ?? 'pending'} />
                </div>
                <span className={`text-sm font-semibold ${isActive ? 'text-cyan-200' : 'text-slate-200'}`}>
                  {p.label}
                </span>
                {state && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock size={10} /> {state.durationMs.toFixed(1)} ms
                  </span>
                )}
              </button>
              {i < PHASES.length - 1 && (
                <div className={`h-px w-4 ${failedPhase === p.id ? 'bg-red-500/60' : 'bg-slate-600'}`} />
              )}
            </div>
          );
        })}
        <button
          onClick={() => onSelect('report')}
          className={`flex min-w-[9rem] flex-col gap-1 rounded-lg border px-3 py-2 text-left transition ${
            selected === 'report'
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className={selected === 'report' ? 'text-cyan-300' : 'text-slate-400'} />
            <span className="text-xs text-slate-500">Informe</span>
          </div>
          <span className={`text-sm font-semibold ${selected === 'report' ? 'text-cyan-200' : 'text-slate-200'}`}>
            Resumen final
          </span>
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    success: { icon: <CheckCircle2 size={12} />, cls: 'text-emerald-300 bg-emerald-500/15', label: 'OK' },
    error: { icon: <XCircle size={12} />, cls: 'text-red-300 bg-red-500/15', label: 'Error' },
    running: { icon: <Loader2 size={12} className="animate-spin" />, cls: 'text-cyan-300 bg-cyan-500/15', label: '...' },
    pending: { icon: <Clock size={12} />, cls: 'text-slate-400 bg-slate-600/30', label: 'Pend.' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}
