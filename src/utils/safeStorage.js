
export const safeStorage = {
    getItem: (key, defaultValue = null) => {
        try {
            return localStorage.getItem(key) || defaultValue;
        } catch (e) {
            console.warn('localStorage access failed:', e);
            return defaultValue;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn('localStorage write failed:', e);
            return false;
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('localStorage remove failed:', e);
            return false;
        }
    }
};
