// Itens sintéticos exibidos na lista do Dashboard junto com as transações reais:
//
// - `generateRecurringSubscriptionItems`: cria um item por assinatura ativa
//   válida pro mês selecionado (vinculado ao status `paid`/`pending`).
// - `synthesizeLedgerRows`: por ledger, gera até duas linhas — uma de Dívidas
//   (saída) com a soma dos `paidBy='friend'` e outra de Créditos (entrada)
//   com a soma dos `paidBy='me'`.
// - `synthesizeVaultMovementItems`: apenas movimentos `AJUSTE_MANUAL`. Os de
//   `LANCAMENTO_MENSAL` não entram aqui — eles já aparecem como Transaction
//   tipo RESERVE pelo loop normal de transações.
//
// Todos esses helpers retornam objetos compatíveis com `Transaction` (campos
// principais) + flags discriminadoras (`isLedgerSummary`, `isVaultMovement`).

import { Ledger, Subscription, TransactionType, Vault, VaultMovement } from '../types';

// ---------------------------------------------------------------------------
// Assinaturas recorrentes
// ---------------------------------------------------------------------------

export interface RecurringItem {
  id: string;
  date: string;
  type: TransactionType;
  value: number;
  category: string;
  note: string;
  isRecurring: true;
  subscriptionId: string;
}

const getMonthDate = (month: string): Date => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
};

export const generateRecurringSubscriptionItems = (
  subscriptions: Subscription[],
  selectedMonth: string,
): RecurringItem[] => {
  const targetMonthDate = getMonthDate(selectedMonth);
  return subscriptions.flatMap((subscription) => {
    if (!subscription.isActive) return [];
    const startMonth = subscription.startDate.slice(0, 7);
    const endMonth = subscription.endDate?.slice(0, 7);
    const hasIndefiniteEndDate = subscription.hasIndefiniteEndDate ?? !subscription.endDate;
    if (selectedMonth < startMonth) return [];
    if (!hasIndefiniteEndDate && endMonth && selectedMonth > endMonth) return [];

    const daysInMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
    const day = Math.min(subscription.dueDay, daysInMonth);
    const competenceDate = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    return [{
      id: `sub-${subscription.id}-${selectedMonth}`,
      date: competenceDate,
      type: subscription.type,
      value: subscription.amount,
      category: subscription.category || 'Assinatura',
      note: subscription.title,
      isRecurring: true as const,
      subscriptionId: subscription.id,
    }];
  });
};

// ---------------------------------------------------------------------------
// Ledger: Dívidas (saída) e Créditos (entrada)
// ---------------------------------------------------------------------------

export interface LedgerSummaryRow {
  id: string;
  date: string;
  type: TransactionType;
  value: number;
  category: string;
  note: string;
  isLedgerSummary: true;
  ledgerId: string;
  isPaid: boolean;
  currentBalance: number;
}

export const synthesizeLedgerRows = (
  ledgers: Ledger[],
  selectedMonth: string,
): LedgerSummaryRow[] => {
  const rows: LedgerSummaryRow[] = [];

  ledgers.forEach((l) => {
    const monthlyEntries = l.entries.filter((e) => e.date.startsWith(selectedMonth));
    if (monthlyEntries.length === 0) return;

    // Convenção do ledger:
    //   paidBy='friend' → você deve (DÍVIDA, lança como saída)
    //   paidBy='me'     → te devem (CRÉDITO, lança como entrada)
    const debts = monthlyEntries
      .filter((e) => e.paidBy === 'friend')
      .reduce((acc, e) => acc + e.amount, 0);
    const credits = monthlyEntries
      .filter((e) => e.paidBy === 'me')
      .reduce((acc, e) => acc + e.amount, 0);

    const balance = monthlyEntries.reduce((acc, entry) => {
      if (entry.status === 'paid') return acc;
      return entry.paidBy === 'me' ? acc + entry.amount : acc - entry.amount;
    }, 0);
    const isFullyPaid = monthlyEntries.every((e) => e.status === 'paid');

    if (debts > 0) {
      rows.push({
        id: `ledger-debt-${l.id}-${selectedMonth}`,
        date: 'Fluxo Mensal',
        type: 'EXPENSE',
        value: debts,
        category: 'Dívidas',
        note: `Dívida com ${l.friendName}`,
        isLedgerSummary: true,
        ledgerId: l.id,
        isPaid: isFullyPaid,
        currentBalance: balance,
      });
    }
    if (credits > 0) {
      rows.push({
        id: `ledger-credit-${l.id}-${selectedMonth}`,
        date: 'Fluxo Mensal',
        type: 'INCOME',
        value: credits,
        category: 'Créditos',
        note: `${l.friendName} te deve`,
        isLedgerSummary: true,
        ledgerId: l.id,
        isPaid: isFullyPaid,
        currentBalance: balance,
      });
    }
  });

  return rows;
};

// ---------------------------------------------------------------------------
// Movimentos avulsos de cofre (AJUSTE_MANUAL)
// ---------------------------------------------------------------------------

export interface VaultMovementItem {
  id: string;
  date: string;
  type: TransactionType;
  value: number;
  category: string;
  note: string;
  isVaultMovement: true;
  vaultMovementId: string;
  cofreId: string;
}

export const synthesizeVaultMovementItems = (
  movements: VaultMovement[],
  vaults: Pick<Vault, 'id' | 'nome'>[],
  selectedMonth: string,
): VaultMovementItem[] => {
  return movements
    .filter((m) => m.origem === 'AJUSTE_MANUAL')
    .filter((m) => {
      const mes = m.mesReferencia || (m.createdAt || '').slice(0, 7);
      return mes === selectedMonth;
    })
    .map((m) => {
      const vault = vaults.find((v) => v.id === m.cofreId);
      const vaultName = vault?.nome || 'Cofre removido';
      return {
        id: `vault-mov-${m.id}`,
        date: (m.createdAt || '').slice(0, 10) || `${selectedMonth}-01`,
        type: (m.tipo === 'DEPOSITO' ? 'RESERVE' : 'INCOME') as TransactionType,
        value: m.valor,
        category: m.tipo === 'DEPOSITO' ? 'Cofre' : 'Saque de cofre',
        note: `${m.tipo === 'DEPOSITO' ? 'Depósito' : 'Retirada'} • ${vaultName}`,
        isVaultMovement: true as const,
        vaultMovementId: m.id,
        cofreId: m.cofreId,
      };
    });
};
