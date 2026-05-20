import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Lock, Tag, Loader2, Check } from 'lucide-react';
import { Category } from '../types';
import { storage } from '../storage';
import { DEFAULT_CATEGORIES } from '../constants';
import AlertModal from '../components/AlertModal';
import ConfirmDialog from '../components/ConfirmDialog';

const Categories: React.FC = () => {
  const [custom, setCustom] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null; name: string }>({ isOpen: false, id: null, name: '' });

  const load = async () => {
    setIsLoading(true);
    try {
      const cats = await storage.getCategories();
      setCustom(cats);
    } catch {
      setAlertMessage('Não foi possível carregar as categorias.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setAlertMessage('Informe um nome para a categoria.');
      return;
    }
    const exists =
      DEFAULT_CATEGORIES.some((c) => c.toLowerCase() === name.toLowerCase()) ||
      custom.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setAlertMessage('Essa categoria já existe.');
      return;
    }
    setIsSaving(true);
    try {
      await storage.saveCategory({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11),
        name,
        createdAt: Date.now(),
      });
      setNewName('');
      load();
    } catch (err: any) {
      console.error(err);
      setAlertMessage(err?.message || 'Não foi possível salvar a categoria.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await storage.deleteCategory(confirmDelete.id);
      load();
    } catch (err: any) {
      console.error(err);
      setAlertMessage(err?.message || 'Não foi possível remover a categoria.');
    } finally {
      setConfirmDelete({ isOpen: false, id: null, name: '' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <AlertModal isOpen={Boolean(alertMessage)} message={alertMessage} onClose={() => setAlertMessage('')} />
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        title="Remover categoria"
        message={`Remover "${confirmDelete.name}"? Lançamentos antigos com essa categoria continuam intactos, mas a categoria deixa de aparecer no dropdown.`}
        confirmLabel="Sim, Remover"
      />

      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Categorias</h1>
        <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest mt-1">Gerencie as categorias usadas em lançamentos e assinaturas</p>
      </div>

      <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 space-y-3">
        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 ml-1">Nova categoria</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
            placeholder="Ex: I.A, Pets, Saúde mental..."
            disabled={isSaving}
            className="flex-1 min-w-0 px-4 py-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-base dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving || !newName.trim()}
            className="shrink-0 px-5 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 inline-flex items-center gap-2 active:scale-[0.97]"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
            Adicionar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Suas categorias ({custom.length})</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : custom.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-600 bg-white dark:bg-slate-900 rounded-[24px] border border-dashed border-gray-200 dark:border-slate-800">
            <Tag size={32} className="mx-auto opacity-30 mb-3" />
            <p className="text-sm font-bold">Você ainda não criou nenhuma categoria.</p>
          </div>
        ) : (
          custom.map((c) => (
            <div key={c.id} className="bg-white dark:bg-slate-900 p-4 rounded-[20px] border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Tag size={18} strokeWidth={2.5} />
                </div>
                <span className="text-sm font-black dark:text-white tracking-tight truncate">{c.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete({ isOpen: true, id: c.id, name: c.name })}
                className="p-2 text-gray-300 dark:text-gray-700 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                title="Remover"
              >
                <Trash2 size={18} strokeWidth={2.5} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Categorias padrão ({DEFAULT_CATEGORIES.length})</h2>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">Categorias do sistema. Não podem ser removidas.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEFAULT_CATEGORIES.map((name) => (
            <div key={name} className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center gap-3">
              <Lock size={14} className="text-gray-300 dark:text-gray-700 shrink-0" />
              <span className="text-sm font-bold text-gray-500 dark:text-slate-400 truncate">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
