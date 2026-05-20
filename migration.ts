// Script ÚNICO de migração: users/{uid}/... -> focofinance/{email}/...
// Como usar (no navegador, com o usuário logado):
//
//   1) Abra o DevTools (F12) → Console
//   2) Digite: await window.__migrateFocoFinance()
//   3) Aguarde os logs até "MIGRAÇÃO CONCLUÍDA"
//   4) Dá F5 e confira se tudo aparece normalmente
//
// O script COPIA os dados antigos para a nova estrutura, sem apagar nada.
// Os documentos antigos em users/{uid} ficam como backup; apague manualmente
// pelo console do Firebase quando confirmar que tudo está OK.

import { auth, db } from './firebase';
import { collection, doc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { ROOT_COLLECTION, currentUserKey } from './storage';

type MigrationResult = {
  subcollection: string;
  migrated: number;
  skipped: number;
  errors: string[];
};

const SUBCOLLECTIONS = [
  'transactions',
  'subscriptions',
  'subscription_month_status',
  'ledgers',
  'cofres',
  'cofre_movements',
];

const sanitize = (raw: any): any => {
  // Firestore não aceita undefined, mas aceita null. Strip undefineds recursivamente.
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Timestamp) return raw;
  if (Array.isArray(raw)) return raw.map(sanitize);
  if (typeof raw === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v === undefined) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return raw;
};

const migrateSubcollection = async (
  uid: string,
  emailKey: string,
  sub: string,
): Promise<MigrationResult> => {
  const result: MigrationResult = { subcollection: sub, migrated: 0, skipped: 0, errors: [] };
  try {
    const snap = await getDocs(collection(db, 'users', uid, sub));
    console.log(`[${sub}] encontrados ${snap.size} documentos em users/${uid}/${sub}`);
    for (const d of snap.docs) {
      try {
        const payload = sanitize(d.data());
        await setDoc(doc(db, ROOT_COLLECTION, emailKey, sub, d.id), payload, { merge: true });
        result.migrated += 1;
      } catch (err: any) {
        result.errors.push(`${d.id}: ${err?.message || err}`);
        result.skipped += 1;
      }
    }
  } catch (err: any) {
    result.errors.push(`falha ao ler subcoleção: ${err?.message || err}`);
  }
  return result;
};

export const migrateFocoFinance = async (): Promise<MigrationResult[]> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Nenhum usuário logado. Faça login antes de rodar a migração.');
  }
  const uid = user.uid;
  const emailKey = currentUserKey();
  if (!emailKey) {
    throw new Error('Usuário logado não possui email. Migração cancelada.');
  }

  console.log('============================================');
  console.log('INICIANDO MIGRAÇÃO');
  console.log(`  uid origem: ${uid}`);
  console.log(`  email destino: ${emailKey}`);
  console.log(`  destino: ${ROOT_COLLECTION}/${emailKey}/...`);
  console.log('============================================');

  // Marca o documento raiz com metadados (não obrigatório, mas útil pra debugar)
  await setDoc(
    doc(db, ROOT_COLLECTION, emailKey),
    {
      email: emailKey,
      legacyUid: uid,
      migratedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  const results: MigrationResult[] = [];
  for (const sub of SUBCOLLECTIONS) {
    const r = await migrateSubcollection(uid, emailKey, sub);
    console.log(
      `[${sub}] migrados=${r.migrated} pulados=${r.skipped}${r.errors.length ? ' erros=' + r.errors.length : ''}`,
    );
    if (r.errors.length) console.warn(`[${sub}] erros:`, r.errors);
    results.push(r);
  }

  const totalMigrated = results.reduce((acc, r) => acc + r.migrated, 0);
  const totalErrors = results.reduce((acc, r) => acc + r.errors.length, 0);
  console.log('============================================');
  console.log(`MIGRAÇÃO CONCLUÍDA — ${totalMigrated} documentos copiados, ${totalErrors} erros`);
  console.log('Os dados antigos em users/{uid}/... continuam intactos como backup.');
  console.log('Recarregue a página (F5) para usar os dados na nova estrutura.');
  console.log('============================================');

  return results;
};

if (typeof window !== 'undefined') {
  (window as any).__migrateFocoFinance = migrateFocoFinance;
}
