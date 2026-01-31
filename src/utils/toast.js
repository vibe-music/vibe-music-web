import { toast } from 'sonner';

/**
 * Centralized Toast utility for Vibe Music
 * Provides a premium, consistent look for all notifications using Sonner
 */
export const showToast = {
    success: (message) => toast.success(message),

    error: (message) => toast.error(message),

    warning: (message) => toast(message, {
        icon: '⚠️',
    }),

    loading: (message) => toast.loading(message),

    dismiss: (id) => toast.dismiss(id),
};
