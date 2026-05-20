// Agregação de fluxo de caixa por categoria. Usado pelo Reports e pode ser
// reutilizado se outras telas precisarem de stats por categoria.
//
// Regras (resumo):
//   - Transações: somam direto pelo `type` e `date.startsWith(month)`.
//   - Assinaturas ativas no mês: contam mesmo sem ter sido bipadas como pagas.
//     Só são puladas quando o status do mês for `ignored` ou `postponed`.
//     Se houver `amountSnapshot` (valor diferente foi pago naquele mês), ele
//     tem prioridade sobre o `amount` padrão da assinatura.
//   - Ledger: paidBy='friend' vira Dívidas (saída); paidBy='me' vira Créditos
//     (entrada). Independente de status.
//   - VaultMovements `AJUSTE_MANUAL`: depósitos viram Cofre (reserve), retiradas
//     viram Saque de cofre (income). Os `LANCAMENTO_MENSAL` não entram aqui
//     porque já vêm como Transaction RESERVE pelo loop de transações.

import { Ledger, Subscription, SubscriptionMonthStatus, Transaction, VaultMovement } from '../types';

export type Bucket = { income: number; expense: number; reserve: number };
export type ByCategory = Record<string, Bucket>;

export interface AggregateInput {
  month: string;                                   // YYYY-MM
  transactions: Transaction[];
  subscriptions: Subscription[];
  statuses: SubscriptionMonthStatus[];
  ledgers: Ledger[];
  movements: VaultMovement[];
}

const emptyBucket = (): Bucket => ({ income: 0, expense: 0, reserve: 0 });

export const aggregateByCategoryForMonth = ({
  month,
  transactions,
  subscriptions,
  statuses,
  ledgers,
  movements,
}: AggregateInput): ByCategory => {
  const byCat: ByCategory = {};
  const ensure = (cat: string): Bucket => {
    if (!byCat[cat]) byCat[cat] = emptyBucket();
    return byCat[cat];
  };

  // Transações
  transactions
    .filter((t) => t.date && t.date.startsWith(month))
    .forEach((t) => {
      const cat = t.category || 'Outros';
      const bucket = ensure(cat);
      if (t.type === 'INCOME') bucket.income += t.value;
      else if (t.type === 'EXPENSE') bucket.expense += t.value;
      else if (t.type === 'RESERVE') bucket.reserve += t.value;
    });

  // Assinaturas válidas pro mês
  subscriptions.forEach((sub) => {
    if (!sub.isActive) return;
    const startMonth = sub.startDate?.slice(0, 7);
    const endMonth = sub.endDate?.slice(0, 7);
    const hasIndefiniteEndDate = sub.hasIndefiniteEndDate ?? !sub.endDate;
    if (!startMonth || month < startMonth) return;
    if (!hasIndefiniteEndDate && endMonth && month > endMonth) return;

    const statusForMonth = statuses.find(
      (s) => s.subscriptionId === sub.id && s.competence === month,
    );
    if (statusForMonth && (statusForMonth.status === 'ignored' || statusForMonth.status === 'postponed')) {
      return;
    }

    const amount = statusForMonth?.amountSnapshot ?? sub.amount;
    const cat = sub.category || 'Outros';
    const bucket = ensure(cat);
    if (sub.type === 'INCOME') bucket.income += amount;
    else if (sub.type === 'EXPENSE') bucket.expense += amount;
    else if (sub.type === 'RESERVE') bucket.reserve += amount;
  });

  // Ledgers (dívidas e créditos)
  ledgers.forEach((ledger) => {
    (ledger.entries || []).forEach((entry) => {
      if (!entry.date || !entry.date.startsWith(month)) return;
      if (entry.paidBy === 'friend') {
        ensure('Dívidas').expense += entry.amount;
      } else if (entry.paidBy === 'me') {
        ensure('Créditos').income += entry.amount;
      }
    });
  });

  // Movimentos avulsos de cofre (sem transação associada)
  movements
    .filter((m) => m.origem === 'AJUSTE_MANUAL')
    .forEach((m) => {
      const mes = m.mesReferencia || (m.createdAt || '').slice(0, 7);
      if (mes !== month) return;
      if (m.tipo === 'DEPOSITO') {
        ensure('Cofre').reserve += m.valor;
      } else if (m.tipo === 'RETIRADA') {
        ensure('Saque de cofre').income += m.valor;
      }
    });

  return byCat;
};

export const sumBucket = (by: ByCategory, key: keyof Bucket): number =>
  Object.values(by).reduce((acc, b) => acc + (b[key] || 0), 0);
