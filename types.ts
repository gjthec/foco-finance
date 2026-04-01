
export type TransactionType = 'INCOME' | 'EXPENSE';
export type SubscriptionRecurrence = 'MONTHLY';
export type SubscriptionOwnerType = 'INDIVIDUAL' | 'SHARED';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  value: number;
  category: string;
  person?: string;
  note?: string;
  isPjSalary?: boolean;
}

export interface Subscription {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category?: string;
  description?: string;
  dueDay: number;
  startDate: string;
  endDate?: string;
  hasIndefiniteEndDate?: boolean;
  isActive: boolean;
  recurrence: SubscriptionRecurrence;
  ownerType?: SubscriptionOwnerType;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionMonthStatus {
  id: string;
  subscriptionId: string;
  competence: string; // YYYY-MM
  status: 'paid' | 'pending' | 'ignored' | 'postponed';
  paidAt?: number;
  amountSnapshot?: number;
  titleSnapshot?: string;
  updatedAt: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  amount: number;
  paidBy: 'me' | 'friend';
  owesTo: 'me' | 'friend';
  description: string;
  status: 'open' | 'paid';
}

export interface Ledger {
  id: string;
  title: string;
  friendName: string;
  publicSlug: string;
  publicReadEnabled: boolean;
  entries: LedgerEntry[];
}

export interface AuthState {
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
  avatarUrl: string | null;
  lastLogin?: number;
}

export interface PjCalculation {
  currentGross: number;
  previousGross: number;
  taxDiscount: number;
  inss: number;
  accounting: number;
  netAmount: number;
}
