
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
  orderBy,
  getDoc
} from 'firebase/firestore';

const KEYS = {
  AUTH: 'foco_finance_auth',
  THEME: 'foco_finance_theme',
  TRANSACTIONS: 'foco_finance_transactions',
  LEDGERS: 'foco_finance_ledgers'
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

  // Firestore Operações para Transações
  getTransactions: async (): Promise<Transaction[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    
    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs)); // Cache local
    return txs;
  },
  saveTransaction: async (tx: Transaction) => {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'transactions', tx.id), tx);
  },
  deleteTransaction: async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
  },

  // Firestore Operações para Ledgers (Dívidas)
  getLedgers: async (): Promise<Ledger[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    
    const q = query(collection(db, 'users', user.uid, 'ledgers'));
    const snapshot = await getDocs(q);
    const ledgers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ledger));
    localStorage.setItem(KEYS.LEDGERS, JSON.stringify(ledgers));
    return ledgers;
  },
  saveLedger: async (ledger: Ledger) => {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'ledgers', ledger.id), ledger);
    
    // Se habilitado para leitura pública, duplicar em uma coleção raiz para acesso via slug
    if (ledger.publicReadEnabled) {
      await setDoc(doc(db, 'public_ledgers', ledger.publicSlug), {
        ...ledger,
        ownerId: user.uid,
        updatedAt: Date.now()
      });
    } else {
      await deleteDoc(doc(db, 'public_ledgers', ledger.publicSlug)).catch(() => {});
    }
  },
  // Fix for error in LedgerDetail.tsx: syncPublicLedger call
  syncPublicLedger: async (ledger: Ledger) => {
    const user = auth.currentUser;
    if (!user) return;
    if (ledger.publicReadEnabled) {
      await setDoc(doc(db, 'public_ledgers', ledger.publicSlug), {
        ...ledger,
        ownerId: user.uid,
        updatedAt: Date.now()
      });
    } else {
      await deleteDoc(doc(db, 'public_ledgers', ledger.publicSlug)).catch(() => {});
    }
  },
  getLedgerBySlug: async (slug: string): Promise<Ledger | undefined> => {
    const docSnap = await getDoc(doc(db, 'public_ledgers', slug));
    if (docSnap.exists()) {
      return docSnap.data() as Ledger;
    }
    return undefined;
  }
};
