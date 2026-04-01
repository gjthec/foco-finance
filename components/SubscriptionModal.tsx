import React, { useEffect, useState } from 'react';
import { X, Loader2, Check, CheckCircle } from 'lucide-react';
import { Subscription, TransactionType } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subscription: Subscription) => Promise<void>;
  initialData?: Subscription;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [dueDay, setDueDay] = useState(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('Moradia');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    if (initialData) {
      setTitle(initialData.title);
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setDueDay(initialData.dueDay);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate || '');
      setCategory(initialData.category || 'Moradia');
      setDescription(initialData.description || '');
      setIsActive(initialData.isActive);
    } else {
      setTitle('');
      setAmount('');
      setType('EXPENSE');
      setDueDay(5);
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setCategory('Moradia');
      setDescription('');
      setIsActive(true);
    }

    setIsSaving(false);
    setIsSuccess(false);

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!title.trim()) {
      alert('Informe o nome da assinatura.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      alert('Informe um valor válido.');
      return;
    }

    const now = Date.now();
    const subscription: Subscription = {
      id: initialData?.id || Math.random().toString(36).slice(2, 11),
      title: title.trim(),
      amount: parsedAmount,
      type,
      dueDay: Math.min(31, Math.max(1, dueDay)),
      startDate,
      endDate: endDate || undefined,
      category,
      description,
      isActive,
      recurrence: 'MONTHLY',
      createdAt: initialData?.createdAt || now,
      updatedAt: now,
      ownerType: initialData?.ownerType
    };

    setIsSaving(true);
    try {
      await onSave(subscription);
      setIsSuccess(true);
      setTimeout(() => onClose(), 700);
    } catch (error) {
      console.error(error);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-900 w-full max-w-lg md:rounded-3xl rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:h-auto border border-gray-100 dark:border-slate-800 transition-all duration-300 animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 ${isSuccess ? 'scale-[0.98] opacity-90' : 'scale-100'}`}>
        {isSuccess && (
          <div className="absolute inset-0 z-[70] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle size={48} strokeWidth={3} />
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Assinatura salva!</p>
          </div>
        )}

        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{initialData ? 'Editar Assinatura' : 'Nova Assinatura'}</h2>
          <button onClick={onClose} disabled={isSaving || isSuccess} className="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
            <X size={24} />
          </button>
        </div>

        <form id="subscription-form" onSubmit={handleSave} className="p-5 md:p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 dark:bg-slate-800 rounded-2xl">
            <button type="button" onClick={() => setType('EXPENSE')} className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'EXPENSE' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-gray-500'}`}>
              Saída
            </button>
            <button type="button" onClick={() => setType('INCOME')} className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'INCOME' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-gray-500'}`}>
              Entrada
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome da assinatura</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Valor</label>
              <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Dia do vencimento</label>
              <input type="number" min={1} max={31} required value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data de início</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data de fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                {TRANSACTION_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Status</label>
              <select value={isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(e) => setIsActive(e.target.value === 'ACTIVE')} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[90px]" />
          </div>
        </form>

        <div className="p-5 md:p-6 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <button type="submit" form="subscription-form" disabled={isSaving || isSuccess} className="w-full py-5 font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.97] bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check size={20} strokeWidth={3} />}
            {isSaving ? 'Sincronizando...' : initialData ? 'Atualizar Assinatura' : 'Salvar Assinatura'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
