import { safeStorage } from '../utils/safeStorage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../context/UserContext';

const MAX_FREE_SESSIONS = 4;
const USAGE_KEY = 'vibe_mode_usage';

export const useVibeMode = () => {
    const { isPro } = useUser();
    const [isActive, setIsActive] = useState(false);
    const [characterIndex, setCharacterIndex] = useState(0);
    const [usageError, setUsageError] = useState(null);
    const [showProDiscovery, setShowProDiscovery] = useState(false);
    const wakeLockRef = useRef(null);

    // Get current usage from localStorage
    const getUsage = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        const dataStr = safeStorage.getItem(USAGE_KEY);
        try {
            const data = JSON.parse(dataStr || 'null');
            if (data?.date === today) {
                return data.count;
            }
            return 0;
        } catch {
            return 0;
        }
    }, []);

    // Increment usage
    const incrementUsage = useCallback(() => {
        if (isPro) return true;

        const today = new Date().toISOString().split('T')[0];
        const currentCount = getUsage();

        if (currentCount >= MAX_FREE_SESSIONS) {
            setUsageError('Daily limit reached (4 sessions). Upgrade to Pro for unlimited Vibe Mode!');
            return false;
        }

        const newData = { date: today, count: currentCount + 1 };
        safeStorage.setItem(USAGE_KEY, JSON.stringify(newData));
        return true;
    }, [isPro, getUsage]);

    // Wake Lock handling
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                console.log('Wake Lock active');
            } catch (err) {
                console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        }
    };

    const releaseWakeLock = useCallback(() => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release();
            wakeLockRef.current = null;
            console.log('Wake Lock released');
        }
    }, []);

    const enterVibeMode = () => {
        if (incrementUsage()) {
            setIsActive(true);
            requestWakeLock();
            setUsageError(null);
            if (!isPro) {
                setShowProDiscovery(true);
            }
        }
    };

    const dismissProDiscovery = () => {
        setShowProDiscovery(false);
    };

    const exitVibeMode = () => {
        setIsActive(false);
        releaseWakeLock();
    };

    const nextCharacter = () => {
        setCharacterIndex((prev) => (prev + 1) % 6); // Supporting 6 characters
    };

    // Re-lock if page visibility changes (common for Wake Lock)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (isActive && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isActive]);

    // Cleanup
    useEffect(() => {
        return () => releaseWakeLock();
    }, [releaseWakeLock]);

    return {
        isActive,
        characterIndex,
        usageError,
        showProDiscovery,
        remainingSessions: isPro ? Infinity : Math.max(0, MAX_FREE_SESSIONS - getUsage()),
        enterVibeMode,
        exitVibeMode,
        nextCharacter,
        dismissProDiscovery
    };
};
