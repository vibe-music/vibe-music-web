import { safeStorage } from '../utils/safeStorage';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { startBackgroundSync, stopBackgroundSync, requestSync } from '../utils/cloudSync';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const loadUser = () => {
        try {
            const userData = JSON.parse(safeStorage.getItem('vibe_sync_user', 'null'));
            const token = safeStorage.getItem('vibe_sync_token');
            setUser(userData);
            setIsAuthenticated(!!token && !!userData);
        } catch (error) {
            console.error('Failed to parse user data from localStorage:', error);
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    useEffect(() => {
        loadUser();

        // Sync state across tabs
        const handleStorageUpdate = (e) => {
            if (e.key === 'vibe_sync_user') {
                loadUser();
            }
        };

        // Listen for internal storage updates (within the same tab)
        const handleLocalUpdate = () => loadUser();

        window.addEventListener('storage', handleStorageUpdate);
        window.addEventListener('vibe-user-update', handleLocalUpdate);

        return () => {
            window.removeEventListener('storage', handleStorageUpdate);
            window.removeEventListener('vibe-user-update', handleLocalUpdate);
        };
    }, []);

    const isPro = useMemo(() => {
        if (!user || !user.subscription) return false;
        // Unified logic: any status that isn't 'free' and isn't empty is PRO
        return user.subscription.status && user.subscription.status.toLowerCase() !== 'free';
    }, [user]);

    // Manage Background Sync Lifecycle
    useEffect(() => {
        if (isAuthenticated && isPro) {
            startBackgroundSync(true);

            // Listen for local changes to trigger sync
            const handleStorageChange = () => {
                requestSync(5000); // Debounced 5s sync
            };

            window.addEventListener('vibe-storage-update', handleStorageChange);

            return () => {
                stopBackgroundSync();
                window.removeEventListener('vibe-storage-update', handleStorageChange);
            };
        }
    }, [isAuthenticated, isPro]);

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login');

    const value = {
        user,
        isAuthenticated,
        isPro,
        refreshUser: loadUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authMode,
        setAuthMode
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
