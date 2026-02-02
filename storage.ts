
import { Transaction, Ledger, AuthState } from './types';
import { db, auth, FIREBASE_READY } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDoc
} from 'firebase/firestore';

// --- FLAG DE CONTROLE ---
// Mude para TRUE apenas quando o Firebase estiver configurado no ambiente
export const USE_FIREBASE = true;

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

  // --- TRANSAÇÕES ---
  getTransactions: async (): Promise<Transaction[]> => {
    if (USE_FIREBASE && auth.currentUser) {
      try {
        const q = query(collection(db, 'users', auth.currentUser.uid, 'transactions'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
        return txs;
      } catch (e) {
        console.warn("Firestore fail, using local cache", e);
      }
    }
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },
  saveTransaction: async (tx: Transaction) => {
    if (USE_FIREBASE && auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', tx.id), tx);
    }
    const txs = await storage.getTransactions();
    const index = txs.findIndex(t => t.id === tx.id);
    if (index > -1) txs[index] = tx;
    else txs.unshift(tx);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
  },
  deleteTransaction: async (id: string) => {
    if (USE_FIREBASE && auth.currentUser) {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
    }
    const txs = await storage.getTransactions();
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs.filter(t => t.id !== id)));
  },

  // --- LEDGERS ---
  getLedgers: async (): Promise<Ledger[]> => {
    if (USE_FIREBASE && auth.currentUser) {
      try {
        const q = query(collection(db, 'users', auth.currentUser.uid, 'ledgers'));
        const snapshot = await getDocs(q);
        const ldgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ledger));
        localStorage.setItem(KEYS.LEDGERS, JSON.stringify(ldgs));
        return ldgs;
      } catch (e) {
        console.warn("Firestore fail, using local cache", e);
      }
    }
    const data = localStorage.getItem(KEYS.LEDGERS);
    return data ? JSON.parse(data) : [];
  },
  saveLedger: async (ledger: Ledger) => {
    if (USE_FIREBASE && auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'ledgers', ledger.id), ledger);
      if (ledger.publicReadEnabled) {
        await setDoc(doc(db, 'public_ledgers', ledger.publicSlug), { ...ledger, ownerId: auth.currentUser.uid });
      } else {
        await deleteDoc(doc(db, 'public_ledgers', ledger.publicSlug)).catch(() => {});
      }
    }
    const ldgs = await storage.getLedgers();
    const index = ldgs.findIndex(l => l.id === ledger.id);
    if (index > -1) ldgs[index] = ledger;
    else ldgs.unshift(ledger);
    localStorage.setItem(KEYS.LEDGERS, JSON.stringify(ldgs));
  },
  syncPublicLedger: async (ledger: Ledger) => {
    await storage.saveLedger(ledger);
  },
  getLedgerBySlug: async (slug: string): Promise<Ledger | undefined> => {
    if (USE_FIREBASE) {
      try {
        const docSnap = await getDoc(doc(db, 'public_ledgers', slug));
        if (docSnap.exists()) return docSnap.data() as Ledger;
      } catch (e) {
        console.warn("Public slug fetch failed", e);
      }
    }
    const ldgs = await storage.getLedgers();
    return ldgs.find(l => l.publicSlug === slug);
  }
};
