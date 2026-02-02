
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Wallet, Sun, Moon, User, Settings2, X, ChevronRight } from 'lucide-react';
import { auth } from '../firebase';
import { storage } from '../storage';

interface LayoutProps {
  children: React.ReactNode;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
}

const Layout: React.FC<LayoutProps> = ({ children, toggleTheme, theme }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const authState = storage.getAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isPublic = location.pathname.startsWith('/public');

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair?')) {
      await auth.signOut();
      storage.setAuth(null);
      navigate('/login');
    }
  };

  const navItems = [
    { label: 'Início', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Dívidas', icon: Users, path: '/ledger' },
  ];

  if (isPublic) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors">
        <header className="p-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-indigo-600" />
              <span className="font-black tracking-tight text-gray-900 dark:text-white">Foco Finance</span>
            </div>
          </div>
        </header>
        <main className="py-6 px-4">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex-col sticky top-0 h-screen z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter dark:text-white leading-none">FOCO</h1>
            <span className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.3em]">Finance</span>
          </div>
        </div>
        
        <nav className="flex-1 px-6 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-5 py-4 rounded-[20px] transition-all duration-300 ${
                location.pathname.startsWith(item.path)
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none font-black scale-[1.02]'
                  : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold'
              }`}
            >
              <item.icon size={22} strokeWidth={location.pathname.startsWith(item.path) ? 2.5 : 2} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-gray-100 dark:border-slate-800 space-y-6">
          <div className="flex items-center gap-4">
            {authState.avatarUrl ? (
              <img src={authState.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-2xl border-2 border-indigo-50 dark:border-indigo-900/30" />
            ) : (
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-2xl">
                <User size={24} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">{authState.userName}</p>
              <p className="text-[10px] text-gray-500 font-bold truncate tracking-tight">{authState.userEmail}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={toggleTheme}
              className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-900"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-amber-500" />}
              <span className="text-[10px] font-black uppercase">Tema</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all"
            >
              <LogOut size={18} />
              <span className="text-[10px] font-black uppercase">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-5 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600 rounded-lg">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black dark:text-white tracking-tighter">FOCO</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <User size={16} className="text-indigo-600" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-5 md:p-12 pb-32 md:pb-12">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation - Elegant & Floating */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-slate-800/50 rounded-[32px] px-8 py-4 flex justify-between items-center z-[55] shadow-2xl shadow-indigo-200/40 dark:shadow-none">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-90 ${
                isActive ? 'text-indigo-600' : 'text-gray-400 dark:text-slate-600'
              }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 3 : 2} />
              <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* Menu/Settings Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-90 ${
            isMobileMenuOpen ? 'text-indigo-600' : 'text-gray-400 dark:text-slate-600'
          }`}
        >
          <Settings2 size={24} strokeWidth={isMobileMenuOpen ? 3 : 2} />
          <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isMobileMenuOpen ? 'opacity-100' : 'opacity-60'}`}>
            Ajustes
          </span>
        </button>
      </nav>

      {/* Mobile Settings Bottom Sheet */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[40px] border-t border-gray-100 dark:border-slate-800 shadow-2xl p-8 pb-12 animate-in slide-in-from-bottom duration-500">
            {/* Handle */}
            <div className="flex justify-center mb-8 -mt-2">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full" />
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-[24px] flex items-center justify-center text-indigo-600 border border-indigo-100 dark:border-indigo-900/50">
                  <User size={32} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-black dark:text-white tracking-tight leading-none mb-1">{authState.userName}</h3>
                  <p className="text-xs font-bold text-gray-500 truncate">{authState.userEmail}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => { toggleTheme(); }}
                className="w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-transparent active:border-indigo-500 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                    {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-amber-500" />}
                  </div>
                  <span className="font-black uppercase text-xs tracking-widest dark:text-white">Alternar Tema</span>
                </div>
                <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-black">
                  {theme === 'light' ? 'ESCURO' : 'CLARO'}
                </div>
              </button>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-5 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-transparent active:border-rose-500 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-rose-500">
                    <LogOut size={20} />
                  </div>
                  <span className="font-black uppercase text-xs tracking-widest text-rose-600 dark:text-rose-400">Encerrar Sessão</span>
                </div>
                <ChevronRight size={18} className="text-rose-300" />
              </button>
            </div>

            <p className="mt-10 text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 dark:text-slate-700">
              Foco Finance • v1.0.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
