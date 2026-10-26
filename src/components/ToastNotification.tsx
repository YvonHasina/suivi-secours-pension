import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      id="toast-notifications-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = {
            success: {
              icon: CheckCircle2,
              bg: 'bg-white border-emerald-300 text-emerald-950',
              iconColor: 'text-emerald-600',
              barColor: 'bg-emerald-500',
            },
            error: {
              icon: XCircle,
              bg: 'bg-white border-rose-300 text-rose-950',
              iconColor: 'text-rose-600',
              barColor: 'bg-rose-500',
            },
            warning: {
              icon: AlertTriangle,
              bg: 'bg-white border-amber-300 text-amber-950',
              iconColor: 'text-amber-600',
              barColor: 'bg-amber-500',
            },
            info: {
              icon: Info,
              bg: 'bg-white border-blue-300 text-blue-950',
              iconColor: 'text-blue-600',
              barColor: 'bg-blue-500',
            },
          }[toast.type];

          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              layout
              className={`pointer-events-auto relative overflow-hidden rounded-xl border shadow-xl p-4 flex items-start gap-3 ${config.bg}`}
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${config.barColor}`}
              />
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
                {toast.message && (
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors -mr-1 -mt-1"
                aria-label="Fermer la notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
