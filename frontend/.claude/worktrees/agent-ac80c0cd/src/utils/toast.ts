import toast from 'react-hot-toast';

/**
 * Toast notification utilities for user feedback
 * Wraps react-hot-toast with consistent styling
 */

export const showSuccess = (message: string) => {
    toast.success(message, {
        duration: 3000,
        position: 'top-center',
        style: {
            background: '#10b981',
            color: '#fff',
            fontWeight: '500',
        },
        iconTheme: {
            primary: '#fff',
            secondary: '#10b981',
        },
    });
};

export const showError = (message: string) => {
    toast.error(message, {
        duration: 4000,
        position: 'top-center',
        style: {
            fontWeight: '500',
        },
    });
};

export const showInfo = (message: string) => {
    toast(message, {
        icon: 'ℹ️',
        duration: 3000,
        position: 'top-center',
        style: {
            fontWeight: '500',
        },
    });
};

export const showLoading = (message: string) => {
    return toast.loading(message, {
        position: 'top-center',
    });
};

export const dismissToast = (toastId: string) => {
    toast.dismiss(toastId);
};
