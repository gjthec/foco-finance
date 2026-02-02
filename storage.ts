
import { Transaction, Ledger, AuthState } from './types';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc
} from 'firebase/firestore';

const KEYS = {
  AUTH: 'foco_finance_auth',
  THEME: 'foco_finance_theme'
};

export const storage = {
  getAuth: (): AuthState => {
    const data = localStorage.getItem(KEYS.AUTH);
    if (!data) return { isAuthenticated: false, userEmail: null, userName: null, avatarUrl: null };
    return JSON.parse(data);
  },
  setAuth: (email: string | null, name: string | null = null, avatar: string | null = null) => {
    if (!email) {
      localStorage.removeItem(KEYS.AUTH);
      return;
    }
    const state: AuthState = { 
      isAuthenticated: true, 
      userEmail: email, 
      userName: name || email.split('@')[0], 
      avatarUrl: avatar,
      lastLogin: Date.now()
    };
    localStorage.setItem(KEYS.AUTH, JSON.stringify(state));
  },
  getTheme: (): 'light' | 'dark' => {
    const saved = localStorage.getItem(KEYS.THEME);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  setTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(KEYS.THEME, theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  },

  // Operações Firestore para Transações
  getTransactions: async (): Promise<Transaction[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    const q = query(collection(db, `users/${user.uid}/transactions`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  },
  saveTransaction: async (tx: Transaction) => {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, `users/${user.uid}/transactions`, tx.id), tx);
  },
  deleteTransaction: async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/transactions`, id));
  },

  // Operações Firestore para Ledgers (Dívidas)
  getLedgers: async (): Promise<Ledger[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    const q = query(collection(db, `users/${user.uid}/ledgers`));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ledger));
  },
  saveLedger: async (ledger: Ledger) => {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, `users/${user.uid}/ledgers`, ledger.id), ledger);
  },
  getLedgerBySlug: async (slug: string): Promise<Ledger | undefined> => {
    // Para acesso público, precisamos de uma query diferente ou uma estrutura flat
    const q = query(collection(db, 'public_ledgers'), where('publicSlug', '==', slug));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data() as Ledger;
  },
  // Método auxiliar para atualizar slug público (opcional, para facilitar busca)
  syncPublicLedger: async (ledger: Ledger) => {
    if (ledger.publicReadEnabled) {
      await setDoc(doc(db, 'public_ledgers', ledger.publicSlug), ledger);
    } else {
      await deleteDoc(doc(db, 'public_ledgers', ledger.publicSlug));
    }
  }
};
