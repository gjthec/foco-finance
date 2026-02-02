
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Wallet, Sun, Moon, User } from 'lucide-react';
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
  const isPublic = location.pathname.startsWith('/public');

  const handleLogout = async () => {
    await auth.signOut();
    storage.setAuth(null);
    navigate('/login');
  };

  const ThemeToggle = ({ className = "" }: { className?: string }) => (
    <button 
      onClick={toggleTheme} 
      className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm group ${className}`}
      aria-label="Alternar Tema"
    >
      {theme === 'light' ? (
        <>
          <Moon size={18} className="text-slate-600 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-600">Modo Escuro</span>
        </>
      ) : (
        <>
          <Sun size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-amber-400">Modo Claro</span>
        </>
      )}
    </button>
  );

  if (isPublic) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors">
        <header className="p-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 transition-colors">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-indigo-600" />
              <span className="font-bold text-gray-900 dark:text-white">Foco Finance</span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="py-8">
          {children}
        </main>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Dívidas', icon: Users, path: '/ledger' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-slate-950 transition-colors">
      <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-indigo-600" />
          <h1 className="text-lg font-bold dark:text-white tracking-tight">Foco Finance</h1>
        </div>
        <ThemeToggle />
      </header>

      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col sticky top-0 h-screen transition-colors z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter dark:text-white leading-none">FOCO</h1>
            <span className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em]">Finance</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                location.pathname.startsWith(item.path)
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none font-bold scale-[1.02]'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 p-2">
            {authState.avatarUrl ? (
              <img src={authState.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-xl border border-gray-200 dark:border-slate-700" />
            ) : (
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-xl">
                <User size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">{authState.userName}</p>
              <p className="text-[10px] text-gray-500 truncate">{authState.userEmail}</p>
            </div>
          </div>

          <ThemeToggle className="w-full justify-center" />
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden p-4 md:p-10 transition-colors">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
