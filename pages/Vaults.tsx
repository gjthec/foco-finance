import React, { useEffect, useMemo, useState } from 'react';
import { PiggyBank, Plus, ArrowDownCircle, ArrowUpCircle, Target, X, BarChart3, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { Vault, VaultMovement } from '../types';
import { storage } from '../storage';
import AlertModal from '../components/AlertModal';

type TabKey = 'cofres' | 'historico';

const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatMonthLabel = (yyyyMm: string) => {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm || '—';
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const monthFromIso = (iso?: string) => (iso ? iso.slice(0, 7) : '');

const Vaults: React.FC = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [movements, setMovements] = useState<VaultMovement[]>([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [actionVault, setActionVault] = useState<Vault | null>(null);
  const [actionType, setActionType] = useState<'DEPOSITO' | 'RETIRADA'>('DEPOSITO');
  const [nome, setNome] = useState('');
  const [meta, setMeta] = useState('');
  const [valorMov, setValorMov] = useState('');
  const [mesMov, setMesMov] = useState(new Date().toISOString().slice(0, 7));
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('cofres');
  const [historyVaultFilter, setHistoryVaultFilter] = useState<string>('ALL');

  const load = async () => {
    setIsLoading(true);
    try {
      const [vts, mvs] = await Promise.all([storage.getVaults(), storage.getVaultMovements()]);
      setVaults(vts);
      setMovements(mvs);
    } catch {
      setAlertMessage('Não foi possível carregar os cofres.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const total = useMemo(() => vaults.reduce((acc, v) => acc + v.valorAtual, 0), [vaults]);

  const vaultNameById = useMemo(() => {
    const map = new Map<string, string>();
    vaults.forEach(v => map.set(v.id, v.nome));
    return map;
  }, [vaults]);

  const createVault = async () => {
    if (!nome.trim()) return setAlertMessage('Informe o nome do cofre.');
    const metaValor = meta ? Number(meta) : undefined;
    if (meta && Number.isNaN(metaValor)) return setAlertMessage('A meta deve ser numérica.');
    const now = new Date().toISOString();
    try {
      await storage.saveVault({ id: crypto.randomUUID(), nome: nome.trim(), valorAtual: 0, meta: metaValor && metaValor > 0 ? metaValor : undefined, createdAt: now, updatedAt: now, ativo: true });
      setShowCreate(false);
      setNome('');
      setMeta('');
      load();
    } catch (error: any) {
      console.error('Erro ao criar cofre:', error);
      setAlertMessage(error?.message || 'Não foi possível criar o cofre. Verifique sua conexão e as regras do Firestore.');
    }
  };

  const openMovement = (vault: Vault, tipo: 'DEPOSITO' | 'RETIRADA') => {
    setActionVault(vault);
    setActionType(tipo);
    setValorMov('');
    setMesMov(new Date().toISOString().slice(0, 7));
  };

  const applyMovement = async () => {
    if (!actionVault) return;
    const valor = Number(valorMov);
    if (!valor || valor <= 0) return setAlertMessage('Informe um valor válido.');
    if (!/^\d{4}-\d{2}$/.test(mesMov)) return setAlertMessage('Informe um mês de referência válido.');
    if (actionType === 'RETIRADA' && valor > actionVault.valorAtual) return setAlertMessage('Retirada maior que valor disponível.');
    const next = { ...actionVault, valorAtual: actionType === 'DEPOSITO' ? actionVault.valorAtual + valor : actionVault.valorAtual - valor, updatedAt: new Date().toISOString() };
    try {
      await storage.saveVault(next);
      await storage.saveVaultMovement({
        id: crypto.randomUUID(),
        cofreId: actionVault.id,
        tipo: actionType,
        valor,
        origem: 'AJUSTE_MANUAL',
        mesReferencia: mesMov,
        createdAt: new Date().toISOString(),
      });
      setActionVault(null);
      load();
    } catch (error: any) {
      console.error('Erro ao movimentar cofre:', error);
      setAlertMessage(error?.message || 'Não foi possível atualizar o cofre. Verifique sua conexão e as regras do Firestore.');
    }
  };

  const filteredMovements = useMemo(() => {
    return historyVaultFilter === 'ALL' ? movements : movements.filter(m => m.cofreId === historyVaultFilter);
  }, [movements, historyVaultFilter]);

  type MonthBucket = { mes: string; deposito: number; retirada: number; liquido: number; movimentos: VaultMovement[] };

  const monthlyBuckets = useMemo<MonthBucket[]>(() => {
    const map = new Map<string, MonthBucket>();
    filteredMovements.forEach(m => {
      const mes = m.mesReferencia || monthFromIso(m.createdAt);
      if (!mes) return;
      const bucket = map.get(mes) || { mes, deposito: 0, retirada: 0, liquido: 0, movimentos: [] };
      if (m.tipo === 'DEPOSITO') bucket.deposito += Number(m.valor) || 0;
      else bucket.retirada += Number(m.valor) || 0;
      bucket.liquido = bucket.deposito - bucket.retirada;
      bucket.movimentos.push(m);
      map.set(mes, bucket);
    });
    return Array.from(map.values()).sort((a, b) => (a.mes < b.mes ? 1 : -1));
  }, [filteredMovements]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonth = monthlyBuckets.find(b => b.mes === currentMonthKey);
  const totalDepositadoHistorico = monthlyBuckets.reduce((acc, b) => acc + b.deposito, 0);
  const totalRetiradoHistorico = monthlyBuckets.reduce((acc, b) => acc + b.retirada, 0);
  const mediaMensal = monthlyBuckets.length > 0 ? totalDepositadoHistorico / monthlyBuckets.length : 0;
  const maxLiquidoMes = monthlyBuckets.reduce((acc, b) => Math.max(acc, Math.abs(b.liquido)), 0);

  return <div className="space-y-6">
    <AlertModal isOpen={Boolean(alertMessage)} message={alertMessage} onClose={() => setAlertMessage('')} />

    <div className="p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Patrimônio Reservado</p>
        <h2 className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{formatBRL(total)}</h2>
      </div>
      <PiggyBank className="text-indigo-500" size={36} />
    </div>

    <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800/60 rounded-2xl w-fit">
      <button
        onClick={() => setActiveTab('cofres')}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 transition-all ${activeTab === 'cofres' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-gray-500'}`}
      >
        <Wallet size={14} /> Cofres
      </button>
      <button
        onClick={() => setActiveTab('historico')}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 transition-all ${activeTab === 'historico' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-gray-500'}`}
      >
        <BarChart3 size={14} /> Histórico
      </button>
    </div>

    {activeTab === 'cofres' && <>
      <button onClick={() => setShowCreate(true)} className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest inline-flex items-center gap-2"><Plus size={16}/>Novo Cofre</button>
      {isLoading && <p className="text-sm text-gray-500">Carregando cofres...</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vaults.map(v => {
          const progress = v.meta ? Math.min(100, (v.valorAtual / v.meta) * 100) : null;
          return <div key={v.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 space-y-3">
            <h3 className="font-black text-lg dark:text-white">{v.nome}</h3>
            <p className="text-2xl font-black text-indigo-600">{formatBRL(v.valorAtual)}</p>
            {v.meta && <div><p className="text-xs text-gray-500 flex items-center gap-1"><Target size={14}/>Meta: {formatBRL(v.meta)}</p><div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full mt-2"><div className="h-2 bg-indigo-600 rounded-full" style={{width:`${progress}%`}} /></div></div>}
            <div className="flex gap-2">
              <button onClick={() => openMovement(v, 'DEPOSITO')} className="flex-1 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-bold text-xs inline-flex items-center justify-center gap-1"><ArrowUpCircle size={14}/>Adicionar</button>
              <button onClick={() => openMovement(v, 'RETIRADA')} className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-bold text-xs inline-flex items-center justify-center gap-1"><ArrowDownCircle size={14}/>Retirar</button>
            </div>
          </div>
        })}
      </div>
    </>}

    {activeTab === 'historico' && <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"><Calendar size={22}/></div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Poupado este mês</p>
            <p className="text-xl font-black text-emerald-600 truncate">{formatBRL(currentMonth?.liquido || 0)}</p>
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"><TrendingUp size={22}/></div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Média mensal</p>
            <p className="text-xl font-black text-indigo-600 truncate">{formatBRL(mediaMensal)}</p>
          </div>
        </div>
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600"><ArrowDownCircle size={22}/></div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Retiradas (total)</p>
            <p className="text-xl font-black text-rose-600 truncate">{formatBRL(totalRetiradoHistorico)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Filtrar cofre:</span>
        <button
          onClick={() => setHistoryVaultFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${historyVaultFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
        >Todos</button>
        {vaults.map(v => (
          <button
            key={v.id}
            onClick={() => setHistoryVaultFilter(v.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${historyVaultFilter === v.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}
          >{v.nome}</button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Carregando histórico...</p>
      ) : monthlyBuckets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 text-gray-400">
          <BarChart3 size={48} className="opacity-20 mb-4" />
          <p className="text-sm font-bold tracking-tight">Sem movimentações registradas ainda.</p>
          <p className="text-[10px] font-black uppercase tracking-widest mt-1">Adicione um valor a um cofre para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthlyBuckets.map(bucket => {
            const barWidth = maxLiquidoMes > 0 ? Math.max(4, (Math.abs(bucket.liquido) / maxLiquidoMes) * 100) : 0;
            const isPositive = bucket.liquido >= 0;
            return (
              <div key={bucket.mes} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{formatMonthLabel(bucket.mes)}</p>
                    <p className={`text-2xl font-black tracking-tight ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '+' : '−'} {formatBRL(Math.abs(bucket.liquido))}
                    </p>
                  </div>
                  <div className="text-right text-[10px] font-black uppercase tracking-widest">
                    <p className="text-emerald-600">+{formatBRL(bucket.deposito)}</p>
                    {bucket.retirada > 0 && <p className="text-rose-600 mt-0.5">−{formatBRL(bucket.retirada)}</p>}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-2 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${barWidth}%` }} />
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-indigo-600 list-none inline-flex items-center gap-1">
                    Ver {bucket.movimentos.length} movimentaç{bucket.movimentos.length === 1 ? 'ão' : 'ões'}
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {bucket.movimentos.map(m => (
                      <li key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50">
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate dark:text-white">{vaultNameById.get(m.cofreId) || 'Cofre removido'}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {m.origem === 'LANCAMENTO_MENSAL' ? 'Lançamento' : 'Manual'} • {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={`text-sm font-black whitespace-nowrap ${m.tipo === 'DEPOSITO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.tipo === 'DEPOSITO' ? '+' : '−'} {formatBRL(Number(m.valor) || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>}

    {showCreate && <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"><div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800"><div className="flex items-center justify-between mb-4"><h3 className="font-black text-lg dark:text-white">Novo Cofre</h3><button onClick={() => setShowCreate(false)}><X/></button></div><input value={nome} onChange={(e)=>setNome(e.target.value)} placeholder="Nome" className="w-full mb-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700" /><input value={meta} onChange={(e)=>setMeta(e.target.value)} type="number" min="0" placeholder="Meta (opcional)" className="w-full mb-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700" /><button onClick={createVault} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest">Criar Cofre</button></div></div>}

    {actionVault && <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg dark:text-white">{actionType === 'DEPOSITO' ? 'Adicionar ao Cofre' : 'Retirar do Cofre'}</h3>
          <button onClick={() => setActionVault(null)}><X/></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">{actionVault.nome}</p>
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Valor</label>
        <input value={valorMov} onChange={(e)=>setValorMov(e.target.value)} type="number" min="0" placeholder="0,00" className="w-full mb-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700" />
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Mês de referência</label>
        <input value={mesMov} onChange={(e)=>setMesMov(e.target.value)} type="month" className="w-full mb-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white" />
        <button onClick={applyMovement} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest">Confirmar</button>
      </div>
    </div>}
  </div>;
};

export default Vaults;
