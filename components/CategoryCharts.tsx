import React, { useMemo } from 'react';
import { formatBRL } from '../lib/format';

export type ChartRow = {
  name: string;
  value: number;
  pct: number;
};

type Accent = 'rose' | 'emerald' | 'indigo';

const PALETTES: Record<Accent, string[]> = {
  // Vermelho/laranja/amarelo — gradação para saídas.
  rose: ['#f43f5e', '#f97316', '#f59e0b', '#fb7185', '#fbbf24', '#ef4444', '#fb923c', '#facc15'],
  // Verde/teal — gradação para entradas.
  emerald: ['#10b981', '#14b8a6', '#22c55e', '#06b6d4', '#34d399', '#84cc16', '#2dd4bf', '#6ee7b7'],
  // Azul/violeta — gradação para reservas/cofres.
  indigo: ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#3b82f6', '#0ea5e9', '#6d28d9', '#7c3aed'],
};

const colorFor = (palette: string[], idx: number) => palette[idx % palette.length];

// ───────────────────────── Donut chart ─────────────────────────

interface DonutProps {
  rows: ChartRow[];
  accent: Accent;
  total: number;
}

export const DonutChart: React.FC<DonutProps> = ({ rows, accent, total }) => {
  const palette = PALETTES[accent];
  const RADIUS = 70;
  const STROKE = 24;
  const SIZE = (RADIUS + STROKE / 2) * 2 + 4;
  const CIRC = 2 * Math.PI * RADIUS;

  const slices = useMemo(() => {
    let acc = 0;
    return rows.map((row, idx) => {
      const length = (row.pct / 100) * CIRC;
      const offset = -acc;
      acc += length;
      return {
        ...row,
        idx,
        length,
        offset,
        color: colorFor(palette, idx),
      };
    });
  }, [rows, palette, CIRC]);

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          {/* Trilha de fundo */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-gray-100 dark:text-slate-800"
          />
          {slices.map((s) => (
            <circle
              key={s.name}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.length} ${CIRC - s.length}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Total</p>
          <p className="text-base font-black dark:text-white tracking-tight leading-none mt-1">{formatBRL(total)}</p>
        </div>
      </div>

      <ul className="space-y-2 min-w-0">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="flex-1 min-w-0 truncate text-xs font-black uppercase tracking-wider text-gray-600 dark:text-slate-300">{s.name}</span>
            <span className="text-xs font-black tracking-tight dark:text-white whitespace-nowrap">{formatBRL(s.value)}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap w-12 text-right">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ───────────────────────── Bar chart ─────────────────────────

interface BarProps {
  rows: ChartRow[];
  accent: Accent;
}

export const BarChart: React.FC<BarProps> = ({ rows, accent }) => {
  const palette = PALETTES[accent];
  const max = Math.max(...rows.map((r) => r.value), 1);

  if (rows.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
      {rows.map((row, idx) => {
        const width = (row.value / max) * 100;
        const color = colorFor(palette, idx);
        return (
          <div key={row.name} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-slate-300 truncate">{row.name}</span>
              <span className="text-xs font-black tracking-tight dark:text-white whitespace-nowrap">{formatBRL(row.value)}</span>
            </div>
            <div className="relative h-6 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">
                {row.pct.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
