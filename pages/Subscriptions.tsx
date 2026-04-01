import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Power, FileText } from 'lucide-react';
import { Subscription } from '../types';
import { storage } from '../storage';
import SubscriptionModal from '../components/SubscriptionModal';

const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>();

  const loadSubscriptions = async () => {
    setIsLoading(true);
    const data = await storage.getSubscriptions();
    setSubscriptions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleSave = async (subscription: Subscription) => {
    await storage.saveSubscription(subscription);
    await loadSubscriptions();
  };

  const toggleStatus = async (subscription: Subscription) => {
    await storage.saveSubscription({
      ...subscription,
      isActive: !subscription.isActive,
      updatedAt: Date.now()
    });
    await loadSubscriptions();
  };

  const formatBRL = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">Assinaturas</h1>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em]">Recorrências Mensais</p>
        </div>
        <button
          onClick={() => { setEditingSubscription(undefined); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98]"
        >
          <Plus size={18} strokeWidth={3} />
          Nova assinatura
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-gray-100 dark:border-slate-800 text-sm text-gray-500 dark:text-slate-400 font-bold">
          Carregando assinaturas...
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[32px] border border-dashed border-gray-200 dark:border-slate-800 text-gray-400">
          <FileText size={48} className="opacity-10 mb-4" />
          <p className="text-sm font-bold tracking-tight">Nenhuma assinatura cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="bg-white dark:bg-slate-900 p-4.5 rounded-[24px] border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${subscription.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'}`}>
                <span className="font-black text-sm">{String(subscription.dueDay).padStart(2, '0')}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-black truncate pr-2 tracking-tight text-gray-900 dark:text-white">{subscription.title}</h4>
                  <span className={`text-base font-black whitespace-nowrap tracking-tight ${subscription.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatBRL(subscription.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                  <span>{subscription.category || 'Assinatura'}</span>
                  <span>•</span>
                  <span className={`px-1.5 py-0.5 rounded-md ${subscription.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {subscription.isActive ? 'ATIVA' : 'INATIVA'}
                  </span>
                  <span>•</span>
                  <span>{subscription.hasIndefiniteEndDate ?? !subscription.endDate ? 'Sem fim' : `Até ${new Date((subscription.endDate || '') + 'T12:00:00').toLocaleDateString('pt-BR')}`}</span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setEditingSubscription(subscription); setIsModalOpen(true); }} className="p-3 text-gray-400 hover:text-indigo-600 active:bg-gray-100 dark:active:bg-slate-800 rounded-xl transition-colors">
                  <Edit2 size={20} />
                </button>
                <button onClick={() => toggleStatus(subscription)} className={`p-3 rounded-xl transition-colors ${subscription.isActive ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
                  <Power size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSubscription(undefined); }}
        onSave={handleSave}
        initialData={editingSubscription}
      />
    </div>
  );
};

export default Subscriptions;
