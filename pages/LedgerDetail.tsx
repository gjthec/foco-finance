
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// Added 'Check' to the imports from lucide-react
import { ArrowLeft, Share2, Plus, Copy, CheckCircle2, Trash2, Clock, ShieldCheck, Wallet, X, Calendar, ArrowUpRight, ArrowDownLeft, ExternalLink, Loader2, Check } from 'lucide-react';
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

  if (!ledger) return <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-bold">Registro não encontrado.</div>;

  return (
    <div className={`space-y-6 ${isPublic ? 'max-w-3xl mx-auto p-4 md:p-12' : ''}`}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            {!isPublic && (
              <Link to="/ledger" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline mb-2 transition-all w-fit">
                <ArrowLeft size={16} /> Voltar para lista
              </Link>
            )}
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{ledger.friendName}</h1>
              {isPublic && (
                <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck size={12} /> Somente Leitura
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Relatório: {ledger.title}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
             {isSaving && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mr-2" />}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold dark:text-white"
              />
            </div>
            {!isPublic && (
              <div className="flex items-center gap-2">
                <div className="flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={togglePublic}
                    disabled={isSaving}
                    className={`p-2.5 transition-all ${ledger.publicReadEnabled ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-400'}`}
                    title="Ativar Link Público"
                  >
                    <Share2 size={20} />
                  </button>
                  {ledger.publicReadEnabled && (
                    <button
                      onClick={copyLink}
                      className="p-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800 border-l border-gray-100 dark:border-slate-800"
                      title="Copiar Link"
                    >
                      {copyFeedback ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Copy size={20} />}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  <Plus size={18} /> Novo Item
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Eu paguei este mês</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 truncate">R$ {monthlyStats.mePaid.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{ledger.friendName} pagou este mês</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 truncate">R$ {monthlyStats.friendPaid.toFixed(2)}</p>
          </div>
          <div className={`p-5 rounded-2xl border shadow-lg transition-all ${
            totalBalance === 0 ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800' : 
            totalBalance > 0 ? 'bg-emerald-600 border-emerald-500 text-white' : 
            'bg-rose-600 border-rose-500 text-white'
          }`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${totalBalance === 0 ? 'text-gray-400' : 'text-white/70'}`}>Acerto Final Geral</p>
            <p className="text-xl font-black truncate">R$ {Math.abs(totalBalance).toFixed(2)}</p>
            <p className={`text-[10px] font-bold ${totalBalance === 0 ? 'text-emerald-500' : 'text-white/90'}`}>
              {totalBalance === 0 ? 'Em dia' : totalBalance > 0 ? 'Ele te deve' : 'Você deve'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">
            {new Date(selectedMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <span className="text-xs font-bold text-gray-500">{monthlyEntries.length} lançamentos</span>
        </div>

        {monthlyEntries.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-600 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
            <Calendar size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhum registro para este mês.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {monthlyEntries.map((entry) => (
              <div
                key={entry.id}
                className={`group relative bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                  entry.status === 'paid' ? 'opacity-50 grayscale border-gray-100 dark:border-slate-800' : 'border-gray-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  entry.paidBy === 'me' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {entry.paidBy === 'me' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className={`text-sm font-bold truncate ${entry.status === 'paid' ? 'line-through' : 'text-gray-900 dark:text-white'}`}>
                      {entry.description}
                    </h4>
                    <span className={`text-base font-black shrink-0 ${
                      entry.paidBy === 'me' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      R$ {entry.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-gray-400">
                    <span className="flex items-center gap-1 uppercase tracking-tighter">
                      <Clock size={10} /> {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <span>•</span>
                    <span className="uppercase">Pago por: {entry.paidBy === 'me' ? 'Você' : ledger.friendName}</span>
                  </div>
                </div>

                {!isPublic && (
                  <div className="flex gap-1 shrink-0">
                     <button
                      onClick={() => markPaid(entry.id)}
                      disabled={isSaving}
                      className={`p-2 rounded-lg transition-all ${entry.status === 'paid' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-300 dark:text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'} disabled:opacity-50`}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      disabled={isSaving}
                      className="p-2 text-gray-300 dark:text-gray-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh] border border-gray-100 dark:border-slate-800">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black dark:text-white tracking-tight">Novo Gasto Dividido</h2>
              <button onClick={() => setShowAddModal(false)} disabled={isSaving} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"><X size={20} /></button>
            </div>
            <form onSubmit={addEntry} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Descrição do Gasto</label>
                <input required disabled={isSaving} name="description" placeholder="Ex: Pizza, Mercado, Uber..." className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Valor Total (R$)</label>
                  <input required disabled={isSaving} type="number" step="0.01" min="0" name="amount" placeholder="0,00" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-lg font-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Data</label>
                  <input required disabled={isSaving} type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Quem pagou?</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="relative flex items-center justify-center gap-2 p-3 border border-gray-100 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-all has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white dark:text-gray-300">
                    <input type="radio" name="paidBy" value="me" defaultChecked disabled={isSaving} className="hidden" />
                    <span className="text-xs font-black uppercase tracking-widest">Eu Paguei</span>
                  </label>
                  <label className="relative flex items-center justify-center gap-2 p-3 border border-gray-100 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-all has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600 has-[:checked]:text-white dark:text-gray-300">
                    <input type="radio" name="paidBy" value="friend" disabled={isSaving} className="hidden" />
                    <span className="text-xs font-black uppercase tracking-widest">{ledger.friendName}</span>
                  </label>
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 shrink-0">
              <button 
                type="submit"
                disabled={isSaving}
                onClick={(e) => {
                  const form = (e.currentTarget.parentElement?.previousElementSibling as HTMLFormElement);
                  if(form.reportValidity()) form.requestSubmit();
                }} 
                className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} />}
                {isSaving ? 'Salvando no Firebase...' : 'Salvar Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerDetail;
