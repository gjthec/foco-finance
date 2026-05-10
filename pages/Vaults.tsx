import React, { useEffect, useMemo, useState } from 'react';
import { PiggyBank, Plus, ArrowDownCircle, ArrowUpCircle, Target } from 'lucide-react';
import { Vault } from '../types';
import { storage } from '../storage';

const Vaults: React.FC = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);

  const load = async () => setVaults(await storage.getVaults());
  useEffect(() => { load(); }, []);

  const total = useMemo(() => vaults.reduce((acc, v) => acc + v.valorAtual, 0), [vaults]);

  const createVault = async () => {
    const nome = prompt('Nome do cofre');
    if (!nome) return;
    const metaInput = prompt('Meta (opcional)');
    const meta = metaInput ? Number(metaInput) : undefined;
    const now = new Date().toISOString();
    await storage.saveVault({ id: crypto.randomUUID(), nome, valorAtual: 0, meta: meta && meta > 0 ? meta : undefined, createdAt: now, updatedAt: now, ativo: true });
    load();
  };

  const adjustVault = async (vault: Vault, tipo: 'DEPOSITO' | 'RETIRADA') => {
    const input = prompt(tipo === 'DEPOSITO' ? 'Valor para adicionar' : 'Valor para retirar');
    const valor = Number(input);
    if (!valor || valor <= 0) return;
    if (tipo === 'RETIRADA' && valor > vault.valorAtual) return alert('Retirada maior que valor disponível.');
    const next = { ...vault, valorAtual: tipo === 'DEPOSITO' ? vault.valorAtual + valor : vault.valorAtual - valor, updatedAt: new Date().toISOString() };
    await storage.saveVault(next);
    await storage.saveVaultMovement({ id: crypto.randomUUID(), cofreId: vault.id, tipo, valor, origem: 'AJUSTE_MANUAL', createdAt: new Date().toISOString() });
    load();
  };

  return <div className="space-y-6">
    <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Patrimônio Reservado</p>
        <h2 className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(total)}</h2>
      </div>
      <PiggyBank className="text-indigo-500" size={36} />
    </div>
    <button onClick={createVault} className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest inline-flex items-center gap-2"><Plus size={16}/>Novo Cofre</button>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {vaults.map(v => {
        const progress = v.meta ? Math.min(100, (v.valorAtual / v.meta) * 100) : null;
        return <div key={v.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 space-y-3">
          <h3 className="font-black text-lg dark:text-white">{v.nome}</h3>
          <p className="text-2xl font-black text-indigo-600">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v.valorAtual)}</p>
          {v.meta && <div><p className="text-xs text-gray-500 flex items-center gap-1"><Target size={14}/>Meta: {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v.meta)}</p><div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full mt-2"><div className="h-2 bg-indigo-600 rounded-full" style={{width:`${progress}%`}} /></div></div>}
          <div className="flex gap-2">
            <button onClick={() => adjustVault(v, 'DEPOSITO')} className="flex-1 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-bold text-xs inline-flex items-center justify-center gap-1"><ArrowUpCircle size={14}/>Adicionar</button>
            <button onClick={() => adjustVault(v, 'RETIRADA')} className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-bold text-xs inline-flex items-center justify-center gap-1"><ArrowDownCircle size={14}/>Retirar</button>
          </div>
        </div>
      })}
    </div>
  </div>;
};

export default Vaults;
