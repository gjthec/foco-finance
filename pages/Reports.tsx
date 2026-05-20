import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, BarChart3, Calendar, Loader2, Minus, TrendingDown, TrendingUp, Wallet, PiggyBank, List, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import { Ledger, Subscription, SubscriptionMonthStatus, Transaction, VaultMovement } from '../types';
import { storage } from '../storage';
import MonthSelect from '../components/MonthSelect';
import { BarChart, DonutChart } from '../components/CategoryCharts';
import { aggregateByCategoryForMonth, sumBucket, Bucket, ByCategory } from '../lib/aggregations';
import { formatBRL, formatMonthShort, previousMonthOf } from '../lib/format';

type CategoryRow = {
  name: string;
  value: number;
  previous: number;
  pct: number;
  delta: number;
  deltaPct: number | null;
};

const Reports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [statuses, setStatuses] = useState<SubscriptionMonthStatus[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [movements, setMovements] = useState<VaultMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'pie' | 'bar'>('list');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [t, s, st, l, m] = await Promise.all([
          storage.getTransactions(),
          storage.getSubscriptions(),
          storage.getSubscriptionMonthStatuses(),
          storage.getLedgers(),
          storage.getVaultMovements(),
        ]);
        setTransactions(t);
        setSubscriptions(s);
        setStatuses(st);
        setLedgers(l);
        setMovements(m);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const previousMonth = useMemo(() => previousMonthOf(selectedMonth), [selectedMonth]);

  const current = useMemo<ByCategory>(
    () => aggregateByCategoryForMonth({ month: selectedMonth, transactions, subscriptions, statuses, ledgers, movements }),
    [selectedMonth, transactions, subscriptions, statuses, ledgers, movements],
  );
  const previous = useMemo<ByCategory>(
    () => aggregateByCategoryForMonth({ month: previousMonth, transactions, subscriptions, statuses, ledgers, movements }),
    [previousMonth, transactions, subscriptions, statuses, ledgers, movements],
  );

  const totals = {
    income: sumBucket(current, 'income'),
    expense: sumBucket(current, 'expense'),
    reserve: sumBucket(current, 'reserve'),
  };
  const prevTotals = {
    income: sumBucket(previous, 'income'),
    expense: sumBucket(previous, 'expense'),
    reserve: sumBucket(previous, 'reserve'),
  };
  const balance = totals.income - totals.expense - totals.reserve;
  const prevBalance = prevTotals.income - prevTotals.expense - prevTotals.reserve;

  const buildRows = (key: keyof Bucket): CategoryRow[] => {
    const total = totals[key];
    const allCats = new Set<string>([...Object.keys(current), ...Object.keys(previous)]);
    const rows: CategoryRow[] = [];
    allCats.forEach((cat) => {
      const value = current[cat]?.[key] || 0;
      const prev = previous[cat]?.[key] || 0;
      if (value <= 0 && prev <= 0) return;
      const delta = value - prev;
      const deltaPct = prev > 0 ? (delta / prev) * 100 : value > 0 ? null : 0;
      rows.push({
        name: cat,
        value,
        previous: prev,
        pct: total > 0 ? (value / total) * 100 : 0,
        delta,
        deltaPct,
      });
    });
    return rows.sort((a, b) => b.value - a.value);
  };

  const expenseRows = useMemo(() => buildRows('expense'), [current, previous, totals.expense]);
  const incomeRows = useMemo(() => buildRows('income'), [current, previous, totals.income]);
  const reserveRows = useMemo(() => buildRows('reserve'), [current, previous, totals.reserve]);

  const formatDeltaPct = (deltaPct: number | null) => {
    if (deltaPct === null) return 'novo';
    if (deltaPct === 0) return '—';
    const sign = deltaPct > 0 ? '+' : '';
    return `${sign}${deltaPct.toFixed(1)}%`;
  };

  const deltaColor = (delta: number, isExpense: boolean) => {
    if (delta === 0) return 'text-gray-400';
    const wantUp = !isExpense;
    const isUp = delta > 0;
    if (wantUp === isUp) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const summaryDeltaColor = (current: number, previous: number, isExpense: boolean) => {
    if (current === previous) return 'text-gray-400';
    const wantUp = !isExpense;
    const isUp = current > previous;
    return wantUp === isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  };

  const renderSectionBody = (rows: CategoryRow[], kind: 'expense' | 'income' | 'reserve', total: number) => {
    if (viewMode === 'pie') {
      const accent = kind === 'expense' ? 'rose' : kind === 'income' ? 'emerald' : 'indigo';
      return <DonutChart rows={rows.map((r) => ({ name: r.name, value: r.value, pct: r.pct }))} accent={accent} total={total} />;
    }
    if (viewMode === 'bar') {
      const accent = kind === 'expense' ? 'rose' : kind === 'income' ? 'emerald' : 'indigo';
      return <BarChart rows={rows.map((r) => ({ name: r.name, value: r.value, pct: r.pct }))} accent={accent} />;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((row) => renderRow(row, kind))}
      </div>
    );
  };

  const renderRow = (row: CategoryRow, kind: 'expense' | 'income' | 'reserve') => {
    const accent =
      kind === 'expense' ? 'bg-rose-500'
      : kind === 'income' ? 'bg-emerald-500'
      : 'bg-indigo-500';
    const isExpense = kind === 'expense';
    return (
      <div key={row.name} className="bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-black dark:text-white truncate tracking-tight">{row.name}</h4>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
              Mês anterior: {formatBRL(row.previous)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-black dark:text-white tracking-tight">{formatBRL(row.value)}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{row.pct.toFixed(1)}% do total</p>
          </div>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-2 rounded-full ${accent}`} style={{ width: `${Math.min(100, row.pct)}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
          <span className={`inline-flex items-center gap-1 ${deltaColor(row.delta, isExpense)}`}>
            {row.delta === 0 ? <Minus size={12} strokeWidth={3} /> : row.delta > 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
            {row.delta === 0 ? '—' : `${row.delta > 0 ? '+' : ''}${formatBRL(row.delta)}`}
          </span>
          <span className={`${deltaColor(row.delta, isExpense)}`}>{formatDeltaPct(row.deltaPct)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Relatórios</h1>
          <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">Quanto entra e quanto sai por categoria</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative shrink-0">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <MonthSelect
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-black dark:text-white appearance-none"
            />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
            vs. {formatMonthShort(previousMonth)}
          </span>
          <div className="ml-auto flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800/60 rounded-xl">
            {[
              { key: 'list', label: 'Lista', icon: List },
              { key: 'pie', label: 'Pizza', icon: PieChartIcon },
              { key: 'bar', label: 'Barras', icon: BarChart2 },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewMode(key as typeof viewMode)}
                title={label}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all ${
                  viewMode === key
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                }`}
              >
                <Icon size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* RESUMO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                  <ArrowUpCircle size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Entradas</span>
              </div>
              <p className="text-2xl font-black dark:text-white tracking-tight">{formatBRL(totals.income)}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${summaryDeltaColor(totals.income, prevTotals.income, false)}`}>
                {totals.income === prevTotals.income ? '— vs. mês anterior' : `${totals.income > prevTotals.income ? '↑' : '↓'} ${formatBRL(Math.abs(totals.income - prevTotals.income))} vs. mês anterior`}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600">
                  <ArrowDownCircle size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saídas</span>
              </div>
              <p className="text-2xl font-black dark:text-white tracking-tight">{formatBRL(totals.expense)}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${summaryDeltaColor(totals.expense, prevTotals.expense, true)}`}>
                {totals.expense === prevTotals.expense ? '— vs. mês anterior' : `${totals.expense > prevTotals.expense ? '↑' : '↓'} ${formatBRL(Math.abs(totals.expense - prevTotals.expense))} vs. mês anterior`}
              </p>
            </div>

            <div className={`p-5 rounded-[24px] border shadow-sm ${
              balance >= 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50'
                : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-2xl ${balance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'}`}>
                  <Wallet size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saldo do mês</span>
              </div>
              <p className={`text-2xl font-black tracking-tight ${balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {formatBRL(balance)}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-gray-400">
                Mês anterior: {formatBRL(prevBalance)}
              </p>
            </div>
          </div>

          {totals.reserve > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 p-4 rounded-[20px] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">
                  <PiggyBank size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Reservado em cofres este mês</p>
                  <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 truncate">{formatBRL(totals.reserve)}</p>
                </div>
              </div>
            </div>
          )}

          {/* SAÍDAS POR CATEGORIA */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">Saídas por categoria</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{expenseRows.length} {expenseRows.length === 1 ? 'categoria' : 'categorias'}</span>
            </div>
            {expenseRows.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-600 bg-white dark:bg-slate-900 rounded-[24px] border border-dashed border-gray-200 dark:border-slate-800">
                <BarChart3 size={32} className="mx-auto opacity-30 mb-3" />
                <p className="text-sm font-bold">Sem saídas neste mês.</p>
              </div>
            ) : (
              renderSectionBody(expenseRows, 'expense', totals.expense)
            )}
          </section>

          {/* ENTRADAS POR CATEGORIA */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Entradas por categoria</h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{incomeRows.length} {incomeRows.length === 1 ? 'categoria' : 'categorias'}</span>
            </div>
            {incomeRows.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-600 bg-white dark:bg-slate-900 rounded-[24px] border border-dashed border-gray-200 dark:border-slate-800">
                <BarChart3 size={32} className="mx-auto opacity-30 mb-3" />
                <p className="text-sm font-bold">Sem entradas neste mês.</p>
              </div>
            ) : (
              renderSectionBody(incomeRows, 'income', totals.income)
            )}
          </section>

          {/* RESERVAS POR CATEGORIA (opcional, só se houver) */}
          {reserveRows.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Reservas por categoria</h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{reserveRows.length} {reserveRows.length === 1 ? 'categoria' : 'categorias'}</span>
              </div>
              {renderSectionBody(reserveRows, 'reserve', totals.reserve)}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
