
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Plus, Copy, CheckCircle2, Trash2, Clock, ShieldCheck, X, Calendar, ArrowUpRight, ArrowDownLeft, Loader2, Check, CheckCircle, Edit2, Wallet } from 'lucide-react';
import { Ledger, LedgerEntry } from '../types';
import { storage } from '../storage';
import ConfirmDialog from '../components/ConfirmDialog';

const LedgerDetail: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [batchSuccessFeedback, setBatchSuccessFeedback] = useState(false);
  const [batchError, setBatchError] = useState('');
  
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [confirmPayAll, setConfirmPayAll] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [batchDescription, setBatchDescription] = useState('');
  const [batchAmount, setBatchAmount] = useState('');
  const [batchPaidBy, setBatchPaidBy] = useState<'me' | 'friend'>('me');
  const [batchStartMonth, setBatchStartMonth] = useState(new Date().toISOString().slice(0, 7));
  const [batchMonthCount, setBatchMonthCount] = useState(3);
  const [batchSelectionMode, setBatchSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [batchGenerationMode, setBatchGenerationMode] = useState<'fixed' | 'installment' | 'manual'>('fixed');
  const [batchDueDay, setBatchDueDay] = useState('');
  const [batchManualValues, setBatchManualValues] = useState<Record<string, string>>({});
  const [batchSelectedMonths, setBatchSelectedMonths] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (isPublic && slug) {
        const result = await storage.getLedgerBySlug(slug);
        setLedger(result || null);
      } else if (id) {
        const all = await storage.getLedgers();
        setLedger(all.find(l => l.id === id) || null);
      }
    };
    fetchData();
  }, [id, slug, isPublic]);

  useEffect(() => {
    if (showAddModal || showBatchModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showAddModal, showBatchModal]);

  useEffect(() => {
    setBatchStartMonth(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    if (!showBatchModal) return;
    if (batchSelectionMode !== 'auto') return;
    const [startYear, startMonthNumber] = batchStartMonth.split('-').map(Number);
    if (!startYear || !startMonthNumber) return;
    const months = Array.from({ length: Math.max(1, batchMonthCount) }, (_, index) => {
      const date = new Date(startYear, startMonthNumber - 1 + index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
    setBatchSelectedMonths(months);
  }, [batchStartMonth, batchMonthCount, batchSelectionMode, showBatchModal]);

  const monthlyEntries = useMemo(() => {
    if (!ledger) return [];
    return ledger.entries.filter(entry => entry.date.startsWith(selectedMonth));
  }, [ledger, selectedMonth]);

  const hasUnpaidEntries = useMemo(() => {
    return monthlyEntries.some(e => e.status === 'open');
  }, [monthlyEntries]);

  const totalBalanceOpen = useMemo(() => {
    if (!ledger) return 0;
    return ledger.entries.reduce((acc, entry) => {
      if (entry.status === 'paid') return acc;
      return entry.paidBy === 'me' ? acc + entry.amount : acc - entry.amount;
    }, 0);
  }, [ledger]);

  const monthlyStats = useMemo(() => {
    return monthlyEntries.reduce((acc, entry) => {
      if (entry.paidBy === 'me') acc.mePaid += entry.amount;
      else acc.friendPaid += entry.amount;
      return acc;
    }, { mePaid: 0, friendPaid: 0 });
  }, [monthlyEntries]);

  const updateLedger = async (updated: Ledger) => {
    if (isPublic) return;
    setIsSaving(true);
    setLedger(updated);
    try {
      await storage.saveLedger(updated);
      await storage.syncPublicLedger(updated);
    } catch (error) {
      console.error("Error updating ledger:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setShowAddModal(true);
  };

  const togglePublic = () => {
    if (!ledger) return;
    updateLedger({ ...ledger, publicReadEnabled: !ledger.publicReadEnabled });
  };

  const copyLink = () => {
    if (!ledger) return;
    const url = `${window.location.origin}/#/public/${ledger.publicSlug}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const addOrUpdateEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ledger) return;
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const paidBy = formData.get('paidBy') as 'me' | 'friend';
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;

    if (isNaN(amount) || amount < 0) return;

    if (editingEntry) {
      const updatedEntries = ledger.entries.map(e => 
        e.id === editingEntry.id 
          ? { ...e, amount, paidBy, description, date, owesTo: (paidBy === 'me' ? 'friend' : 'me') as 'me' | 'friend' } 
          : e
      );
      await updateLedger({ ...ledger, entries: updatedEntries });
    } else {
      const newEntry: LedgerEntry = {
        id: Math.random().toString(36).substr(2, 9),
        date: date || new Date().toISOString().slice(0, 10),
        amount,
        paidBy,
        owesTo: paidBy === 'me' ? 'friend' : 'me',
        description,
        status: 'open'
      };
      await updateLedger({ ...ledger, entries: [newEntry, ...ledger.entries] });
    }
    
    setShowAddModal(false);
    setEditingEntry(null);
  };

  const markPaid = (entryId: string) => {
    if (!ledger) return;
    updateLedger({
      ...ledger,
      entries: ledger.entries.map(e => e.id === entryId ? { ...e, status: e.status === 'paid' ? 'open' : 'paid' } : e)
    });
  };

  const handlePayAll = async () => {
    if (!ledger) return;
    const updatedEntries = ledger.entries.map(entry => {
      if (entry.date.startsWith(selectedMonth)) {
        return { ...entry, status: 'paid' as const };
      }
      return entry;
    });
    await updateLedger({ ...ledger, entries: updatedEntries });
    setConfirmPayAll(false);
  };

  const executeDelete = () => {
    const entryId = confirmDelete.id;
    if (!ledger || !entryId) return;
    updateLedger({ ...ledger, entries: ledger.entries.filter(e => e.id !== entryId) });
  };

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatMonthLabel = (monthValue: string) => {
    return new Date(`${monthValue}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };
  const monthGrid = useMemo(() => {
    const [startYear, startMonthNumber] = batchStartMonth.split('-').map(Number);
    if (!startYear || !startMonthNumber) return [];
    return Array.from({ length: 18 }, (_, index) => {
      const date = new Date(startYear, startMonthNumber - 1 + index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
  }, [batchStartMonth]);
  const sortedBatchMonths = useMemo(() => {
    return [...batchSelectedMonths].sort((a, b) => a.localeCompare(b));
  }, [batchSelectedMonths]);
  const parsedBatchAmount = parseFloat(batchAmount) || 0;
  const batchPreviewRows = useMemo(() => {
    if (sortedBatchMonths.length === 0) return [];
    if (batchGenerationMode === 'installment') {
      const totalCents = Math.round(parsedBatchAmount * 100);
      const baseInstallment = Math.floor(totalCents / sortedBatchMonths.length);
      const remaining = totalCents - (baseInstallment * sortedBatchMonths.length);
      return sortedBatchMonths.map((month, index) => {
        const cents = index === sortedBatchMonths.length - 1 ? baseInstallment + remaining : baseInstallment;
        return { month, value: cents / 100 };
      });
    }
    return sortedBatchMonths.map((month) => {
      const manualValue = parseFloat(batchManualValues[month] || '');
      return {
        month,
        value: batchGenerationMode === 'manual' && !Number.isNaN(manualValue) ? manualValue : parsedBatchAmount
      };
    });
  }, [sortedBatchMonths, batchGenerationMode, parsedBatchAmount, batchManualValues]);
  const batchPreviewTotal = useMemo(() => batchPreviewRows.reduce((acc, item) => acc + item.value, 0), [batchPreviewRows]);

  useEffect(() => {
    if (!showBatchModal) return;
    if (batchGenerationMode !== 'manual') return;
    setBatchManualValues((previous) => {
      const next: Record<string, string> = {};
      sortedBatchMonths.forEach((month) => {
        next[month] = previous[month] ?? String(parsedBatchAmount || 0);
      });
      return next;
    });
  }, [batchGenerationMode, sortedBatchMonths, parsedBatchAmount, showBatchModal]);

  const resetBatchModal = () => {
    setBatchDescription('');
    setBatchAmount('');
    setBatchPaidBy('me');
    setBatchStartMonth(selectedMonth);
    setBatchMonthCount(3);
    setBatchSelectionMode('auto');
    setBatchGenerationMode('fixed');
    setBatchDueDay('');
    setBatchManualValues({});
    setBatchSelectedMonths([]);
    setBatchError('');
  };

  const applyQuickMonthSelection = (monthsAhead: number) => {
    setBatchSelectionMode('auto');
    setBatchMonthCount(monthsAhead);
  };

  const toggleBatchMonth = (monthValue: string) => {
    setBatchSelectionMode('manual');
    setBatchSelectedMonths((previous) => {
      if (previous.includes(monthValue)) return previous.filter((month) => month !== monthValue);
      return [...previous, monthValue];
    });
  };

  const resolveEntryDate = (monthValue: string) => {
    const due = parseInt(batchDueDay, 10);
    const [year, month] = monthValue.split('-').map(Number);
    if (!year || !month) return `${monthValue}-01`;
    const maxDay = new Date(year, month, 0).getDate();
    const safeDay = Number.isNaN(due) || due < 1 ? 1 : Math.min(due, maxDay);
    return `${monthValue}-${String(safeDay).padStart(2, '0')}`;
  };

  const submitBatchEntries = async () => {
    if (!ledger || parsedBatchAmount < 0 || batchPreviewRows.length === 0 || !batchDescription.trim()) {
      setBatchError('Preencha os dados obrigatórios e selecione ao menos um mês.');
      return;
    }
    if (batchGenerationMode === 'manual' && batchPreviewRows.some((row) => row.value < 0 || Number.isNaN(row.value))) {
      setBatchError('Revise os valores manuais antes de confirmar.');
      return;
    }
    setBatchError('');
    const newEntries: LedgerEntry[] = batchPreviewRows.map((row) => ({
      id: Math.random().toString(36).substr(2, 9),
      date: resolveEntryDate(row.month),
      amount: row.value,
      paidBy: batchPaidBy,
      owesTo: batchPaidBy === 'me' ? 'friend' : 'me',
      description: batchDescription.trim(),
      status: 'open'
    }));
    await updateLedger({ ...ledger, entries: [...newEntries, ...ledger.entries] });
    setShowBatchModal(false);
    setBatchSuccessFeedback(true);
    resetBatchModal();
    setTimeout(() => setBatchSuccessFeedback(false), 2500);
  };

  if (!ledger) return <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-bold">Registro não encontrado.</div>;

  const currentMonthName = new Date(selectedMonth + '-01T12:00:00').toLocaleString('pt-BR', { month: 'short' }).toUpperCase();

  return (
    <div className={`space-y-6 pb-20 md:pb-0 ${isPublic ? 'max-w-3xl mx-auto' : ''}`}>
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          {!isPublic && (
            <Link to="/ledger" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] hover:underline mb-2 transition-all w-fit">
              <ArrowLeft size={14} strokeWidth={3} /> Meus Registros
            </Link>
          )}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none truncate pr-4">{ledger.friendName}</h1>
            {isPublic && (
              <span className="shrink-0 flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-800/40">
                <ShieldCheck size={12} /> Somente Leitura
              </span>
            )}
            {isSaving && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
          </div>
          <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest truncate italic">Asunto: {ledger.title}</p>
        </div>

        {/* ACTIONS BAR */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="relative shrink-0">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-black dark:text-white"
            />
          </div>
          {!isPublic && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={togglePublic}
                  disabled={isSaving}
                  className={`p-2.5 transition-all ${ledger.publicReadEnabled ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-400'}`}
                >
                  <Share2 size={20} />
                </button>
                {ledger.publicReadEnabled && (
                  <button
                    onClick={copyLink}
                    className="p-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800 border-l border-gray-100 dark:border-slate-800"
                  >
                    {copyFeedback ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Copy size={20} />}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setConfirmPayAll(true)}
                disabled={isSaving || !hasUnpaidEntries}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale ${
                  hasUnpaidEntries 
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white' 
                  : 'bg-gray-100 text-gray-400 dark:bg-slate-800'
                }`}
              >
                <CheckCircle size={16} strokeWidth={3} /> Liquidar {currentMonthName}
              </button>

              <button
                onClick={() => { setEditingEntry(null); setShowAddModal(true); }}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] disabled:opacity-50"
              >
                <Plus size={16} strokeWidth={3} /> Lançar
              </button>
              <button
                onClick={() => { setShowBatchModal(true); setBatchStartMonth(selectedMonth); }}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                <Calendar size={16} strokeWidth={3} /> Lançar vários meses
              </button>
            </div>
          )}
        </div>
      </div>
      {batchSuccessFeedback && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl text-xs font-black tracking-wide uppercase">
          Lançamentos em lote criados com sucesso.
        </div>
      )}

      {/* STATS CARDS - IMPROVED DESIGN */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2 truncate">Eu Paguei ({currentMonthName})</p>
          <p className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 truncate leading-none">{formatBRL(monthlyStats.mePaid)}</p>
        </div>
        
        <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2 truncate">{ledger.friendName.split(' ')[0]} ({currentMonthName})</p>
          <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 truncate leading-none">{formatBRL(monthlyStats.friendPaid)}</p>
        </div>

        <div className={`p-4 rounded-[28px] border shadow-lg col-span-2 md:col-span-1 flex flex-col justify-between min-h-[90px] transition-all relative overflow-hidden group ${
          totalBalanceOpen === 0 ? 'bg-emerald-600 border-emerald-500 text-white' : 
          totalBalanceOpen > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' : 
          'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50 text-rose-700 dark:text-rose-400'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[9px] font-black uppercase tracking-[0.15em] ${totalBalanceOpen === 0 ? 'text-emerald-100' : 'text-gray-500 dark:text-slate-400'}`}>Saldo Pendente Geral</p>
            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
              totalBalanceOpen === 0 ? 'bg-white text-emerald-600' : 
              totalBalanceOpen > 0 ? 'bg-emerald-200 dark:bg-emerald-400 text-emerald-800' : 'bg-rose-200 dark:bg-rose-400 text-rose-800'
            }`}>
              {totalBalanceOpen === 0 ? 'Quitado' : totalBalanceOpen > 0 ? 'Receber' : 'Pagar'}
            </div>
          </div>
          <div className="flex items-baseline gap-1 min-w-0">
            <p className="text-2xl font-black truncate leading-none tracking-tighter">{formatBRL(Math.abs(totalBalanceOpen))}</p>
          </div>
          <Wallet className={`absolute -right-2 -bottom-2 w-12 h-12 opacity-10 group-hover:scale-110 transition-transform ${totalBalanceOpen === 0 ? 'text-white' : 'text-current'}`} />
        </div>
      </div>

      {/* ENTRIES LIST */}
      <div className="space-y-3">
        {monthlyEntries.length === 0 ? (
          <div className="py-20 text-center text-gray-400 dark:text-gray-600 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-gray-200 dark:border-slate-800">
            <p className="text-sm font-bold tracking-tight px-10">Não há gastos registrados para {selectedMonth}.</p>
          </div>
        ) : (
          monthlyEntries.map((entry) => (
            <div
              key={entry.id}
              className={`group bg-white dark:bg-slate-900 p-4 rounded-[24px] border transition-all flex items-center gap-4 active:scale-[0.98] ${
                entry.status === 'paid' ? 'opacity-40 grayscale border-gray-50 dark:border-slate-800/50 shadow-none' : 'border-gray-100 dark:border-slate-800 shadow-sm'
              }`}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                entry.status === 'paid' ? 'bg-gray-50 dark:bg-slate-800' :
                entry.paidBy === 'me' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
              }`}>
                {entry.status === 'paid' ? <CheckCircle size={20} strokeWidth={2.5} /> : (entry.paidBy === 'me' ? <ArrowUpRight size={20} strokeWidth={2.5} /> : <ArrowDownLeft size={20} strokeWidth={2.5} />)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5 gap-2">
                  <h4 className={`text-sm font-black truncate tracking-tight ${entry.status === 'paid' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {entry.description}
                  </h4>
                  <span className={`text-sm font-black whitespace-nowrap tracking-tight ${
                    entry.status === 'paid' ? 'text-gray-400' : entry.paidBy === 'me' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {formatBRL(entry.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-0.5"><Clock size={10} /> {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  <span>•</span>
                  <span>Pagador: {entry.paidBy === 'me' ? 'Você' : ledger.friendName.split(' ')[0]}</span>
                </div>
              </div>

              {!isPublic && (
                <div className="flex gap-1 shrink-0 opacity-100 group-hover:opacity-100 md:opacity-0 transition-opacity">
                  <button
                    onClick={() => handleEdit(entry)}
                    disabled={isSaving}
                    className="p-2 text-gray-400 hover:text-indigo-600 active:bg-indigo-50 dark:active:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Edit2 size={18} strokeWidth={2.5} />
                  </button>
                   <button
                    onClick={() => markPaid(entry.id)}
                    disabled={isSaving}
                    className={`p-2 rounded-xl transition-all ${entry.status === 'paid' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-300 dark:text-gray-700 hover:text-emerald-600 active:bg-emerald-50'} disabled:opacity-50`}
                  >
                    <CheckCircle2 size={18} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ isOpen: true, id: entry.id })}
                    disabled={isSaving}
                    className="p-2 text-gray-300 dark:text-gray-700 hover:text-rose-600 active:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* CONFIRM DIALOGS */}
      <ConfirmDialog 
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Remover Gasto"
        message="Esta ação é irreversível e afetará seu saldo acumulado."
        confirmLabel="Sim, Remover"
      />

      <ConfirmDialog 
        isOpen={confirmPayAll}
        onClose={() => setConfirmPayAll(false)}
        onConfirm={handlePayAll}
        title="Liquidar Tudo"
        message={`Deseja marcar todos os lançamentos de ${currentMonthName} como resolvidos?`}
        confirmLabel="Sim, Liquidar"
        variant="info"
        icon="alert"
      />

      {/* ADD/EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md md:rounded-[32px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 dark:border-slate-800 animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95">
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black dark:text-white tracking-tight">{editingEntry ? 'Editar Gasto' : 'Dividir Gasto'}</h2>
              <button onClick={() => { setShowAddModal(false); setEditingEntry(null); }} className="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={addOrUpdateEntry} className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
                <input required name="description" defaultValue={editingEntry?.description || ''} placeholder="O que foi pago?" className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-base outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valor Total (R$)</label>
                  <input required type="number" step="0.01" min="0" name="amount" defaultValue={editingEntry?.amount || ''} placeholder="0,00" className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                  <input required type="date" name="date" defaultValue={editingEntry?.date || `${selectedMonth}-${new Date().toISOString().slice(8, 10)}`} className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Quem pagou?</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-center p-4 border border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-all active:scale-[0.97] text-gray-400 font-black uppercase text-[10px] tracking-widest">
                    <input type="radio" name="paidBy" value="me" defaultChecked={editingEntry ? editingEntry.paidBy === 'me' : true} className="hidden" />
                    <span>Eu Paguei</span>
                  </label>
                  <label className="flex items-center justify-center p-4 border border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-all active:scale-[0.97] text-gray-400 font-black uppercase text-[10px] tracking-widest">
                    <input type="radio" name="paidBy" value="friend" defaultChecked={editingEntry?.paidBy === 'friend'} className="hidden" />
                    <span className="truncate">{ledger.friendName.split(' ')[0]} Paguei</span>
                  </label>
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <button 
                type="submit"
                disabled={isSaving}
                onClick={(e) => {
                  const form = (e.currentTarget.parentElement?.previousElementSibling as HTMLFormElement);
                  if(form.reportValidity()) form.requestSubmit();
                }} 
                className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[20px] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={20} strokeWidth={3} />}
                {isSaving ? 'Gravando...' : (editingEntry ? 'Salvar Edição' : 'Confirmar Gasto')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl md:rounded-[32px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 dark:border-slate-800 animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black dark:text-white tracking-tight">Lançar vários meses</h2>
              <button onClick={() => { setShowBatchModal(false); resetBatchModal(); }} className="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
                  <input value={batchDescription} onChange={(e) => setBatchDescription(e.target.value)} placeholder="Ex: Dívida com pai" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-base outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{batchGenerationMode === 'installment' ? 'Valor total (R$)' : 'Valor por mês (R$)'}</label>
                  <input type="number" min="0" step="0.01" value={batchAmount} onChange={(e) => setBatchAmount(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-base outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mês inicial</label>
                  <input type="month" value={batchStartMonth} onChange={(e) => setBatchStartMonth(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Quantidade</label>
                  <input type="number" min="1" value={batchMonthCount} onChange={(e) => setBatchMonthCount(Math.max(1, Number(e.target.value) || 1))} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Vencimento (dia)</label>
                  <input type="number" min="1" max="31" value={batchDueDay} onChange={(e) => setBatchDueDay(e.target.value)} placeholder="1" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pagador</label>
                  <select value={batchPaidBy} onChange={(e) => setBatchPaidBy(e.target.value as 'me' | 'friend')} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                    <option value="me">Eu paguei</option>
                    <option value="friend">{ledger.friendName.split(' ')[0]} pagou</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Modo de geração</p>
                <div className="grid md:grid-cols-3 gap-2">
                  {[
                    { value: 'fixed', label: 'Recorrente fixa' },
                    { value: 'installment', label: 'Parcelada' },
                    { value: 'manual', label: 'Manual' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBatchGenerationMode(option.value as 'fixed' | 'installment' | 'manual')}
                      className={`p-3 rounded-2xl border text-xs font-black uppercase tracking-wider ${batchGenerationMode === option.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-500 dark:text-slate-300'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Seleção de meses</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => applyQuickMonthSelection(3)} className="px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700 rounded-lg">Próximos 3</button>
                    <button type="button" onClick={() => applyQuickMonthSelection(6)} className="px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700 rounded-lg">Próximos 6</button>
                    <button type="button" onClick={() => applyQuickMonthSelection(12)} className="px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700 rounded-lg">Próximos 12</button>
                    <button type="button" onClick={() => { setBatchSelectionMode('manual'); setBatchSelectedMonths([]); }} className="px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-slate-700 rounded-lg">Limpar</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {monthGrid.map((monthValue) => {
                    const isSelected = batchSelectedMonths.includes(monthValue);
                    return (
                      <button
                        type="button"
                        key={monthValue}
                        onClick={() => toggleBatchMonth(monthValue)}
                        className={`p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-300 border-gray-200 dark:border-slate-700'}`}
                      >
                        {formatMonthLabel(monthValue)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Preview</p>
                <div className="rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="max-h-52 overflow-y-auto">
                    {batchPreviewRows.length === 0 ? (
                      <p className="p-4 text-sm text-gray-400 dark:text-slate-500 font-bold">Selecione os meses para visualizar o preview.</p>
                    ) : (
                      batchPreviewRows.map((row) => (
                        <div key={row.month} className="p-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-300">{formatMonthLabel(row.month)}</span>
                          {batchGenerationMode === 'manual' ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={batchManualValues[row.month] ?? row.value}
                              onChange={(e) => setBatchManualValues((prev) => ({ ...prev, [row.month]: e.target.value }))}
                              className="w-36 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-black text-right outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          ) : (
                            <span className="text-sm font-black text-gray-900 dark:text-white">{formatBRL(row.value)}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 bg-gray-50/70 dark:bg-slate-800/50 flex items-center justify-between text-xs font-black uppercase tracking-wider">
                    <span>{batchPreviewRows.length} lançamentos serão criados</span>
                    <span>Total {formatBRL(batchPreviewTotal)}</span>
                  </div>
                </div>
                {batchError && <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{batchError}</p>}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <button
                type="button"
                disabled={isSaving}
                onClick={submitBatchEntries}
                className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[20px] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={20} strokeWidth={3} />}
                {isSaving ? 'Gravando...' : 'Confirmar lançamentos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerDetail;
