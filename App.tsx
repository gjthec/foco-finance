
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LedgerList from './pages/LedgerList';
import LedgerDetail from './pages/LedgerDetail';
import { storage } from './storage';
import { auth } from './firebase';

const ProtectedRoute = ({ isAuthenticated, isLoading, children, toggleTheme, theme }: { 
  isAuthenticated: boolean; 
  isLoading: boolean;
  children?: React.ReactNode;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
}) => {
  if (isLoading) return null; // Ou um loading spinner
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout toggleTheme={toggleTheme} theme={theme}>{children}</Layout>;
};

const App: React.FC = () => {
  const [authState, setAuthState] = useState(storage.getAuth());
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(storage.getTheme());

  useEffect(() => {
    const initialTheme = storage.getTheme();
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listener do Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const state = {
          isAuthenticated: true,
          userEmail: user.email,
          userName: user.displayName || user.email?.split('@')[0] || 'Usuário',
          avatarUrl: user.photoURL,
          lastLogin: Date.now()
        };
        storage.setAuth(user.email, user.displayName, user.photoURL);
        setAuthState(state);
      } else {
        storage.setAuth(null);
        setAuthState({ isAuthenticated: false, userEmail: null, userName: null, avatarUrl: null });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    storage.setTheme(newTheme);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="theme-transition">
        <Routes>
          <Route path="/login" element={!authState.isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute isAuthenticated={authState.isAuthenticated} isLoading={isLoading} toggleTheme={toggleTheme} theme={theme}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/ledger" element={
            <ProtectedRoute isAuthenticated={authState.isAuthenticated} isLoading={isLoading} toggleTheme={toggleTheme} theme={theme}>
              <LedgerList />
            </ProtectedRoute>
          } />

          <Route path="/ledger/:id" element={
            <ProtectedRoute isAuthenticated={authState.isAuthenticated} isLoading={isLoading} toggleTheme={toggleTheme} theme={theme}>
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
