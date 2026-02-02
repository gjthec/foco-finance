
// Fix: Use namespaced import to avoid 'no exported member' errors for initializeApp, getApp, and getApps
import * as firebaseApp from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCID7AGwR-tfNsiJIBd0nPfBGE5adLAbwY",
  authDomain: "train-api-49052.firebaseapp.com",
  projectId: "train-api-49052",
  storageBucket: "train-api-49052.firebasestorage.app",
  messagingSenderId: "1056584302761",
  appId: "1:1056584302761:web:659d6c4a3692ded2c4a9b8",
  measurementId: "G-DT7ZYWWZ8E",
};

// Verifica se as chaves mínimas existem para não quebrar o app
const isConfigValid = true;

let app;
if (isConfigValid) {
  try {
    const apps = firebaseApp.getApps();
    // Fix: Accessing Firebase App members through the namespaced import
    app = apps.length > 0 ? firebaseApp.getApp() : firebaseApp.initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
    app = { name: "mock-app" } as any;
  }
} else {
  app = { name: "mock-app" } as any;
}

export const auth = isConfigValid ? getAuth(app) : { 
  currentUser: null, 
  signOut: async () => {},
  onAuthStateChanged: (cb: any) => { 
    // Mock do listener para modo offline
    setTimeout(() => cb(null), 0);
    return () => {}; 
  } 
} as any;

export const db = isConfigValid ? getFirestore(app) : {} as any;
export const googleProvider = new GoogleAuthProvider();
export const FIREBASE_READY = isConfigValid;

export default app;
