
import React, { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  initialData?: Transaction;
  existingTransactions: Transaction[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, initialData, existingTransactions }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [value, setValue] = useState<string>('');
  const [category, setCategory] = useState('Alimentação');
  const [note, setNote] = useState('');
  const [isPj, setIsPj] = useState(false);

  // PJ Logic
  const [currentGross, setCurrentGross] = useState<string>('');
  const [prevGross, setPrevGross] = useState<string>('');

  useEffect(() => {
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
      setPrevGross('');
    }
  }, [initialData, isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalVal = parseFloat(value);
    
    // Validação extra contra valores negativos
    if (isNaN(finalVal) || finalVal < 0) {
      alert("O valor não pode ser negativo.");
      return;
    }

    const tx: Transaction = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      date,
      type,
      value: finalVal,
      category,
      note,
      isPjSalary: isPj
    };
    onSave(tx);
  };

  const calculatePjNet = () => {
    const gross = Math.max(0, parseFloat(currentGross) || 0);
    const das = gross * 0.06;
    const inss = 167; // Conforme regra solicitada
    const accounting = 270; // Conforme regra solicitada
    
    // Calcula o líquido garantindo que não seja menor que zero
    const net = Math.max(0, gross - das - inss - accounting);
    
    setValue(net.toFixed(2));
    setCategory('Salário PJ');
    setType('INCOME');
    setIsPj(true);
    setNote(`PJ: bruto atual R$ ${gross.toFixed(2)} - (6% impostos) - 167 INSS - 270 contabilidade`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh] border border-gray-100 dark:border-slate-800 transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {initialData ? 'Editar Registro' : 'Novo Lançamento'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <form id="tx-form" onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto overflow-x-hidden">
          {/* Seletor de Tipo Compacto */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => { setType('EXPENSE'); setIsPj(false); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${type === 'EXPENSE' && !isPj ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Saída
            </button>
            <button
              type="button"
              onClick={() => { setType('INCOME'); setIsPj(false); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${type === 'INCOME' && !isPj ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => { setType('INCOME'); setIsPj(true); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${isPj ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              PJ
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Categoria</label>
              <select
                value={category}
                disabled={isPj}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm disabled:opacity-50"
              >
                {TRANSACTION_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Valor Total</label>
             <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={value}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (parseFloat(val) < 0) return;
                    setValue(val);
                  }}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-3xl font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all break-all"
                />
             </div>
          </div>

          {isPj && (
            <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Calculator size={18} />
                <span className="text-sm font-black uppercase tracking-tight">Calculadora PJ</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1 truncate">Fat. Bruto</label>
                  <input
                    type="number"
                    min="0"
                    value={currentGross}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (parseFloat(val) < 0) return;
                      setCurrentGross(val);
                    }}
                    placeholder="R$ 0,00"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1 truncate">Média 12m</label>
                  <input
                    type="number"
                    min="0"
                    value={prevGross}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (parseFloat(val) < 0) return;
                      setPrevGross(val);
                    }}
                    placeholder="Média"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={calculatePjNet}
                className="w-full py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.97] shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Calcular Líquido
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Observação</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Almoço de domingo, etc..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[90px] text-sm transition-all"
            />
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            type="submit"
            form="tx-form"
            className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-[0.98]"
          >
            {initialData ? 'Atualizar Dados' : 'Confirmar Lançamento'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
