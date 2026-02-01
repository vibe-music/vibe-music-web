import { useState, useEffect } from 'react';
import localforage from 'localforage';

const STORAGE_KEY = 'pwa_prompt_dismissed';

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check platform and mode
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

        setIsIOS(ios);
        setIsStandalone(standalone);

        // Handler for Android/Chrome prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            checkAndShowPrompt();
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Separate check for iOS (since no beforeinstallprompt)
        if (ios && !standalone) {
            checkAndShowPrompt();
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const checkAndShowPrompt = async () => {
        const dismissed = await localforage.getItem(STORAGE_KEY);
        if (!dismissed) {
            setShowPrompt(true);
        }
    };

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowPrompt(false);
            }
        }
    };

    const handleDismiss = async () => {
        setShowPrompt(false);
        // Don't show again for 7 days
        await localforage.setItem(STORAGE_KEY, Date.now() + (7 * 24 * 60 * 60 * 1000));
    };

    return {
        showPrompt,
        isIOS,
        handleInstall,
        handleDismiss,
        canInstall: !!deferredPrompt
    };
};
