import React, { useMemo } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Ledger } from '../types';
import { formatBRL, formatMonthShort } from '../lib/format';

interface Props {
  ledger: Ledger;
  onSelectMonth: (yyyyMm: string) => void;
}

// Visão geral de todos os meses da dívida: o que já foi pago, o que está em aberto e o próximo vencimento.
const LedgerOverview: React.FC<Props> = ({ ledger, onSelectMonth }) => {
  const friendFirst = ledger.friendName.split(' ')[0];

  const { months, paidTotal, openTotal, nextDue } = useMemo(() => {
    const sorted = [...ledger.entries].sort((a, b) => a.date.localeCompare(b.date));
    const groups = new Map<string, typeof sorted>();
    sorted.forEach(e => {
      const m = e.date.slice(0, 7);
      groups.set(m, [...(groups.get(m) || []), e]);
    });
    const months = Array.from(groups.entries()).map(([month, entries]) => ({
      month,
      entries,
      total: entries.reduce((acc, e) => acc + e.amount, 0),
      allPaid: entries.every(e => e.status === 'paid'),
    }));
    const paidTotal = sorted.filter(e => e.status === 'paid').reduce((a, e) => a + e.amount, 0);
    const openTotal = sorted.filter(e => e.status === 'open').reduce((a, e) => a + e.amount, 0);
    const today = new Date().toISOString().slice(0, 10);
    const nextOpen = sorted.find(e => e.status === 'open' && e.date >= today) || sorted.find(e => e.status === 'open');
    const nextDue = nextOpen
      ? {
          date: nextOpen.date,
          total: sorted.filter(e => e.status === 'open' && e.date === nextOpen.date).reduce((a, e) => a + e.amount, 0),
        }
      : null;
    return { months, paidTotal, openTotal, nextDue };
  }, [ledger.entries]);

  const openCount = ledger.entries.filter(e => e.status === 'open').length;
  const paidCount = ledger.entries.length - openCount;

  if (months.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-gray-200 dark:border-slate-800">
        <p className="text-sm font-bold">Nenhum lançamento nesta dívida ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-[24px] border border-emerald-100 dark:border-emerald-800/50 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-slate-400 mb-2">Já pago ({paidCount})</p>
          <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 truncate leading-none">{formatBRL(paidTotal)}</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-[24px] border border-rose-100 dark:border-rose-800/50 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 dark:text-slate-400 mb-2">Em aberto ({openCount})</p>
          <p className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-400 truncate leading-none">{formatBRL(openTotal)}</p>
        </div>
        <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-[24px] border border-gray-100 dark:border-slate-800 col-span-2 md:col-span-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2">Próximo vencimento</p>
          {nextDue ? (
            <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate leading-none">
              {formatBRL(nextDue.total)}
              <span className="text-xs font-bold text-gray-400 ml-2">{new Date(nextDue.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </p>
          ) : (
            <p className="text-sm font-black text-emerald-600">Nada em aberto</p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-gray-100 dark:border-slate-800 overflow-hidden">
        {months.map(({ month, entries, total, allPaid }) => (
          <button
            key={month}
            type="button"
            onClick={() => onSelectMonth(month)}
            className={`w-full text-left p-4 border-b last:border-b-0 border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${allPaid ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-slate-200">
                {allPaid ? <CheckCircle size={14} className="text-emerald-500" /> : <Clock size={14} className="text-rose-500" />}
                {formatMonthShort(month)}
              </span>
              <span className="text-sm font-black text-gray-900 dark:text-white whitespace-nowrap">{formatBRL(total)}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
              {entries.map(e => (
                <span
                  key={e.id}
                  className={`text-[11px] font-bold ${e.status === 'paid' ? 'line-through text-gray-400' : e.paidBy === 'me' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}
                  title={`Pagador: ${e.paidBy === 'me' ? 'Você' : friendFirst}`}
                >
                  {e.description} · {formatBRL(e.amount)}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LedgerOverview;
