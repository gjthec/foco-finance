import React, { useEffect, useMemo, useState } from 'react';
import { PiggyBank, Plus, ArrowDownCircle, ArrowUpCircle, Target, X, BarChart3, Wallet, TrendingUp, Calendar, Trash2, Edit2, Check, Loader2, Clock } from 'lucide-react';
import { Vault, VaultMovement } from '../types';
import { storage } from '../storage';
import AlertModal from '../components/AlertModal';
import ConfirmDialog from '../components/ConfirmDialog';
import MonthSelect from '../components/MonthSelect';
import { formatBRL, formatMonthLabel, monthFromIso } from '../lib/format';

type TabKey = 'cofres' | 'historico';

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
  const [confirmDeleteVault, setConfirmDeleteVault] = useState<{ isOpen: boolean; vault: Vault | null }>({ isOpen: false, vault: null });
  const [detailVault, setDetailVault] = useState<Vault | null>(null);
  const [editName, setEditName] = useState('');
  const [editMeta, setEditMeta] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const openVaultDetail = (vault: Vault) => {
    setDetailVault(vault);
    setEditName(vault.nome);
    setEditMeta(vault.meta ? String(vault.meta) : '');
    setEditDescricao(vault.descricao || '');
  };

  const closeVaultDetail = () => {
    setDetailVault(null);
    setEditName('');
    setEditMeta('');
    setEditDescricao('');
  };

  const saveVaultEdit = async () => {
    if (!detailVault) return;
    const name = editName.trim();
    if (!name) {
      setAlertMessage('O cofre precisa de um nome.');
      return;
    }
    const metaValor = editMeta ? Number(editMeta) : undefined;
    if (editMeta && Number.isNaN(metaValor)) {
      setAlertMessage('A meta deve ser numérica.');
      return;
    }
    setIsSavingEdit(true);
    try {
      await storage.saveVault({
        ...detailVault,
        nome: name,
        meta: metaValor && metaValor > 0 ? metaValor : undefined,
        descricao: editDescricao.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      await load();
      closeVaultDetail();
    } catch (error: any) {
      console.error('Erro ao editar cofre:', error);
      setAlertMessage(error?.message || 'Não foi possível salvar as alterações.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const detailMovements = useMemo(() => {
    if (!detailVault) return [] as VaultMovement[];
    return movements
      .filter((m) => m.cofreId === detailVault.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [detailVault, movements]);

  const executeDeleteVault = async () => {
    const target = confirmDeleteVault.vault;
    if (!target) return;
    try {
      await storage.deleteVault(target.id);
      load();
    } catch (error: any) {
      console.error('Erro ao remover cofre:', error);
      setAlertMessage(error?.message || 'Não foi possível remover o cofre.');
    } finally {
      setConfirmDeleteVault({ isOpen: false, vault: null });
    }
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
  const totalLiquidoHistorico = totalDepositadoHistorico - totalRetiradoHistorico;
  // Média mensal do poupado líquido (depositos - retiradas), não só dos depositos.
  const mediaMensal = monthlyBuckets.length > 0 ? totalLiquidoHistorico / monthlyBuckets.length : 0;
  const maxLiquidoMes = monthlyBuckets.reduce((acc, b) => Math.max(acc, Math.abs(b.liquido)), 0);

  return <div className="space-y-6">
    <AlertModal isOpen={Boolean(alertMessage)} message={alertMessage} onClose={() => setAlertMessage('')} />
    <ConfirmDialog
      isOpen={confirmDeleteVault.isOpen}
      onClose={() => setConfirmDeleteVault({ isOpen: false, vault: null })}
      onConfirm={executeDeleteVault}
      title="Excluir cofre"
      message={
        confirmDeleteVault.vault
          ? confirmDeleteVault.vault.valorAtual > 0
            ? `Este cofre ainda tem ${formatBRL(confirmDeleteVault.vault.valorAtual)} guardados. Excluir vai removê-lo da lista, mas o histórico de movimentos continua acessível. Tem certeza?`
            : `Excluir o cofre "${confirmDeleteVault.vault.nome}"? O histórico de movimentos continua acessível.`
          : ''
      }
      confirmLabel="Sim, excluir"
    />

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
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => openVaultDetail(v)}
                title="Ver detalhes e editar"
                className="group min-w-0 flex-1 text-left inline-flex items-center gap-2 hover:text-indigo-600 transition-colors"
              >
                <h3 className="font-black text-lg dark:text-white truncate group-hover:text-indigo-600">{v.nome}</h3>
                <Edit2 size={14} strokeWidth={2.5} className="shrink-0 opacity-30 group-hover:opacity-100 text-indigo-600 transition-opacity" />
              </button>
              <button
                onClick={() => setConfirmDeleteVault({ isOpen: true, vault: v })}
                title="Excluir cofre"
                className="shrink-0 p-1.5 text-gray-300 dark:text-gray-700 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            </div>
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
        <MonthSelect value={mesMov} onChange={setMesMov} className="w-full mb-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white appearance-none" />
        <button onClick={applyMovement} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest">Confirmar</button>
      </div>
    </div>}

    {detailVault && (() => {
      const progress = detailVault.meta ? Math.min(100, (detailVault.valorAtual / detailVault.meta) * 100) : null;
      return (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center md:px-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg md:rounded-3xl rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 dark:border-slate-800">
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black dark:text-white tracking-tight inline-flex items-center gap-2">
                <PiggyBank size={20} className="text-indigo-600" />
                Detalhes do cofre
              </h2>
              <button onClick={closeVaultDetail} className="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Saldo atual</p>
                <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300 tracking-tight">{formatBRL(detailVault.valorAtual)}</p>
                {detailVault.meta && progress !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">
                      <span className="inline-flex items-center gap-1"><Target size={12} /> Meta {formatBRL(detailVault.meta)}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-2 bg-indigo-600 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isSavingEdit}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Meta (opcional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editMeta}
                  onChange={(e) => setEditMeta(e.target.value)}
                  disabled={isSavingEdit}
                  placeholder="0,00"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descrição (opcional)</label>
                <textarea
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  disabled={isSavingEdit}
                  placeholder="Pra que serve esse cofre..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Movimentações ({detailMovements.length})</h3>
                </div>
                {detailMovements.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    <p className="text-xs font-bold">Nenhum movimento ainda neste cofre.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {detailMovements.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                        <div className="min-w-0">
                          <p className={`text-xs font-black uppercase tracking-widest ${m.tipo === 'DEPOSITO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {m.tipo === 'DEPOSITO' ? 'Depósito' : 'Retirada'}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 inline-flex items-center gap-1 mt-0.5">
                            <Clock size={10} /> {new Date(m.createdAt).toLocaleDateString('pt-BR')} • {m.origem === 'LANCAMENTO_MENSAL' ? 'Lançamento' : 'Manual'}
                          </p>
                        </div>
                        <span className={`text-sm font-black whitespace-nowrap ${m.tipo === 'DEPOSITO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.tipo === 'DEPOSITO' ? '+' : '−'} {formatBRL(Number(m.valor) || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <button
                type="button"
                onClick={saveVaultEdit}
                disabled={isSavingEdit || !editName.trim()}
                className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingEdit ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                {isSavingEdit ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      );
    })()}
  </div>;
};

export default Vaults;
