
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, Landmark, Calendar, Edit2, Trash2, FileText, ExternalLink, Loader2, Filter } from 'lucide-react';
import { Transaction, TransactionType, Ledger } from '../types';
import { storage } from '../storage';
import { TRANSACTION_CATEGORIES } from '../constants';
import TransactionModal from '../components/TransactionModal';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    if (transactions.length === 0) setIsLoading(true);
    try {
      const [txs, ldgs] = await Promise.all([
        storage.getTransactions(),
        storage.getLedgers()
      ]);
      setTransactions(txs);
      setLedgers(ldgs);
    } catch (e) {
      console.error("Erro ao carregar dados do Firebase", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveTx = async (newTx: Transaction) => {
    try {
      setTransactions(prev => {
        const index = prev.findIndex(t => t.id === newTx.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = newTx;
          return updated;
        }
        return [newTx, ...prev];
      });
      await storage.saveTransaction(newTx);
      loadData();
    } catch (e) {
      alert("Erro ao salvar transação no servidor.");
      throw e;
    }
  };

  const deleteTx = async (id: string) => {
    if (confirm('Deseja excluir este lançamento?')) {
      const oldTransactions = [...transactions];
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      try {
        await storage.deleteTransaction(id);
      } catch (e) {
        setTransactions(oldTransactions);
        alert("Erro ao excluir transação no servidor.");
      }
    }
  };

  const ledgerTransactions = useMemo(() => {
    return ledgers.map(l => {
      const balance = l.entries.reduce((acc, entry) => {
        if (entry.status === 'paid') return acc;
        return entry.paidBy === 'me' ? acc + entry.amount : acc - entry.amount;
      }, 0);
      if (balance === 0) return null;
      return {
        id: `ledger-ref-${l.id}`,
        date: 'Pendente',
        type: (balance > 0 ? 'INCOME' : 'EXPENSE') as TransactionType,
        value: Math.abs(balance),
        category: 'Dívida Compartilhada',
        note: `Acerto com ${l.friendName}`,
        isLedgerSummary: true,
        ledgerId: l.id
      };
    }).filter(Boolean) as any[];
  }, [ledgers]);

  const filteredTransactions = useMemo(() => {
    const realFiltered = transactions.filter(tx => tx.date.startsWith(selectedMonth));
    const combined = [...ledgerTransactions, ...realFiltered].filter(tx => {
      const matchesSearch = tx.note?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
      const matchesCategory = categoryFilter === 'ALL' || tx.category === categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    });
    return combined.sort((a, b) => {
      if (a.date === 'Pendente') return -1;
      if (b.date === 'Pendente') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, ledgerTransactions, selectedMonth, searchTerm, typeFilter, categoryFilter]);

  const stats = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      if (tx.type === 'INCOME') acc.income += tx.value;
      else acc.expense += tx.value;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [filteredTransactions]);

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">Fluxo</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em]">Gestão em Tempo Real</p>
          </div>
          {isLoading && <Loader2 className="animate-spin text-indigo-600 w-5 h-5" />}
        </div>
        
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-all shrink-0 active:scale-90 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-500'}`}
          >
            <Filter size={20} />
          </button>
          <button
            onClick={() => { setEditingTx(undefined); setIsModalOpen(true); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] whitespace-nowrap"
          >
            <Plus size={18} strokeWidth={3} />
            Lançar
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl animate-in slide-in-from-top-4 duration-300">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-3 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-[10px] font-black uppercase tracking-widest appearance-none"
              >
                <option value="ALL">Tipos</option>
                <option value="INCOME">Entradas</option>
                <option value="EXPENSE">Saídas</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl outline-none text-[10px] font-black uppercase tracking-widest appearance-none"
              >
                <option value="ALL">Categorias</option>
                {TRANSACTION_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Entradas', value: stats.income, icon: ArrowUpCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Saídas', value: stats.expense, icon: ArrowDownCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { label: 'Líquido', value: stats.balance, icon: Landmark, color: stats.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className={`p-3.5 ${stat.bg} ${stat.color} rounded-2xl shrink-0`}>
              <stat.icon size={26} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">{stat.label}</p>
              <p className={`text-xl font-black truncate leading-none ${stat.color}`}>{formatBRL(stat.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3.5">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-gray-200 dark:border-slate-800 text-gray-400">
            <FileText size={48} className="opacity-10 mb-4" />
            <p className="text-sm font-bold tracking-tight">Vazio por aqui...</p>
          </div>
        ) : (
          filteredTransactions.map(tx => {
            const isLedger = 'isLedgerSummary' in tx;
            return (
              <div 
                key={tx.id} 
                className={`group bg-white dark:bg-slate-900 p-4.5 rounded-[24px] border transition-all flex items-center gap-4 active:scale-[0.98] ${
                  isLedger ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-gray-100 dark:border-slate-800'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  tx.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                }`}>
                  {tx.type === 'INCOME' ? <ArrowUpCircle size={28} strokeWidth={2.5} /> : <ArrowDownCircle size={28} strokeWidth={2.5} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white truncate pr-2 tracking-tight">
                      {tx.note || tx.category}
                    </h4>
                    <span className={`text-base font-black whitespace-nowrap tracking-tight ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatBRL(tx.value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                    <span className={isLedger ? 'text-indigo-600 dark:text-indigo-400' : ''}>{tx.category}</span>
                    <span>•</span>
                    <span>{isLedger ? 'Pendente' : new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {isLedger ? (
                    <button 
                      onClick={() => navigate(`/ledger/${(tx as any).ledgerId}`)}
                      className="p-3 text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl active:bg-indigo-600 active:text-white transition-colors"
                    >
                      <ExternalLink size={20} />
                    </button>
                  ) : (
                    <>
                      <button onClick={() => { setEditingTx(tx); setIsModalOpen(true); }} className="p-3 text-gray-400 hover:text-indigo-600 active:bg-gray-100 dark:active:bg-slate-800 rounded-xl transition-colors">
                        <Edit2 size={20} />
                      </button>
                      <button onClick={() => deleteTx(tx.id)} className="p-3 text-gray-400 hover:text-rose-600 active:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTx(undefined); }} onSave={saveTx} initialData={editingTx} existingTransactions={transactions} />
    </div>
  );
};
export default Dashboard;
