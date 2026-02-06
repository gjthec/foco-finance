
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
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [confirmPayAll, setConfirmPayAll] = useState(false);
  
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
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};

export default LedgerDetail;
