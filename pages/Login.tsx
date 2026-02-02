
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Lock, Mail, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { storage } from '../storage';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile 
} from 'firebase/auth';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      
      if (onLoginSuccess) onLoginSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro na autenticação. Verifique os dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onLoginSuccess) onLoginSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      setError("Erro ao entrar com Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl p-8 md:p-10 border border-gray-100 dark:border-slate-800 relative overflow-hidden">
        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 dark:shadow-none">
            <Wallet className="text-white w-7 h-7" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">FOCO</h1>
          <p className="text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-[0.3em] -mt-1 mb-2">Finance</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm font-bold animate-in fade-in">
            <AlertCircle size={18} />
            <span className="truncate">{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full py-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 mb-6"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          <span className="text-sm">Continuar com Google</span>
        </button>

        <div className="relative flex items-center gap-4 mb-6">
          <div className="flex-1 h-[1px] bg-gray-100 dark:bg-slate-800" />
          <span className="text-[10px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest">ou e-mail</span>
          <div className="flex-1 h-[1px] bg-gray-100 dark:bg-slate-800" />
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors w-5 h-5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@foco.com"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
              <>
                {mode === 'login' ? 'Entrar' : 'Cadastrar'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
          {mode === 'login' ? 'Ainda não tem acesso?' : 'Já possui uma conta?'}
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-indigo-600 dark:text-indigo-400 font-black ml-2 hover:underline tracking-tight"
          >
            {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
