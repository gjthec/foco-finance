
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Plus, Copy, CheckCircle2, Trash2, Clock, ShieldCheck, X, Calendar, ArrowUpRight, ArrowDownLeft, Loader2, Check } from 'lucide-react';
import { Ledger, LedgerEntry } from '../types';
import { storage } from '../storage';

const LedgerDetail: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

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
    if (showAddModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showAddModal]);

  const monthlyEntries = useMemo(() => {
    if (!ledger) return [];
    return ledger.entries.filter(entry => entry.date.startsWith(selectedMonth));
  }, [ledger, selectedMonth]);

  const totalBalance = useMemo(() => {
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
      alert("Erro ao sincronizar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
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

  const addEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ledger) return;
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const paidBy = formData.get('paidBy') as 'me' | 'friend';
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;

    if (isNaN(amount) || amount < 0) {
      alert("O valor não pode ser negativo.");
      return;
    }

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
    setShowAddModal(false);
  };

  const markPaid = (entryId: string) => {
    if (!ledger) return;
    updateLedger({
      ...ledger,
      entries: ledger.entries.map(e => e.id === entryId ? { ...e, status: e.status === 'paid' ? 'open' : 'paid' } : e)
    });
  };

  const deleteEntry = (entryId: string) => {
    if (!ledger) return;
    if (confirm('Excluir este item da dívida?')) {
      updateLedger({ ...ledger, entries: ledger.entries.filter(e => e.id !== entryId) });
    }
  };

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (!ledger) return <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-bold">Registro não encontrado.</div>;

  return (
    <div className={`space-y-6 pb-20 md:pb-0 ${isPublic ? 'max-w-3xl mx-auto' : ''}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          {!isPublic && (
            <Link to="/ledger" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-[0.2em] hover:underline mb-2 transition-all w-fit">
              <ArrowLeft size={16} strokeWidth={3} /> Voltar
            </Link>
          )}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none truncate pr-4">{ledger.friendName}</h1>
            {isPublic && (
              <span className="shrink-0 flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-800/40">
                <ShieldCheck size={12} /> Leitura
              </span>
            )}
            {isSaving && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-xs truncate italic opacity-70">Contexto: {ledger.title}</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                onClick={() => setShowAddModal(true)}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] disabled:opacity-50"
              >
                <Plus size={18} strokeWidth={3} /> Lançar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-gray-100 dark:border-slate-800 shadow-sm col-span-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Eu Paguei</p>
          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 truncate">{formatBRL(monthlyStats.mePaid)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-gray-100 dark:border-slate-800 shadow-sm col-span-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{ledger.friendName}</p>
          <p className="text-base font-black text-amber-600 dark:text-amber-400 truncate">{formatBRL(monthlyStats.friendPaid)}</p>
        </div>
        <div className={`p-4.5 rounded-[24px] border shadow-lg col-span-2 md:col-span-1 transition-all ${
          totalBalance === 0 ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800' : 
          totalBalance > 0 ? 'bg-emerald-600 border-emerald-500 text-white' : 
          'bg-rose-600 border-rose-500 text-white'
        }`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${totalBalance === 0 ? 'text-gray-400' : 'text-white/70'}`}>Acerto Final Geral</p>
          <div className="flex items-center justify-between">
            <p className="text-xl font-black truncate leading-none">{formatBRL(Math.abs(totalBalance))}</p>
            <p className={`text-[10px] font-black uppercase tracking-widest ${totalBalance === 0 ? 'text-emerald-500' : 'text-white/90'}`}>
              {totalBalance === 0 ? 'Ok' : totalBalance > 0 ? 'Receber' : 'Pagar'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {monthlyEntries.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-600 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-gray-200 dark:border-slate-800">
            <p className="text-sm font-bold tracking-tight">Vazio por aqui este mês.</p>
          </div>
        ) : (
          monthlyEntries.map((entry) => (
            <div
              key={entry.id}
              className={`group bg-white dark:bg-slate-900 p-4.5 rounded-[24px] border transition-all flex items-center gap-4 active:scale-[0.98] ${
                entry.status === 'paid' ? 'opacity-40 grayscale border-gray-50 dark:border-slate-800' : 'border-gray-100 dark:border-slate-800 shadow-sm'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                entry.paidBy === 'me' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
              }`}>
                {entry.paidBy === 'me' ? <ArrowUpRight size={22} strokeWidth={2.5} /> : <ArrowDownLeft size={22} strokeWidth={2.5} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h4 className={`text-sm font-black truncate pr-2 tracking-tight ${entry.status === 'paid' ? 'line-through' : 'text-gray-900 dark:text-white'}`}>
                    {entry.description}
                  </h4>
                  <span className={`text-base font-black whitespace-nowrap tracking-tight ${
                    entry.paidBy === 'me' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {formatBRL(entry.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <span className="flex items-center gap-0.5"><Clock size={12} /> {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  <span>•</span>
                  <span>Por: {entry.paidBy === 'me' ? 'Você' : ledger.friendName}</span>
                </div>
              </div>

              {!isPublic && (
                <div className="flex gap-1 shrink-0">
                   <button
                    onClick={() => markPaid(entry.id)}
                    disabled={isSaving}
                    className={`p-2.5 rounded-xl transition-all active:scale-90 ${entry.status === 'paid' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-300 dark:text-gray-700 hover:text-emerald-600'} disabled:opacity-50`}
                  >
                    <CheckCircle2 size={20} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    disabled={isSaving}
                    className="p-2.5 text-gray-300 dark:text-gray-700 hover:text-rose-600 transition-all active:scale-90 disabled:opacity-50"
                  >
                    <Trash2 size={20} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md md:rounded-[32px] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 dark:border-slate-800 animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95">
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black dark:text-white tracking-tight">Dividir Gasto</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={addEntry} className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">O que foi pago?</label>
                <input required name="description" placeholder="Ex: Mercado, Uber, Pizza..." className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-base outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valor Total (R$)</label>
                  <input required type="number" step="0.01" min="0" name="amount" placeholder="0,00" className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                  <input required type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Quem pagou desta vez?</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-center p-4 border border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-all active:scale-[0.97]">
                    <input type="radio" name="paidBy" value="me" defaultChecked className="hidden" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Eu Paguei</span>
                  </label>
                  <label className="flex items-center justify-center p-4 border border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white transition-all active:scale-[0.97]">
                    <input type="radio" name="paidBy" value="friend" className="hidden" />
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">{ledger.friendName}</span>
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
                {isSaving ? 'Lançando...' : 'Confirmar Gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerDetail;
