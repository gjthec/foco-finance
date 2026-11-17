import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, Loader2, TrendingUp } from 'lucide-react';
import { Ledger, LedgerEntry } from '../types';
import MonthSelect from './MonthSelect';
import { formatBRL, formatMonthShort } from '../lib/format';
import { monthsBetween, progressiveValue } from '../lib/ledgerMath';

interface Props {
  ledger: Ledger;
  isSaving: boolean;
  initialMonth: string;
  onClose: () => void;
  onApply: (entries: LedgerEntry[]) => Promise<void>;
}

const inputClass =
  'w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-base outline-none focus:ring-2 focus:ring-indigo-500 font-bold dark:text-white';
const labelClass = 'block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1';

// Reajusta lançamentos EM ABERTO já existentes: valor = base + incremento × (meses desde o mês inicial).
// Lançamentos do mesmo mês recebem o mesmo valor (ex.: Consórcio Duan e Família).
const ProgressiveAdjustModal: React.FC<Props> = ({ ledger, isSaving, initialMonth, onClose, onApply }) => {
  const openEntries = useMemo(
    () => ledger.entries.filter(e => e.status === 'open').sort((a, b) => a.date.localeCompare(b.date)),
    [ledger.entries],
  );
  const descriptions = useMemo(
    () => Array.from(new Set<string>(openEntries.map(e => e.description.trim()))).sort((a, b) => a.localeCompare(b)),
    [openEntries],
  );

  const firstOpenMonth = openEntries[0]?.date.slice(0, 7);
  const [startMonth, setStartMonth] = useState(
    firstOpenMonth && firstOpenMonth > initialMonth ? firstOpenMonth : initialMonth,
  );
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>(descriptions);
  const [base, setBase] = useState('');
  const [increment, setIncrement] = useState('10');
  const [error, setError] = useState('');

  const targets = useMemo(
    () =>
      openEntries.filter(
        e => e.date.slice(0, 7) >= startMonth && selectedDescriptions.includes(e.description.trim()),
      ),
    [openEntries, startMonth, selectedDescriptions],
  );

  // Sugere como base o valor atual do primeiro lançamento afetado.
  useEffect(() => {
    if (base === '' && targets[0]) setBase(String(targets[0].amount));
  }, [targets, base]);

  const parsedBase = parseFloat(base);
  const parsedIncrement = parseFloat(increment);
  const valid = !Number.isNaN(parsedBase) && parsedBase >= 0 && !Number.isNaN(parsedIncrement);

  const preview = useMemo(
    () =>
      targets.map(entry => ({
        entry,
        newAmount: valid
          ? progressiveValue(parsedBase, parsedIncrement, monthsBetween(startMonth, entry.date.slice(0, 7)))
          : entry.amount,
      })),
    [targets, valid, parsedBase, parsedIncrement, startMonth],
  );

  const totals = preview.reduce(
    (acc, row) => ({ before: acc.before + row.entry.amount, after: acc.after + row.newAmount }),
    { before: 0, after: 0 },
  );

  const toggleDescription = (desc: string) =>
    setSelectedDescriptions(prev => (prev.includes(desc) ? prev.filter(d => d !== desc) : [...prev, desc]));

  const handleApply = async () => {
    if (!valid) return setError('Informe um valor inicial e um incremento válidos.');
    if (preview.length === 0) return setError('Nenhum lançamento em aberto selecionado.');
    if (preview.some(r => r.newAmount < 0)) return setError('O reajuste deixaria algum valor negativo.');
    setError('');
    const byId = new Map(preview.map(r => [r.entry.id, r.newAmount]));
    await onApply(ledger.entries.map(e => (byId.has(e.id) ? { ...e, amount: byId.get(e.id)! } : e)));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl md:rounded-[32px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 dark:border-slate-800">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black dark:text-white tracking-tight">Reajuste progressivo</h2>
            <p className="text-xs font-bold text-gray-400 mt-0.5">Aumenta um valor fixo a cada mês nos lançamentos em aberto.</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {openEntries.length === 0 ? (
            <p className="text-sm font-bold text-gray-400">Não há lançamentos em aberto nesta dívida.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>A partir de</label>
                  <MonthSelect value={startMonth} onChange={setStartMonth} className={`${inputClass} text-sm appearance-none`} />
                </div>
                <div>
                  <label className={labelClass}>Valor no 1º mês (R$)</label>
                  <input type="number" step="0.01" min="0" value={base} onChange={e => setBase(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Aumento por mês (R$)</label>
                  <input type="number" step="0.01" value={increment} onChange={e => setIncrement(e.target.value)} className={inputClass} />
                </div>
              </div>

              {descriptions.length > 1 && (
                <div>
                  <p className={labelClass}>Quais lançamentos</p>
                  <div className="flex flex-wrap gap-2">
                    {descriptions.map(desc => {
                      const on = selectedDescriptions.includes(desc);
                      return (
                        <button
                          key={desc}
                          type="button"
                          onClick={() => toggleDescription(desc)}
                          className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-300 border-gray-200 dark:border-slate-700'}`}
                        >
                          {desc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className={labelClass}>Preview</p>
                <div className="rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {preview.length === 0 ? (
                      <p className="p-4 text-sm text-gray-400 font-bold">Nenhum lançamento afetado.</p>
                    ) : (
                      preview.map(({ entry, newAmount }) => (
                        <div key={entry.id} className="p-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-300 mr-2">{formatMonthShort(entry.date.slice(0, 7))}</span>
                            <span className="font-bold text-gray-700 dark:text-slate-200 truncate">{entry.description}</span>
                          </div>
                          <div className="whitespace-nowrap font-black">
                            {newAmount !== entry.amount && (
                              <span className="text-gray-400 line-through mr-2 font-bold">{formatBRL(entry.amount)}</span>
                            )}
                            <span className="text-gray-900 dark:text-white">{formatBRL(newAmount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 bg-gray-50/70 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-xs font-black uppercase tracking-wider dark:text-slate-200">
                    <span>{preview.length} lançamentos</span>
                    <span>{formatBRL(totals.before)} → {formatBRL(totals.after)}</span>
                  </div>
                </div>
                {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{error}</p>}
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            disabled={isSaving || preview.length === 0}
            onClick={handleApply}
            className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[20px] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <TrendingUp size={18} strokeWidth={3} />}
            {isSaving ? 'Gravando...' : 'Aplicar reajuste'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressiveAdjustModal;
