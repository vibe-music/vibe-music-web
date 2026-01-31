import { safeStorage } from './safeStorage';

const CACHE_NAME = 'vibe-music-audio-v1';
const getDynamicLimit = () => {
    try {
        const savedLimit = safeStorage.getItem('vibe_storage_limit');
        return (savedLimit ? parseInt(savedLimit) : 200) * 1024 * 1024;
    } catch {
        return 200 * 1024 * 1024;
    }
};
const MAX_CACHE_SIZE = getDynamicLimit();

export const initAudioCache = async () => {
    if ('caches' in window) {
        try {
            const cache = await caches.open(CACHE_NAME);
            return cache;
        } catch (error) {
            console.error('Failed to initialize cache:', error);
            return null;
        }
    }
    return null;
};

export const cacheAudio = async (url, songId) => {
    if (!('caches' in window)) {
        throw new Error('Cache API not supported');
    }

    try {
        const currentSize = await getCacheSize();
        if (currentSize >= getDynamicLimit()) {
            throw new Error('Storage limit reached. Please increase limit in Settings.');
        }

        const cache = await caches.open(CACHE_NAME);

        // Fetch and cache the audio
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Clone response for caching
        await cache.put(url, response.clone());

        // Save metadata
        const metadata = {
            songId,
            url,
            cachedAt: Date.now(),
            size: parseInt(response.headers.get('content-length') || '0')
        };

        await saveCacheMetadata(songId, metadata);

        return metadata;
    } catch (error) {
        console.error('Failed to cache audio:', error);
        throw error;
    }
};

export const getCachedAudio = async (url) => {
    if (!('caches' in window)) {
        return null;
    }

    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(url);

        if (response) {
            return response;
        }

        return null;
    } catch (error) {
        console.error('Failed to get cached audio:', error);
        return null;
    }
};

export const removeCachedAudio = async (url) => {
    if (!('caches' in window)) {
        return false;
    }

    try {
        const cache = await caches.open(CACHE_NAME);
        return await cache.delete(url);
    } catch (error) {
        console.error('Failed to remove cached audio:', error);
        return false;
    }
};

export const getCacheSize = async () => {
    if (!('caches' in window)) {
        return 0;
    }

    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();

        let totalSize = 0;

        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }

        return totalSize;
    } catch (error) {
        console.error('Failed to calculate cache size:', error);
        return 0;
    }
};

export const clearAudioCache = async () => {
    if (!('caches' in window)) {
        return;
    }

    try {
        await caches.delete(CACHE_NAME);
        // Clear metadata
        const { deleteSetting } = await import('./storage');
        await deleteSetting('cache_metadata');
    } catch (error) {
        console.error('Failed to clear cache:', error);
        throw error;
    }
};

export const getCachedSongs = async () => {
    const { getSetting } = await import('./storage');
    const metadata = await getSetting('cache_metadata') || {};
    return Object.values(metadata);
};

const saveCacheMetadata = async (songId, metadata) => {
    const { getSetting, saveSetting } = await import('./storage');
    const allMetadata = await getSetting('cache_metadata') || {};
    allMetadata[songId] = metadata;
    await saveSetting('cache_metadata', allMetadata);
};

export const playWithCache = async (url, audioElement) => {
    try {
        // We now rely on the Service Worker (configured in vite.config.js) 
        // to handle caching and Range requests transparently.
        // Setting the src directly allows the browser to stream and seek 
        // efficiently.
        audioElement.src = url;

        // We check if it's already cached just for analytics/UI purposes
        const cached = await getCachedAudio(url);
        return {
            source: cached ? 'cache' : 'network',
            url
        };
    } catch (error) {
        console.error('Error playing with cache:', error);
        audioElement.src = url;
        return { source: 'fallback', url, error: error.message };
    }
};
