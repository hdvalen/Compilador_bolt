import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

// A generic tree node shape (the AST converted to plain JSON via astToJson).
interface JsonNode {
  [k: string]: unknown;
}
type JsonValue = JsonNode | JsonNode[] | string | number | boolean | null;

interface TreeViewerProps {
  data: unknown;
}

const PRIMITIVE_KEYS = new Set(['value', 'name', 'dataType', 'operator', 'line', 'column']);

export function TreeViewer({ data }: TreeViewerProps) {
  if (!data || typeof data !== 'object') {
    return <div className="text-slate-500">No hay AST disponible.</div>;
  }
  return (
    <ul className="tree-root">
      <TreeNode name="Programa" value={data as JsonValue} isRoot />
    </ul>
  );
}

function TreeNode({
  name,
  value,
  isRoot = false,
}: {
  name: string;
  value: JsonValue;
  isRoot?: boolean;
}) {
  const [open, setOpen] = useState(true);

  if (value === null) {
    return <Leaf name={name} value="null" className="text-slate-500" />;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <Leaf name={name} value={String(value)} className="text-amber-300" />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Leaf name={name} value="[]" className="text-slate-500" />;
    }
    return (
      <li>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className={isRoot ? 'font-semibold' : ''}>{name}</span>
          <span className="text-slate-500">[{value.length}]</span>
        </button>
        {open && (
          <ul className="ml-4 border-l border-slate-700 pl-2">
            {value.map((v, i) => (
              <TreeNode key={i} name={`${i}`} value={v as JsonValue} />
            ))}
          </ul>
        )}
      </li>
    );
  }
  // Object
  const obj = value as JsonNode;
  const type = typeof obj.type === 'string' ? (obj.type as string) : name;
  const childKeys = Object.keys(obj).filter((k) => !PRIMITIVE_KEYS.has(k));
  const primEntries = Object.entries(obj).filter(([k]) => PRIMITIVE_KEYS.has(k));

  return (
    <li>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-emerald-300 hover:text-emerald-200"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className={isRoot ? 'font-semibold' : ''}>{type}</span>
        {primEntries.map(([k, v]) => (
          <span key={k} className="ml-2 text-xs text-slate-400">
            <span className="text-slate-500">{k}:</span>{' '}
            <span className="text-amber-300">{String(v)}</span>
          </span>
        ))}
      </button>
      {open && childKeys.length > 0 && (
        <ul className="ml-4 border-l border-slate-700 pl-2">
          {childKeys.map((k) => (
            <TreeNode key={k} name={k} value={obj[k] as JsonValue} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Leaf({ name, value, className }: { name: string; value: string; className: string }) {
  return (
    <li className="flex gap-1">
      <span className="text-slate-500">{name}:</span>
      <span className={className}>{value}</span>
    </li>
  );
}
