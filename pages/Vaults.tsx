import React, { useEffect, useMemo, useState } from 'react';
import { PiggyBank, Plus, ArrowDownCircle, ArrowUpCircle, Target, X } from 'lucide-react';
import { Vault } from '../types';
import { storage } from '../storage';
import AlertModal from '../components/AlertModal';

const Vaults: React.FC = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [actionVault, setActionVault] = useState<Vault | null>(null);
  const [actionType, setActionType] = useState<'DEPOSITO' | 'RETIRADA'>('DEPOSITO');
  const [nome, setNome] = useState('');
  const [meta, setMeta] = useState('');
  const [valorMov, setValorMov] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      setVaults(await storage.getVaults());
    } catch {
      setAlertMessage('Não foi possível carregar os cofres.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const total = useMemo(() => vaults.reduce((acc, v) => acc + v.valorAtual, 0), [vaults]);

  const createVault = async () => {
    if (!nome.trim()) return setAlertMessage('Informe o nome do cofre.');
    const metaValor = meta ? Number(meta) : undefined;
    if (meta && Number.isNaN(metaValor)) return setAlertMessage('A meta deve ser numérica.');
    const now = new Date().toISOString();
    await storage.saveVault({ id: crypto.randomUUID(), nome: nome.trim(), valorAtual: 0, meta: metaValor && metaValor > 0 ? metaValor : undefined, createdAt: now, updatedAt: now, ativo: true });
    setShowCreate(false);
    setNome('');
    setMeta('');
    load();
  };

  const openMovement = (vault: Vault, tipo: 'DEPOSITO' | 'RETIRADA') => {
    setActionVault(vault);
    setActionType(tipo);
    setValorMov('');
  };

  const applyMovement = async () => {
    if (!actionVault) return;
    const valor = Number(valorMov);
    if (!valor || valor <= 0) return setAlertMessage('Informe um valor válido.');
    if (actionType === 'RETIRADA' && valor > actionVault.valorAtual) return setAlertMessage('Retirada maior que valor disponível.');
    const next = { ...actionVault, valorAtual: actionType === 'DEPOSITO' ? actionVault.valorAtual + valor : actionVault.valorAtual - valor, updatedAt: new Date().toISOString() };
    await storage.saveVault(next);
    await storage.saveVaultMovement({ id: crypto.randomUUID(), cofreId: actionVault.id, tipo: actionType, valor, origem: 'AJUSTE_MANUAL', createdAt: new Date().toISOString() });
    setActionVault(null);
    load();
  };

  return <div className="space-y-6">
    <AlertModal isOpen={Boolean(alertMessage)} message={alertMessage} onClose={() => setAlertMessage('')} />
    <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Patrimônio Reservado</p>
        <h2 className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(total)}</h2>
      </div>
      <PiggyBank className="text-indigo-500" size={36} />
    </div>
    <button onClick={() => setShowCreate(true)} className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest inline-flex items-center gap-2"><Plus size={16}/>Novo Cofre</button>
    {isLoading && <p className="text-sm text-gray-500">Carregando cofres...</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {vaults.map(v => {
        const progress = v.meta ? Math.min(100, (v.valorAtual / v.meta) * 100) : null;
        return <div key={v.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 space-y-3">
          <h3 className="font-black text-lg dark:text-white">{v.nome}</h3>
          <p className="text-2xl font-black text-indigo-600">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v.valorAtual)}</p>
          {v.meta && <div><p className="text-xs text-gray-500 flex items-center gap-1"><Target size={14}/>Meta: {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v.meta)}</p><div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full mt-2"><div className="h-2 bg-indigo-600 rounded-full" style={{width:`${progress}%`}} /></div></div>}
          <div className="flex gap-2">
            <button onClick={() => openMovement(v, 'DEPOSITO')} className="flex-1 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-bold text-xs inline-flex items-center justify-center gap-1"><ArrowUpCircle size={14}/>Adicionar</button>
            <button onClick={() => openMovement(v, 'RETIRADA')} className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-bold text-xs inline-flex items-center justify-center gap-1"><ArrowDownCircle size={14}/>Retirar</button>
          </div>
        </div>
      })}
    </div>

    {showCreate && <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"><div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800"><div className="flex items-center justify-between mb-4"><h3 className="font-black text-lg dark:text-white">Novo Cofre</h3><button onClick={() => setShowCreate(false)}><X/></button></div><input value={nome} onChange={(e)=>setNome(e.target.value)} placeholder="Nome" className="w-full mb-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700" /><input value={meta} onChange={(e)=>setMeta(e.target.value)} type="number" min="0" placeholder="Meta (opcional)" className="w-full mb-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700" /><button onClick={createVault} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest">Criar Cofre</button></div></div>}

    {actionVault && <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"><div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800"><div className="flex items-center justify-between mb-4"><h3 className="font-black text-lg dark:text-white">{actionType === 'DEPOSITO' ? 'Adicionar ao Cofre' : 'Retirar do Cofre'}</h3><button onClick={() => setActionVault(null)}><X/></button></div><p className="text-xs text-gray-500 mb-3">{actionVault.nome}</p><input value={valorMov} onChange={(e)=>setValorMov(e.target.value)} type="number" min="0" placeholder="Valor" className="w-full mb-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700" /><button onClick={applyMovement} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest">Confirmar</button></div></div>}
  </div>;
};

export default Vaults;
