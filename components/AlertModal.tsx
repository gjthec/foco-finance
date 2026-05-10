import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, title = 'Atenção', message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-black tracking-tight dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">{message}</p>
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest">
          Entendi
        </button>
      </div>
    </div>
  );
};

export default AlertModal;
