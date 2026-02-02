
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Wallet, Sun, Moon, User, X, ChevronRight, ArrowLeft, Menu as MenuIcon } from 'lucide-react';
import { auth } from '../firebase';
import { storage } from '../storage';
import ConfirmDialog from './ConfirmDialog';

interface LayoutProps {
  children: React.ReactNode;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
}

const Layout: React.FC<LayoutProps> = ({ children, toggleTheme, theme }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const authState = storage.getAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isPublic = location.pathname.startsWith('/public');

  // Determinar título da página e se mostra botão voltar no mobile
  const getPageContext = () => {
    if (location.pathname.startsWith('/dashboard')) return { title: 'Início', showBack: false };
    if (location.pathname.startsWith('/ledger/')) return { title: 'Detalhes', showBack: true, backTo: '/ledger' };
    if (location.pathname === '/ledger') return { title: 'Dívidas', showBack: false };
    return { title: 'Foco', showBack: false };
  };

  const context = getPageContext();

  useEffect(() => {
    if (isMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isMenuOpen]);

  // Fechar menu ao mudar de rota
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await auth.signOut();
    storage.setAuth(null);
    navigate('/login');
  };

  const navItems = [
    { label: 'Início', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Dívidas', icon: Users, path: '/ledger' },
  ];

  if (isPublic) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100">
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
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex-col sticky top-0 h-screen z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-xl">
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
                  ? 'bg-indigo-600 text-white shadow-xl font-black scale-[1.02]'
                  : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-indigo-600 font-bold'
              }`}
            >
              <item.icon size={22} strokeWidth={location.pathname.startsWith(item.path) ? 2.5 : 2} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-gray-100 dark:border-slate-800 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-2xl">
              <User size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase tracking-tighter">{authState.userName}</p>
              <p className="text-[10px] text-gray-500 font-bold truncate tracking-tight">{authState.userEmail}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleTheme} className="flex flex-col items-center gap-1 p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 transition-all border border-transparent">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-amber-500" />}
              <span className="text-[10px] font-black uppercase">Tema</span>
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="flex flex-col items-center gap-1 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all">
              <LogOut size={18} />
              <span className="text-[10px] font-black uppercase">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <header className="md:hidden flex items-center px-5 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] min-h-[64px]">
        <div className="flex-1 flex items-center gap-3">
          {context.showBack && (
            <button 
              onClick={() => {
                if (context.backTo) {
                  navigate(context.backTo);
                } else {
                  navigate(-1);
                }
              }}
              className="p-2 -ml-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl active:scale-90 transition-transform"
            >
              <ArrowLeft size={20} strokeWidth={3} />
            </button>
          )}
          <h1 className="text-lg font-black dark:text-white tracking-tight leading-none uppercase tracking-widest text-indigo-600">
            {context.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
            <User size={16} strokeWidth={2.5} />
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-x-hidden p-5 md:p-12 pb-28 md:pb-12">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* TAB BAR MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-gray-100 dark:border-slate-800 px-6 py-3 pb-6 flex justify-between items-center z-[50]">
        <Link
          to="/dashboard"
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
            location.pathname.startsWith('/dashboard') ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <LayoutDashboard size={24} strokeWidth={location.pathname.startsWith('/dashboard') ? 2.5 : 2} />
          <span className="text-[10px] font-black uppercase tracking-widest">Início</span>
          {location.pathname.startsWith('/dashboard') && <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
        </Link>

        <Link
          to="/ledger"
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
            location.pathname.startsWith('/ledger') ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <Users size={24} strokeWidth={location.pathname.startsWith('/ledger') ? 2.5 : 2} />
          <span className="text-[10px] font-black uppercase tracking-widest">Dívidas</span>
          {location.pathname.startsWith('/ledger') && <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
        </Link>

        <button
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
            isMenuOpen ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <MenuIcon size={24} />
          <span className="text-[10px] font-black uppercase tracking-widest">Menu</span>
        </button>
      </nav>

      {/* GAVETA DE MENU MOBILE (BOTTOM SHEET) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Fundo escurecido */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Gaveta */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[40px] shadow-2xl p-8 pb-12 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-center mb-6 -mt-2">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full" />
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                <User size={28} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-black dark:text-white tracking-tight leading-none mb-1 truncate">{authState.userName}</h3>
                <p className="text-xs font-bold text-gray-500 truncate">{authState.userEmail}</p>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="ml-auto p-2 bg-gray-50 dark:bg-slate-800 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <button 
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-transparent active:border-indigo-500 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    {theme === 'light' ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-amber-500" />}
                  </div>
                  <span className="font-black uppercase text-xs tracking-widest dark:text-white">Aparência</span>
                </div>
                <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full">
                  {theme === 'light' ? 'ESCURO' : 'CLARO'}
                </span>
              </button>

              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-between p-5 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-transparent active:border-rose-500 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-rose-500">
                    <LogOut size={20} />
                  </div>
                  <span className="font-black uppercase text-xs tracking-widest text-rose-600 dark:text-rose-400">Desconectar</span>
                </div>
                <ChevronRight size={18} className="text-rose-300" />
              </button>
            </div>

            <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 dark:text-slate-700">
              FOCO FINANCE • CONTROLE TOTAL
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Encerrar Sessão"
        message="Tem certeza que deseja sair do aplicativo? Você precisará entrar novamente para acessar seus dados."
        confirmLabel="Sim, Sair"
        icon="logout"
        variant="info"
      />
    </div>
  );
};

export default Layout;
