import { useRef, useEffect, useMemo } from 'react';
import { highlight } from '@/utils/highlight';

interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  errorLines: number[];
}

// A simple syntax-highlighted editor: a transparent <textarea> overlays a
// <pre> that renders the highlighted HTML. Both share the same font metrics
// and scroll, so the colored text shows through the transparent text caret.
export function CodeEditor({ value, onChange, errorLines }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => highlight(value), [value]);
  const lineCount = value.split('\n').length;

  function syncScroll() {
    if (!textareaRef.current || !preRef.current || !gutterRef.current) return;
    preRef.current.scrollTop = textareaRef.current.scrollTop;
    preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    gutterRef.current.scrollTop = textareaRef.current.scrollTop;
  }

  useEffect(() => {
    syncScroll();
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Auto-indent: pressing Enter copies the indentation of the current line.
    if (e.key === 'Enter') {
      const ta = e.currentTarget;
      const pos = ta.selectionStart;
      const before = value.slice(0, pos);
      const lineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.slice(lineStart);
      const indentMatch = currentLine.match(/^[ \t]*/);
      const indent = indentMatch ? indentMatch[0] : '';
      // Extra indent after an opening brace.
      const extra = /[{(]\s*$/.test(currentLine) ? '    ' : '';
      const insert = '\n' + indent + extra;
      e.preventDefault();
      const next = value.slice(0, pos) + insert + value.slice(ta.selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = pos + insert.length;
      });
    }
  }

  const errorSet = useMemo(() => new Set(errorLines), [errorLines]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 font-mono text-sm">
      <div
        ref={gutterRef}
        className="select-none overflow-hidden bg-slate-950/60 py-3 text-right text-slate-500"
        style={{ minWidth: '3rem' }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className={`px-2 leading-6 ${errorSet.has(i + 1) ? 'bg-red-500/20 font-semibold text-red-300' : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <pre
          ref={preRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre p-3 text-slate-100"
        >
          {lines.map((l, i) => (
            <div
              key={i}
              className="min-h-[1.5rem] leading-6"
              dangerouslySetInnerHTML={{ __html: l.html }}
            />
          ))}
        </pre>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="absolute inset-0 resize-none overflow-auto whitespace-pre bg-transparent p-3 font-mono leading-6 text-transparent caret-cyan-300 outline-none"
        />
      </div>
    </div>
  );
}
