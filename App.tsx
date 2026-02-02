
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LedgerList from './pages/LedgerList';
import LedgerDetail from './pages/LedgerDetail';
import { storage } from './storage';
import { auth, FIREBASE_READY } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ProtectedRoute = ({ isAuthenticated, children, toggleTheme, theme }: { 
  isAuthenticated: boolean; 
  children?: React.ReactNode;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
}) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout toggleTheme={toggleTheme} theme={theme}>{children}</Layout>;
};

const App: React.FC = () => {
  const [authState, setAuthState] = useState(storage.getAuth());
  const [theme, setTheme] = useState<'light' | 'dark'>(storage.getTheme());
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // 1. Aplicar Tema Inicial
    const initialTheme = storage.getTheme();
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Lógica de Autenticação (Firebase ou Local)
    if (FIREBASE_READY) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          storage.setAuth(user.email, user.displayName, user.photoURL);
        } else {
          // Só limpa se não houver um estado de login local prévio (para permitir persistência offline)
          const localAuth = storage.getAuth();
          if (!localAuth.isAuthenticated) storage.setAuth(null);
        }
        setAuthState(storage.getAuth());
        setInitializing(false);
      });
      return () => unsubscribe();
    } else {
      // Modo Offline/Local: Carrega instantaneamente do LocalStorage
      console.log("App rodando em modo LOCAL (Sem Firebase)");
      setAuthState(storage.getAuth());
      setInitializing(false);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    storage.setTheme(newTheme);
  };

  const handleLoginSuccess = () => {
    setAuthState(storage.getAuth());
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 animate-pulse">Iniciando Foco...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="theme-transition">
        <Routes>
          <Route path="/login" element={!authState.isAuthenticated ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute isAuthenticated={authState.isAuthenticated} toggleTheme={toggleTheme} theme={theme}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/ledger" element={
            <ProtectedRoute isAuthenticated={authState.isAuthenticated} toggleTheme={toggleTheme} theme={theme}>
              <LedgerList />
            </ProtectedRoute>
          } />

          <Route path="/ledger/:id" element={
            <ProtectedRoute isAuthenticated={authState.isAuthenticated} toggleTheme={toggleTheme} theme={theme}>
              <LedgerDetail />
            </ProtectedRoute>
          } />

          <Route path="/public/:slug" element={
            <Layout toggleTheme={toggleTheme} theme={theme}>
              <LedgerDetail isPublic />
            </Layout>
          } />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
