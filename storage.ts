
import { Transaction, Ledger, AuthState, Subscription, SubscriptionMonthStatus, Vault, VaultMovement, Category } from './types';
import { DEFAULT_CATEGORIES } from './constants';
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

// Coleção raiz e helper para obter o "scope" do usuário (email normalizado).
// Toda a árvore de dados do usuário fica em: focofinance/{email}/{subcoleção}/{docId}
export const ROOT_COLLECTION = 'focofinance';

export const currentUserKey = (): string | null => {
  const email = auth.currentUser?.email;
  if (!email) return null;
  return email.trim().toLowerCase();
};

const toIsoDate = (value: Timestamp | string | undefined | null): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return new Date().toISOString();
};

// Firestore rejeita `undefined`. Esta função remove chaves com valor undefined
// (recursivamente) antes de qualquer setDoc/addDoc.
const stripUndefined = <T,>(input: T): T => {
  if (input === null || input === undefined) return input;
  if (input instanceof Timestamp) return input;
  if (input instanceof Date) return input;
  if (Array.isArray(input)) return input.map(stripUndefined) as any;
  if (typeof input === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(input as Record<string, any>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return input;
};

const KEYS = {
  AUTH: 'foco_finance_auth',
  THEME: 'foco_finance_theme',
  TRANSACTIONS: 'foco_finance_transactions',
  LEDGERS: 'foco_finance_ledgers',
  SUBSCRIPTIONS: 'foco_finance_subscriptions',
  SUBSCRIPTION_MONTH_STATUS: 'foco_finance_subscription_month_status',
  VAULTS: 'foco_finance_vaults',
  VAULT_MOVEMENTS: 'foco_finance_vault_movements',
  CATEGORIES: 'foco_finance_categories'
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
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        const q = query(collection(db, ROOT_COLLECTION, userKey, 'transactions'), orderBy('date', 'desc'));
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
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      await setDoc(doc(db, ROOT_COLLECTION, userKey, 'transactions', tx.id), stripUndefined(tx));
    }
    const txs = await storage.getTransactions();
    const index = txs.findIndex(t => t.id === tx.id);
    if (index > -1) txs[index] = tx;
    else txs.unshift(tx);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
  },
  deleteTransaction: async (id: string) => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      await deleteDoc(doc(db, ROOT_COLLECTION, userKey, 'transactions', id));
    }
    const txs = await storage.getTransactions();
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs.filter(t => t.id !== id)));
  },

  // --- ASSINATURAS RECORRENTES ---
  getSubscriptions: async (): Promise<Subscription[]> => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        const q = query(collection(db, ROOT_COLLECTION, userKey, 'subscriptions'), orderBy('createdAt', 'desc'));
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
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      await setDoc(doc(db, ROOT_COLLECTION, userKey, 'subscriptions', subscription.id), stripUndefined(subscription));
    }
    const subscriptions = await storage.getSubscriptions();
    const index = subscriptions.findIndex(s => s.id === subscription.id);
    if (index > -1) subscriptions[index] = subscription;
    else subscriptions.unshift(subscription);
    localStorage.setItem(KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
  },
  deleteSubscription: async (id: string) => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      await deleteDoc(doc(db, ROOT_COLLECTION, userKey, 'subscriptions', id));
    }
    const subscriptions = await storage.getSubscriptions();
    localStorage.setItem(KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions.filter(s => s.id !== id)));
  },
  getSubscriptionMonthStatuses: async (): Promise<SubscriptionMonthStatus[]> => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        const q = query(collection(db, ROOT_COLLECTION, userKey, 'subscription_month_status'), orderBy('updatedAt', 'desc'));
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
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      await setDoc(doc(db, ROOT_COLLECTION, userKey, 'subscription_month_status', status.id), stripUndefined(status));
    }
    const statuses = await storage.getSubscriptionMonthStatuses();
    const index = statuses.findIndex(s => s.id === status.id);
    if (index > -1) statuses[index] = status;
    else statuses.unshift(status);
    localStorage.setItem(KEYS.SUBSCRIPTION_MONTH_STATUS, JSON.stringify(statuses));
  },

  // --- LEDGERS ---
  getLedgers: async (): Promise<Ledger[]> => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        const q = query(collection(db, ROOT_COLLECTION, userKey, 'ledgers'));
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
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      await setDoc(doc(db, ROOT_COLLECTION, userKey, 'ledgers', ledger.id), stripUndefined(ledger));
      if (ledger.publicReadEnabled) {
        await setDoc(doc(db, 'public_ledgers', ledger.publicSlug), stripUndefined({ ...ledger, ownerEmail: userKey }));
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
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        const snapshot = await getDocs(collection(db, ROOT_COLLECTION, userKey, 'cofres'));
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
    } else if (USE_FIREBASE && !userKey) {
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
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
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
          await setDoc(doc(db, ROOT_COLLECTION, userKey, 'cofres', vault.id), {
            ...base,
            createdAt: vault.createdAt ? new Date(vault.createdAt) : serverTimestamp(),
          }, { merge: true });
          console.log('Cofre salvo no Firestore com ID:', vault.id);
        } else {
          const docRef = await addDoc(collection(db, ROOT_COLLECTION, userKey, 'cofres'), {
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
    } else if (USE_FIREBASE && !userKey) {
      console.warn('Cofre salvo apenas no cache local: usuário não autenticado no Firebase.');
    }
    const vaults = await storage.getVaults();
    const index = vaults.findIndex(v => v.id === vault.id);
    if (index > -1) vaults[index] = vault;
    else vaults.unshift(vault);
    localStorage.setItem(KEYS.VAULTS, JSON.stringify(vaults));
  },
  deleteVault: async (id: string) => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        await updateDoc(doc(db, ROOT_COLLECTION, userKey, 'cofres', id), {
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
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        const snapshot = await getDocs(collection(db, ROOT_COLLECTION, userKey, 'cofre_movements'));
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
  deleteVaultMovement: async (movementId: string) => {
    const userKey = currentUserKey();
    const movements = await storage.getVaultMovements();
    const movement = movements.find((m) => m.id === movementId);
    if (!movement) return;

    // Reverte o saldo do cofre antes de remover o movimento.
    const vault = await storage.getVaultById(movement.cofreId);
    if (vault) {
      const delta = movement.tipo === 'DEPOSITO' ? -movement.valor : movement.valor;
      await storage.saveVault({
        ...vault,
        valorAtual: Math.max(0, vault.valorAtual + delta),
        updatedAt: new Date().toISOString(),
      });
    }

    if (USE_FIREBASE && userKey) {
      try {
        await deleteDoc(doc(db, ROOT_COLLECTION, userKey, 'cofre_movements', movementId));
      } catch (error) {
        console.error('Erro ao remover movimento de cofre no Firestore:', error);
        throw error;
      }
    }
    const updated = movements.filter((m) => m.id !== movementId);
    localStorage.setItem(KEYS.VAULT_MOVEMENTS, JSON.stringify(updated));
  },
  saveVaultMovement: async (movement: VaultMovement) => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        await setDoc(doc(db, ROOT_COLLECTION, userKey, 'cofre_movements', movement.id), {
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
    } else if (USE_FIREBASE && !userKey) {
      console.warn('Movimento de cofre salvo apenas no cache local: usuário não autenticado.');
    }
    const items = await storage.getVaultMovements();
    items.unshift(movement);
    localStorage.setItem(KEYS.VAULT_MOVEMENTS, JSON.stringify(items));
  },

  // --- CATEGORIAS CUSTOMIZADAS ---
  // As categorias padrão de `DEFAULT_CATEGORIES` ficam fixas e não são editáveis.
  // Aqui ficam apenas as que o usuário criou.
  getCategories: async (): Promise<Category[]> => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      try {
        const snapshot = await getDocs(collection(db, ROOT_COLLECTION, userKey, 'categories'));
        const cats = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) } as Category))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats));
        return cats;
      } catch (e) {
        console.warn('Firestore fail (categories), using local cache', e);
      }
    }
    const data = localStorage.getItem(KEYS.CATEGORIES);
    return data ? JSON.parse(data) : [];
  },
  saveCategory: async (category: Category) => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      await setDoc(doc(db, ROOT_COLLECTION, userKey, 'categories', category.id), stripUndefined(category));
    }
    const cats = await storage.getCategories();
    const index = cats.findIndex((c) => c.id === category.id);
    if (index > -1) cats[index] = category;
    else cats.push(category);
    cats.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats));
  },
  deleteCategory: async (id: string) => {
    const userKey = currentUserKey();
    if (USE_FIREBASE && userKey) {
      await deleteDoc(doc(db, ROOT_COLLECTION, userKey, 'categories', id));
    }
    const cats = await storage.getCategories();
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(cats.filter((c) => c.id !== id)));
  },
  // Lista mesclada (padrões + customizadas), deduplicada e pronta para dropdowns.
  getAllCategoryNames: async (): Promise<string[]> => {
    const custom = await storage.getCategories();
    const merged = [...DEFAULT_CATEGORIES, ...custom.map((c) => c.name)];
    return Array.from(new Set(merged));
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
