
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
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dívidas Compartilhadas</h1>
          <p className="text-gray-500 dark:text-gray-400">Sincronizado via Firebase Firestore</p>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="animate-spin text-indigo-600 w-5 h-5" />}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md active:scale-95"
          >
            <Plus size={20} />
            Nova Pessoa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ledgers.length === 0 && !isLoading ? (
          <div className="col-span-full py-20 bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <Users size={48} className="text-gray-200 dark:text-slate-800 mb-4" />
            <p>Nenhuma dívida registrada ainda.</p>
          </div>
        ) : (
          ledgers.map(ledger => {
            const balance = calculateBalance(ledger);
            return (
              <Link
                key={ledger.id}
                to={`/ledger/${ledger.id}`}
                className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <UserPlus size={24} />
                  </div>
                  {ledger.publicReadEnabled && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                      <Share2 size={10} /> Público
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">{ledger.friendName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate italic">Ref: {ledger.title}</p>
                <div className="pt-4 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">Acerto Geral</p>
                    <p className={`text-sm font-bold truncate ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {balance === 0 ? 'Tudo pago' : `${balance > 0 ? 'Ele te deve' : 'Você deve'} R$ ${Math.abs(balance).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="text-indigo-400 dark:text-indigo-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0 ml-2">
                    <ArrowRight size={20} />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-slate-800">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-black dark:text-white tracking-tight">Nova Conta Compartilhada</h2>
              <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateLedger} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome do Amigo / Pessoa</label>
                <input required disabled={isSaving} type="text" value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} placeholder="Ex: João Silva" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Título / Referência</label>
                <input required disabled={isSaving} type="text" value={newLedgerName} onChange={(e) => setNewLedgerName(e.target.value)} placeholder="Ex: Aluguel, Viagem..." className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
              </div>
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} />}
                  {isSaving ? 'Criando no Firestore...' : 'Criar Ledger'}
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
