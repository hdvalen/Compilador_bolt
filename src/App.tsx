import { useMemo, useState } from 'react';
import {
  Play, Trash2, FileCode2, ChevronDown, Cpu, Loader2,
} from 'lucide-react';
import { CodeEditor } from '@/components/CodeEditor';
import { PhaseBar, PhaseId } from '@/components/PhaseBar';
import { TokensPanel } from '@/components/TokensPanel';
import { ParserPanel } from '@/components/ParserPanel';
import { SemanticPanel } from '@/components/SemanticPanel';
import { ReportPanel } from '@/components/ReportPanel';
import { EXAMPLES } from '@/data/examples';
import { compile, CompilerResult, PhaseState } from '@/compiler';

const INITIAL_CODE = `// Escribe código en MiniCompiler y pulsa Compilar
int edad = 20;
float nota = 4.5;
string nombre = "Valentina";
bool aprobado = true;

int resultado = 10 + 5 * 2;
print(resultado);

if (edad >= 18) {
    print(nombre);
} else {
    print("Menor de edad");
}
`;

type Mode = 'full' | 'phases';

export default function App() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [result, setResult] = useState<CompilerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<PhaseId | 'report'>('report');
  const [mode, setMode] = useState<Mode>('full');
  const [examplesOpen, setExamplesOpen] = useState(false);

  // Invalidate cached results when the source changes.
  const codeVersion = useMemo(() => code, [code]);
  const dirty = result !== null; // results become stale on next edit

  function handleCompile() {
    setBusy(true);
    // Defer to the next frame so the spinner can paint.
    requestAnimationFrame(() => {
      const r = compile(code);
      setResult(r);
      setBusy(false);
      if (mode === 'full') {
        if (r.failedPhase) setSelected(r.failedPhase);
        else setSelected('report');
      }
    });
  }

  function handleClear() {
    setCode('');
    setResult(null);
  }

  function loadExample(code: string) {
    setCode(code);
    setResult(null);
    setExamplesOpen(false);
  }

  function handleChange(v: string) {
    setCode(v);
    if (dirty) setResult(null);
  }

  // Collect line numbers with errors for editor gutter markers.
  const errorLines = useMemo(() => {
    if (!result) return [];
    const set = new Set<number>();
    result.lexical.errors.forEach((e) => set.add(e.line));
    result.syntactic.errors.forEach((e) => set.add(e.line));
    result.semantic?.diagnostics.forEach((d) => set.add(d.line));
    return [...set];
  }, [result]);

  const phases = result
    ? {
        lexical: result.lexical.phase,
        syntactic: result.syntactic.phase,
        semantic: result.semantic?.phase ?? null,
      }
    : {
        lexical: { status: 'pending', durationMs: 0 } as PhaseState,
        syntactic: { status: 'pending', durationMs: 0 } as PhaseState,
        semantic: null,
      };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Cpu className="text-cyan-400" size={24} />
          <div>
            <h1 className="text-lg font-bold text-slate-100">Compilador Educativo</h1>
            <p className="text-xs text-slate-500">Análisis léxico, sintáctico y semántico</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Modo:</span>
          <div className="flex rounded-md border border-slate-700">
            <button
              onClick={() => setMode('full')}
              className={`px-3 py-1 ${mode === 'full' ? 'bg-cyan-500 text-slate-900' : 'text-slate-300'}`}
            >
              Completo
            </button>
            <button
              onClick={() => setMode('phases')}
              className={`px-3 py-1 ${mode === 'phases' ? 'bg-cyan-500 text-slate-900' : 'text-slate-300'}`}
            >
              Por fases
            </button>
          </div>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Left: editor + controls */}
        <section className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCompile}
              disabled={busy}
              className="flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Compilar
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              <Trash2 size={16} /> Limpiar
            </button>
            <div className="relative">
              <button
                onClick={() => setExamplesOpen(!examplesOpen)}
                className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                <FileCode2 size={16} /> Ejemplos <ChevronDown size={14} />
              </button>
              {examplesOpen && (
                <div className="absolute z-20 mt-1 w-72 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.name}
                      onClick={() => loadExample(ex.code)}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-800"
                    >
                      <span className="font-medium text-slate-200">{ex.name}</span>
                      <span className="block text-xs text-slate-500">{ex.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {dirty && result === null && (
              <span className="text-xs text-amber-400">Código modificado — vuelve a compilar</span>
            )}
          </div>

          <div className="min-h-[50vh] flex-1 lg:min-h-0">
            <CodeEditor value={code} onChange={handleChange} errorLines={errorLines} />
          </div>

          <div className="text-xs text-slate-500">
            MiniCompiler · tipos: int, float, string, bool · comentarios con //
          </div>
        </section>

        {/* Right: phases + results */}
        <section className="flex min-h-0 flex-col gap-3">
          <PhaseBar
            phases={phases}
            selected={selected}
            onSelect={setSelected}
            failedPhase={result?.failedPhase ?? null}
          />

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            {!result && !busy && (
              <div className="flex h-full items-center justify-center text-center text-slate-500">
                <div>
                  <Cpu size={40} className="mx-auto mb-3 text-slate-700" />
                  <p>Pulsa <span className="text-cyan-400">Compilar</span> para analizar el código.</p>
                </div>
              </div>
            )}

            {busy && (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="animate-spin" /> <span className="ml-2">Analizando…</span>
              </div>
            )}

            {result && !busy && (
              <div>
                {selected === 'lexical' && (
                  <TokensPanel tokens={result.lexical.tokens} errors={result.lexical.errors} />
                )}
                {selected === 'syntactic' && (
                  <ParserPanel astJson={result.syntactic.astJson} errors={result.syntactic.errors} />
                )}
                {selected === 'semantic' &&
                  (result.semantic ? (
                    <SemanticPanel
                      diagnostics={result.semantic.diagnostics}
                      symbols={result.semantic.symbols}
                    />
                  ) : (
                    <div className="text-slate-500">
                      El análisis semántico no se ejecutó porque una fase anterior falló o no produjo un AST válido.
                    </div>
                  ))}
                {selected === 'report' && <ReportPanel result={result} />}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
