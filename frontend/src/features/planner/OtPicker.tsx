import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui';
import type { Employee } from '@/domain/types';

export function OtPicker({
  x,
  y,
  employee,
  currentOt,
  onSave,
  onClose,
}: {
  x: number;
  y: number;
  employee: Employee;
  currentOt: number;
  onSave: (hours: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [val, setVal] = useState<string>(String(currentOt ?? 0));

  useEffect(() => {
    // Focus input on open
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const t = setTimeout(() => window.addEventListener('mousedown', onDown), 0);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSave = () => {
    const parsed = parseFloat(val);
    const valid = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 2) / 2 : 0;
    onSave(valid);
  };

  // Keep inside viewport bounds
  const width = 230;
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, x));
  const top = Math.max(12, Math.min(window.innerHeight - 170, y));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      style={{ left, top, width }}
      className="fixed z-50 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3 shadow-pop"
    >
      <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
        <div className="min-w-0 pr-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Overtime (OT)</div>
          <div className="text-[12.5px] font-bold text-ink truncate">{employee.name}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-3 hover:text-ink text-[12px] p-1 rounded"
        >
          ✕
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="number"
            min={0}
            max={300}
            step={0.5}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="0"
            className="h-8 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 text-center font-mono text-[14px] font-bold text-ink focus:outline-none focus:border-[var(--accent)]"
          />
          <span className="text-[12px] font-mono text-ink-3">hrs OT</span>
        </div>

        {/* Quick select buttons */}
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setVal('0')}
            className={`py-1 rounded text-[11px] font-mono font-bold transition-all ${
              val === '0'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-[var(--surface-2)] text-ink-2 hover:bg-[var(--surface-3)]'
            }`}
          >
            0h
          </button>
          {[1, 2, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setVal(String(n))}
              className={`py-1 rounded text-[11px] font-mono transition-all ${
                val === String(n)
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/40 font-bold'
                  : 'bg-[var(--surface-2)] text-ink-2 hover:bg-[var(--surface-3)]'
              }`}
            >
              {n}h
            </button>
          ))}
        </div>

        {/* Action Check button */}
        <div className="mt-1 flex items-center justify-between pt-2 border-t border-[var(--line)]">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="px-2.5 text-[11.5px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm active:scale-95"
          >
            <span>✓</span>
            <span>Check / Save</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

