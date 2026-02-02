
import React, { useState, useEffect } from 'react';
import { X, Calculator, Loader2, Check, CheckCircle } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => Promise<void>;
  initialData?: Transaction;
  existingTransactions: Transaction[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [value, setValue] = useState<string>('');
  const [category, setCategory] = useState('Alimentação');
  const [note, setNote] = useState('');
  const [isPj, setIsPj] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // PJ Logic
  const [currentGross, setCurrentGross] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    if (initialData) {
      setDate(initialData.date);
      setType(initialData.type);
      setValue(initialData.value.toString());
      setCategory(initialData.category);
      setNote(initialData.note || '');
      setIsPj(initialData.isPjSalary || false);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setType('EXPENSE');
      setValue('');
      setCategory('Alimentação');
      setNote('');
      setIsPj(false);
      setCurrentGross('');
    }
    setIsSuccess(false);
    setIsSaving(false);
  }, [initialData, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalVal = parseFloat(value);
    
    if (isNaN(finalVal) || finalVal < 0) {
      alert("O valor não pode ser negativo.");
      return;
    }

    setIsSaving(true);
    const tx: Transaction = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      date,
      type,
      value: finalVal,
      category,
      note,
      isPjSalary: isPj
    };

    try {
      await onSave(tx);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const calculatePjNet = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const gross = Math.max(0, parseFloat(currentGross) || 0);
      const das = gross * 0.06;
      const inss = 167;
      const accounting = 270;
      const net = Math.max(0, gross - das - inss - accounting);
      
      setValue(net.toFixed(2));
      setCategory('Salário PJ');
      setType('INCOME');
      setIsPj(true);
      setNote(`PJ: bruto atual R$ ${gross.toFixed(2)} - (6% impostos) - 167 INSS - 270 contabilidade`);
      setIsCalculating(false);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-900 w-full max-w-lg md:rounded-3xl rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:h-auto border border-gray-100 dark:border-slate-800 transition-all duration-300 animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 ${isSuccess ? 'scale-[0.98] opacity-90' : 'scale-100'}`}>
        
        {/* Mobile Handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full" />
        </div>

        {/* Success Overlay */}
        {isSuccess && (
          <div className="absolute inset-0 z-[70] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle size={48} strokeWidth={3} />
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Salvo com Sucesso!</p>
          </div>
        )}

        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {initialData ? 'Editar Registro' : 'Novo Lançamento'}
          </h2>
          <button onClick={onClose} disabled={isSaving || isSuccess} className="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50">
            <X size={24} />
          </button>
        </div>

        <form id="tx-form" onSubmit={handleSave} className="p-5 md:p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100 dark:bg-slate-800 rounded-2xl shrink-0">
            <button
              type="button"
              disabled={isSaving || isSuccess}
              onClick={() => { setType('EXPENSE'); setIsPj(false); }}
              className={`py-3 md:py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'EXPENSE' && !isPj ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-gray-500'}`}
            >
              Saída
            </button>
            <button
              type="button"
              disabled={isSaving || isSuccess}
              onClick={() => { setType('INCOME'); setIsPj(false); }}
              className={`py-3 md:py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'INCOME' && !isPj ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-gray-500'}`}
            >
              Entrada
            </button>
            <button
              type="button"
              disabled={isSaving || isSuccess}
              onClick={() => { setType('INCOME'); setIsPj(true); }}
              className={`py-3 md:py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isPj ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500'}`}
            >
              PJ
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data</label>
              <input
                type="date"
                required
                disabled={isSaving || isSuccess}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Categoria</label>
              <select
                value={category}
                disabled={isPj || isSaving || isSuccess}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base disabled:opacity-50 appearance-none"
              >
                {TRANSACTION_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`transition-all duration-500 ${isCalculating ? 'opacity-50 blur-[1px]' : 'opacity-100 blur-0'}`}>
             <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Valor Total</label>
             <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  disabled={isSaving || isSuccess}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-4xl font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
             </div>
          </div>

          {isPj && (
            <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Calculator size={18} />
                <span className="text-xs font-black uppercase tracking-widest">PJ Optimizer</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1.5 ml-1">Bruto Mensal</label>
                <input
                  type="number"
                  min="0"
                  disabled={isSaving || isCalculating || isSuccess}
                  value={currentGross}
                  onChange={(e) => setCurrentGross(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-base dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={calculatePjNet}
                disabled={isSaving || isCalculating || isSuccess || !currentGross}
                className="w-full py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97]"
              >
                {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator size={14} />}
                {isCalculating ? 'Calculando...' : 'Aplicar Regra de Tributação'}
              </button>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Observação / Nota</label>
            <textarea
              disabled={isSaving || isSuccess}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Freelance para empresa X..."
              className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] text-base"
            />
          </div>
        </form>

        <div className="p-5 md:p-6 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <button
            type="submit"
            form="tx-form"
            disabled={isSaving || isCalculating || isSuccess}
            className={`w-full py-5 font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${
              isSuccess 
              ? 'bg-emerald-600 text-white' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } disabled:opacity-70`}
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : isSuccess ? <Check size={20} strokeWidth={4} /> : <Check size={20} strokeWidth={3} />}
            {isSaving ? 'Sincronizando...' : isSuccess ? 'Sucesso!' : (initialData ? 'Atualizar Registro' : 'Lançar no Fluxo')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
