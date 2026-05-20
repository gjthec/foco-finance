// Seletor de categoria com criação inline. Usado em TransactionModal e
// SubscriptionModal — antes esse padrão estava duplicado nos dois lugares.
//
// Recebe a lista de categorias atual (`options`) e expõe `onChange` pra
// selecionar. Quando o usuário cria uma nova:
//   - chama `storage.saveCategory`
//   - recarrega a lista via `onCategoriesChanged(updated)`
//   - já seleciona a nova categoria via `onChange(newName)`

import React, { useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { storage } from '../storage';

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onCategoriesChanged: (updated: string[]) => void;
  disabled?: boolean;
  selectClassName?: string;
  /** Mostra alerta de erro (modal/snackbar do componente pai). */
  onError?: (msg: string) => void;
}

const newId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  value,
  onChange,
  options,
  onCategoriesChanged,
  disabled = false,
  selectClassName = '',
  onError,
}) => {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const reportError = (msg: string) => {
    if (onError) onError(msg);
    else console.warn(msg);
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) {
      reportError('Informe um nome para a categoria.');
      return;
    }
    if (options.some((c) => c.toLowerCase() === name.toLowerCase())) {
      reportError('Essa categoria já existe.');
      return;
    }
    setIsSaving(true);
    try {
      await storage.saveCategory({ id: newId(), name, createdAt: Date.now() });
      const updated = await storage.getAllCategoryNames();
      onCategoriesChanged(updated);
      onChange(name);
      setShowNew(false);
      setNewName('');
    } catch (err: any) {
      console.error(err);
      reportError(err?.message || 'Não foi possível salvar a categoria.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={selectClassName || 'flex-1 min-w-0 px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base disabled:opacity-50 appearance-none'}
        >
          {options.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          disabled={disabled}
          title="Nova categoria"
          className="shrink-0 px-3 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 rounded-xl disabled:opacity-50"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      {showNew && (
        <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-300">
          <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1">
            Nova categoria
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } }}
              placeholder="Ex: I.A"
              disabled={isSaving}
              className="flex-1 min-w-0 px-4 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-base dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              type="button"
              onClick={create}
              disabled={isSaving || !newName.trim()}
              className="shrink-0 px-4 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryPicker;
