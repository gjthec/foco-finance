
import React, { useEffect } from 'react';
import { X, AlertTriangle, LogOut, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
  icon?: 'trash' | 'logout' | 'alert';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  icon = 'trash'
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    trash: <Trash2 size={28} />,
    logout: <LogOut size={28} />,
    alert: <AlertTriangle size={28} />
  };

  const colors = {
    danger: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800',
    info: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800'
  };

  const btnColors = {
    danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-100 dark:shadow-none',
    info: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 flex flex-col items-center text-center">
          <div className={`p-4 rounded-2xl mb-6 border ${colors[variant]}`}>
            {icons[icon]}
          </div>
          
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2 uppercase">
            {title}
          </h3>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            {message}
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onClose}
              className="py-4 px-6 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`py-4 px-6 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all shadow-xl active:scale-95 ${btnColors[variant]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
