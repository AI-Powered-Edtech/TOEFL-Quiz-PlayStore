import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const prefersReducedMotion = useReducedMotion();
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, toast.duration || 3000);

        return () => clearTimeout(timer);
    }, [toast, onClose]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle className="w-5 h-5" />;
            case 'error':
                return <XCircle className="w-5 h-5" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5" />;
            case 'info':
                return <Info className="w-5 h-5" />;
        }
    };

    const getColorClasses = () => {
        switch (toast.type) {
            case 'success':
                return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
            case 'error':
                return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
            case 'warning':
                return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
            case 'info':
                return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
        }
    };

    return (
        <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 300 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 300 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${getColorClasses()} min-w-[300px] max-w-md`}
        >
            <div className="flex-shrink-0">
                {getIcon()}
            </div>
            <p className="flex-1 text-sm font-medium">
                {toast.message}
            </p>
            <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

interface ToastContainerProps {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        toast={toast}
                        onClose={() => onRemove(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

// Hook to manage toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = (type: ToastType, message: string, duration?: number) => {
        const id = `toast_${Date.now()}_${Math.random()}`;
        const newToast: ToastMessage = { id, type, message, duration };
        setToasts((prev) => [...prev, newToast]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return {
        toasts,
        showToast,
        removeToast,
        success: (message: string, duration?: number) => showToast('success', message, duration),
        error: (message: string, duration?: number) => showToast('error', message, duration),
        info: (message: string, duration?: number) => showToast('info', message, duration),
        warning: (message: string, duration?: number) => showToast('warning', message, duration),
    };
};
