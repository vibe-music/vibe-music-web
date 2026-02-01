import { safeStorage } from './safeStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

class VibeSyncService {
    _getToken() {
        return safeStorage.getItem('vibe_sync_token');
    }

    setToken(token) {
        if (token) {
            safeStorage.setItem('vibe_sync_token', token);
        } else {
            safeStorage.removeItem('vibe_sync_token');
        }
    }

    async login(email, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            if (data.token) this.setToken(data.token);

            const userData = data.user || {
                id: data._id,
                email: data.email,
                name: data.name,
                picture: data.picture,
                subscription: data.subscription
            };

            if (userData.email) {
                safeStorage.setItem('vibe_sync_user', JSON.stringify(userData));
                window.dispatchEvent(new Event('vibe-user-update'));
            }
        }
        return data;
    }

    async googleLogin(idToken) {
        const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
        });
        const data = await response.json();
        if (data.token) this.setToken(data.token);

        const userData = data.user || {
            id: data._id,
            email: data.email,
            name: data.name,
            picture: data.picture,
            subscription: data.subscription
        };

        if (userData.email) {
            safeStorage.setItem('vibe_sync_user', JSON.stringify(userData));
            window.dispatchEvent(new Event('vibe-user-update'));
        }
        return data;
    }

    async register(email, password) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            if (data.token) this.setToken(data.token);

            const userData = data.user || {
                id: data._id,
                email: data.email,
                name: data.name,
                picture: data.picture,
                subscription: data.subscription
            };

            if (userData.email) {
                safeStorage.setItem('vibe_sync_user', JSON.stringify(userData));
                window.dispatchEvent(new Event('vibe-user-update'));
            }
        }
        return data;
    }

    async uploadSync(libraryData) {
        const token = this._getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(libraryData),
        });
        return response.json();
    }

    async downloadSync() {
        const token = this._getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/sync`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    }

    async getSyncHistory() {
        const token = this._getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/sync/history`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    }

    async restoreVersion(versionId) {
        const token = this._getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/sync/restore/${versionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    }

    async createPaymentOrder(plan) {
        console.log('[VibeSyncService] Creating payment order for plan:', plan);
        const token = this._getToken();
        if (!token) throw new Error('Not authenticated');

        try {
            const response = await fetch(`${API_URL}/payments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ plan }),
            });

            const data = await response.json();
            console.log('[VibeSyncService] Create order response:', { status: response.status, data });

            if (!response.ok) {
                throw new Error(data.message || `Server error: ${response.status}`);
            }

            if (!data.id) {
                throw new Error('Server returned OK but no order ID found');
            }

            return data;
        } catch (error) {
            console.error('[VibeSyncService] Error in createPaymentOrder:', error);
            throw error;
        }
    }

    async capturePaymentOrder(orderId, plan) {
        const token = this._getToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_URL}/payments/capture-order/${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ plan }),
        });
        const data = await response.json();
        if (response.ok && data.user) {
            safeStorage.setItem('vibe_sync_user', JSON.stringify(data.user));
            window.dispatchEvent(new Event('vibe-user-update'));
        }
        return data;
    }


    logout() {
        this.setToken(null);
        safeStorage.removeItem('vibe_sync_user');
        window.dispatchEvent(new Event('vibe-user-update'));
    }

    isAuthenticated() {
        return !!this._getToken();
    }
}

export const vibeSyncService = new VibeSyncService();
