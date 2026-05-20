import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthShort } from '../lib/format';

interface MonthSelectProps {
  value: string;                  // formato YYYY-MM
  onChange: (yyyyMm: string) => void;
  className?: string;             // estilo do botão de trigger (segue padrão do sistema)
  disabled?: boolean;
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const POPOVER_WIDTH = 256;

const MonthSelect: React.FC<MonthSelectProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) return parseInt(value.slice(0, 4), 10);
    return new Date().getFullYear();
  });
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Quando reabrir, sincroniza a visualização do ano com o valor atual.
  useEffect(() => {
    if (!open) return;
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      setViewYear(parseInt(value.slice(0, 4), 10));
    }
  }, [open, value]);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const viewportWidth = window.innerWidth;
    let left = rect.left;
    // Não sair da viewport pela direita.
    if (left + POPOVER_WIDTH + margin > viewportWidth) {
      left = Math.max(margin, viewportWidth - POPOVER_WIDTH - margin);
    }
    if (left < margin) left = margin;
    setCoords({ top: rect.bottom + margin, left });
  }, []);

  // Calcula posição assim que abre e quando viewport mexe.
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => reposition();
    const onScroll = () => setOpen(false);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, reposition]);

  // Fecha ao clicar fora ou ESC.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectedYear = useMemo(() => (value && /^\d{4}-\d{2}$/.test(value) ? parseInt(value.slice(0, 4), 10) : null), [value]);
  const selectedMonth = useMemo(() => (value && /^\d{4}-\d{2}$/.test(value) ? parseInt(value.slice(5, 7), 10) : null), [value]);

  const pick = (monthIndex: number) => {
    const m = String(monthIndex + 1).padStart(2, '0');
    onChange(`${viewYear}-${m}`);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={className}
      >
        {formatMonthShort(value)}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
          className="z-[200] p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 active:scale-90 transition-transform"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
            <span className="text-sm font-black tracking-tight dark:text-white">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 active:scale-90 transition-transform"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS_PT.map((label, idx) => {
              const isSelected = selectedYear === viewYear && selectedMonth === idx + 1;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pick(idx)}
                  className={`aspect-square rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                      : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default MonthSelect;
