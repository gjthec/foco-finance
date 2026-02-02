
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, Landmark, Calendar, Edit2, Trash2, FileText, Users, ExternalLink, Loader2 } from 'lucide-react';
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

  const loadData = async () => {
    setIsLoading(true);
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
      await storage.saveTransaction(newTx);
      // Atualiza localmente primeiro para ser instantâneo após a confirmação do Firebase
      setTransactions(prev => {
        const index = prev.findIndex(t => t.id === newTx.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = newTx;
          return updated;
        }
        return [newTx, ...prev];
      });
      setIsModalOpen(false);
      setEditingTx(undefined);
      // Sincroniza o estado completo em background
      loadData();
    } catch (e) {
      alert("Erro ao salvar transação");
      throw e; // Lança para o modal saber que falhou
    }
  };

  const deleteTx = async (id: string) => {
    if (confirm('Deseja excluir este lançamento?')) {
      setIsLoading(true);
      try {
        await storage.deleteTransaction(id);
        await loadData();
      } catch (e) {
        alert("Erro ao excluir transação");
      } finally {
        setIsLoading(false);
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fluxo Mensal</h1>
          <p className="text-gray-500 dark:text-gray-400">Dados salvos na nuvem Firebase</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="animate-spin text-indigo-600 w-5 h-5" />}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => { setEditingTx(undefined); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md active:scale-95"
          >
            <Plus size={20} />
            Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 overflow-hidden">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <ArrowUpCircle size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">Entradas + A receber</p>
            <p className="text-lg md:text-xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight">{formatBRL(stats.income)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 overflow-hidden">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
            <ArrowDownCircle size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">Saídas + A pagar</p>
            <p className="text-lg md:text-xl font-black text-rose-600 dark:text-rose-400 truncate tracking-tight">{formatBRL(stats.expense)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4 overflow-hidden">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Landmark size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">Saldo Líquido</p>
            <p className={`text-lg md:text-xl font-black truncate tracking-tight ${stats.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatBRL(stats.balance)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar por nota ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm font-semibold"
        >
          <option value="ALL">Todos os Tipos</option>
          <option value="INCOME">Entradas</option>
          <option value="EXPENSE">Saídas</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm font-semibold"
        >
          <option value="ALL">Todas Categorias</option>
          <option value="Dívida Compartilhada">Dívidas Compartilhadas</option>
          {TRANSACTION_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 text-gray-200 dark:text-slate-800 mx-auto mb-3" />
                    <p>Nenhum lançamento encontrado.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isLedger = 'isLedgerSummary' in tx;
                  return (
                    <tr key={tx.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${isLedger ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {isLedger ? <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-tight">Aberto</span> : new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-sm font-semibold ${isLedger ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>{tx.note || tx.category}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{tx.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === 'INCOME' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400'}`}>
                          {tx.type === 'INCOME' ? (isLedger ? 'A Receber' : 'Entrada') : (isLedger ? 'A Pagar' : 'Saída')}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold text-right ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {tx.type === 'INCOME' ? '+ ' : '- '}{formatBRL(tx.value)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isLedger ? (
                            <button onClick={() => navigate(`/ledger/${(tx as any).ledgerId}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                              Ver Dívida <ExternalLink size={12} />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => { setEditingTx(tx); setIsModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => deleteTx(tx.id)} className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTx(undefined); }} onSave={saveTx} initialData={editingTx} existingTransactions={transactions} />
    </div>
  );
};
export default Dashboard;
