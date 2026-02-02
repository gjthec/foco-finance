
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, ArrowRight, Share2, X, UserPlus, Loader2, Check } from 'lucide-react';
import { Ledger } from '../types';
import { storage } from '../storage';

const LedgerList: React.FC = () => {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newFriendName, setNewFriendName] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const data = await storage.getLedgers();
    setLedgers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    if (isModalOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newLedgerName && newFriendName) {
      setIsSaving(true);
      const newLedger: Ledger = {
        id: Math.random().toString(36).substr(2, 9),
        title: newLedgerName,
        friendName: newFriendName,
        publicSlug: `${newLedgerName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 6)}`,
        publicReadEnabled: false,
        entries: []
      };
      
      try {
        await storage.saveLedger(newLedger);
        await loadData();
        setNewLedgerName('');
        setNewFriendName('');
        setIsModalOpen(false);
      } catch (err) {
        alert("Erro ao criar ledger.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const calculateBalance = (ledger: Ledger) => {
    return ledger.entries.reduce((acc, entry) => {
      if (entry.status === 'paid') return acc;
      const multiplier = entry.paidBy === 'me' ? 1 : -1;
      return acc + (entry.amount * multiplier);
    }, 0);
  };

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Dívidas</h1>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em]">Contas Compartilhadas</p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="animate-spin text-indigo-600 w-5 h-5" />}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
          >
            <Plus size={20} strokeWidth={3} />
            Novo Registro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ledgers.length === 0 && !isLoading ? (
          <div className="col-span-full py-24 bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-[40px] flex flex-col items-center justify-center text-gray-400">
            <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
              <Users size={40} className="opacity-20" />
            </div>
            <p className="text-sm font-bold tracking-tight px-10 text-center">Inicie uma nova divisão de gastos para ver aqui.</p>
          </div>
        ) : (
          ledgers.map(ledger => {
            const balance = calculateBalance(ledger);
            return (
              <Link
                key={ledger.id}
                to={`/ledger/${ledger.id}`}
                className="group bg-white dark:bg-slate-900 p-7 rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                    <UserPlus size={26} strokeWidth={2.5} />
                  </div>
                  {ledger.publicReadEnabled && (
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800/20">
                      <Share2 size={12} /> Público
                    </span>
                  )}
                </div>
                
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1 truncate tracking-tight">{ledger.friendName}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate font-bold uppercase tracking-widest">{ledger.title}</p>
                </div>

                <div className="pt-6 border-t border-gray-50 dark:border-slate-800/50 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-black text-gray-300 dark:text-slate-600 tracking-[0.2em] mb-1">Saldo Líquido</p>
                    <p className={`text-lg font-black truncate leading-none ${balance === 0 ? 'text-gray-400' : balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {balance === 0 ? 'Liquidado' : formatBRL(Math.abs(balance))}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-300 dark:text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:translate-x-2">
                    <ArrowRight size={24} strokeWidth={3} />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md md:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 border border-gray-100 dark:border-slate-800 flex flex-col">
            <div className="md:hidden flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="p-7 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-black dark:text-white tracking-tighter">Novo Registro</h2>
              <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="p-3 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-colors disabled:opacity-50"><X size={26} /></button>
            </div>
            <form onSubmit={handleCreateLedger} className="p-7 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Amigo / Entidade</label>
                <input required disabled={isSaving} type="text" value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} placeholder="Ex: Lucas Mendes" className="w-full px-5 py-4.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 text-base font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Título do Acerto</label>
                <input required disabled={isSaving} type="text" value={newLedgerName} onChange={(e) => setNewLedgerName(e.target.value)} placeholder="Ex: Apartamento, Carnaval..." className="w-full px-5 py-4.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 text-base font-bold" />
              </div>
              <div className="pt-4 pb-4">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.25em] rounded-2xl shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} strokeWidth={4} />}
                  {isSaving ? 'SALVANDO...' : 'CRIAR ACERTO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default LedgerList;
