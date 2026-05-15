
import { Transaction, Ledger, AuthState, Subscription, SubscriptionMonthStatus, Vault, VaultMovement } from './types';
import { db, auth, FIREBASE_READY } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';

// --- FLAG DE CONTROLE ---
// Mude para TRUE apenas quando o Firebase estiver configurado no ambiente
export const USE_FIREBASE = true;

const toIsoDate = (value: Timestamp | string | undefined | null): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return new Date().toISOString();
};

const KEYS = {
  AUTH: 'foco_finance_auth',
  THEME: 'foco_finance_theme',
  TRANSACTIONS: 'foco_finance_transactions',
  LEDGERS: 'foco_finance_ledgers',
  SUBSCRIPTIONS: 'foco_finance_subscriptions',
  SUBSCRIPTION_MONTH_STATUS: 'foco_finance_subscription_month_status',
  VAULTS: 'foco_finance_vaults',
  VAULT_MOVEMENTS: 'foco_finance_vault_movements'
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

  // --- ASSINATURAS RECORRENTES ---
  getSubscriptions: async (): Promise<Subscription[]> => {
    if (USE_FIREBASE && auth.currentUser) {
      try {
        const q = query(collection(db, 'users', auth.currentUser.uid, 'subscriptions'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
        localStorage.setItem(KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
        return subscriptions;
      } catch (e) {
        console.warn("Firestore fail, using local cache", e);
      }
    }
    const data = localStorage.getItem(KEYS.SUBSCRIPTIONS);
    return data ? JSON.parse(data) : [];
  },
  saveSubscription: async (subscription: Subscription) => {
    if (USE_FIREBASE && auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'subscriptions', subscription.id), subscription);
    }
    const subscriptions = await storage.getSubscriptions();
    const index = subscriptions.findIndex(s => s.id === subscription.id);
    if (index > -1) subscriptions[index] = subscription;
    else subscriptions.unshift(subscription);
    localStorage.setItem(KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
  },
  deleteSubscription: async (id: string) => {
    if (USE_FIREBASE && auth.currentUser) {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'subscriptions', id));
    }
    const subscriptions = await storage.getSubscriptions();
    localStorage.setItem(KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions.filter(s => s.id !== id)));
  },
  getSubscriptionMonthStatuses: async (): Promise<SubscriptionMonthStatus[]> => {
    if (USE_FIREBASE && auth.currentUser) {
      try {
        const q = query(collection(db, 'users', auth.currentUser.uid, 'subscription_month_status'), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        const statuses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionMonthStatus));
        localStorage.setItem(KEYS.SUBSCRIPTION_MONTH_STATUS, JSON.stringify(statuses));
        return statuses;
      } catch (e) {
        console.warn("Firestore fail, using local cache", e);
      }
    }
    const data = localStorage.getItem(KEYS.SUBSCRIPTION_MONTH_STATUS);
    return data ? JSON.parse(data) : [];
  },
  saveSubscriptionMonthStatus: async (status: SubscriptionMonthStatus) => {
    if (USE_FIREBASE && auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'subscription_month_status', status.id), status);
    }
    const statuses = await storage.getSubscriptionMonthStatuses();
    const index = statuses.findIndex(s => s.id === status.id);
    if (index > -1) statuses[index] = status;
    else statuses.unshift(status);
    localStorage.setItem(KEYS.SUBSCRIPTION_MONTH_STATUS, JSON.stringify(statuses));
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


  // --- COFRES ---
  getVaults: async (): Promise<Vault[]> => {
    if (USE_FIREBASE && auth.currentUser) {
      try {
        const snapshot = await getDocs(collection(db, 'users', auth.currentUser.uid, 'cofres'));
        const vaults = snapshot.docs
          .map((item) => {
            const data = item.data() as Omit<Vault, 'id'> & { createdAt?: Timestamp | string; updatedAt?: Timestamp | string };
            return {
              ...data,
              id: item.id,
              createdAt: toIsoDate(data.createdAt),
              updatedAt: toIsoDate(data.updatedAt),
              ativo: data.ativo ?? true,
            } as Vault;
          })
          .filter((v) => v.ativo)
          .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
        localStorage.setItem(KEYS.VAULTS, JSON.stringify(vaults));
        return vaults;
      } catch (e) {
        console.error('Erro ao buscar cofres no Firestore:', e);
      }
    } else if (USE_FIREBASE && !auth.currentUser) {
      console.warn('Listagem de cofres usando cache local: usuário não autenticado no Firebase.');
    }
    const data = localStorage.getItem(KEYS.VAULTS);
    return data ? JSON.parse(data) : [];
  },
  getVaultById: async (id: string): Promise<Vault | undefined> => {
    const vaults = await storage.getVaults();
    return vaults.find((v) => v.id === id);
  },
  saveVault: async (vault: Vault) => {
    if (USE_FIREBASE && auth.currentUser) {
      const base = {
        nome: vault.nome,
        descricao: vault.descricao || null,
        valorAtual: Number(vault.valorAtual) || 0,
        meta: vault.meta ?? null,
        ativo: vault.ativo ?? true,
        updatedAt: serverTimestamp(),
      };

      try {
        if (vault.id) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'cofres', vault.id), {
            ...base,
            createdAt: vault.createdAt ? new Date(vault.createdAt) : serverTimestamp(),
          }, { merge: true });
          console.log('Cofre salvo no Firestore com ID:', vault.id);
        } else {
          const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'cofres'), {
            ...base,
            createdAt: serverTimestamp(),
          });
          vault.id = docRef.id;
          console.log('Cofre criado no Firestore com ID:', docRef.id);
        }
      } catch (error) {
        console.error('Erro ao salvar cofre no Firestore:', error);
        throw error;
      }
    } else if (USE_FIREBASE && !auth.currentUser) {
      console.warn('Cofre salvo apenas no cache local: usuário não autenticado no Firebase.');
    }
    const vaults = await storage.getVaults();
    const index = vaults.findIndex(v => v.id === vault.id);
    if (index > -1) vaults[index] = vault;
    else vaults.unshift(vault);
    localStorage.setItem(KEYS.VAULTS, JSON.stringify(vaults));
  },
  deleteVault: async (id: string) => {
    if (USE_FIREBASE && auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'cofres', id), {
          ativo: false,
          updatedAt: serverTimestamp(),
        });
        console.log('Cofre marcado como inativo no Firestore:', id);
      } catch (error) {
        console.error('Erro ao excluir cofre no Firestore:', error);
        throw error;
      }
    }
    const vaults = await storage.getVaults();
    localStorage.setItem(KEYS.VAULTS, JSON.stringify(vaults.filter((v) => v.id !== id)));
  },
  getVaultMovements: async (): Promise<VaultMovement[]> => {
    if (USE_FIREBASE && auth.currentUser) {
      try {
        const snapshot = await getDocs(collection(db, 'users', auth.currentUser.uid, 'cofre_movements'));
        const items = snapshot.docs
          .map((item) => {
            const data = item.data() as Omit<VaultMovement, 'id' | 'createdAt'> & { createdAt?: Timestamp | string };
            return {
              ...data,
              id: item.id,
              createdAt: toIsoDate(data.createdAt),
            } as VaultMovement;
          })
          .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
        localStorage.setItem(KEYS.VAULT_MOVEMENTS, JSON.stringify(items));
        return items;
      } catch (e) {
        console.error('Erro ao buscar movimentos de cofre no Firestore:', e);
      }
    }
    const data = localStorage.getItem(KEYS.VAULT_MOVEMENTS);
    return data ? JSON.parse(data) : [];
  },
  saveVaultMovement: async (movement: VaultMovement) => {
    if (USE_FIREBASE && auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'cofre_movements', movement.id), {
          cofreId: movement.cofreId,
          tipo: movement.tipo,
          valor: Number(movement.valor),
          origem: movement.origem,
          mesReferencia: movement.mesReferencia || null,
          createdAt: serverTimestamp(),
        });
        console.log('Movimento de cofre registrado no Firestore com ID:', movement.id);
      } catch (error) {
        console.error('Erro ao registrar movimento de cofre no Firestore:', error);
        throw error;
      }
    } else if (USE_FIREBASE && !auth.currentUser) {
      console.warn('Movimento de cofre salvo apenas no cache local: usuário não autenticado.');
    }
    const items = await storage.getVaultMovements();
    items.unshift(movement);
    localStorage.setItem(KEYS.VAULT_MOVEMENTS, JSON.stringify(items));
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
