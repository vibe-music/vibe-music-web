import {
    getAllAlbums, getAllSongs, getAllPlaylists, saveAlbum, saveSong, savePlaylist,
    saveSetting, getAllTombstones, clearTombstones, saveTombstone, deleteAlbum, deleteSong, deletePlaylist,
    getAllSettings
} from './storage';
import { getListeningStats } from './analytics';
import { vibeSyncService } from './vibeSyncService';

/**
 * Main sync operation using VibeSync
 */
export const performSync = async (onProgress) => {
    try {
        if (!vibeSyncService.isAuthenticated()) {
            throw new Error('Please log in to VibeSync to sync your library.');
        }

        onProgress?.('Fetching latest from VibeSync...');
        const cloudData = await vibeSyncService.downloadSync();

        // If it's a new account, cloudData might just be a message or empty
        if (cloudData.message && !cloudData.albums) {
            onProgress?.('No remote data found. Preparing first upload...');
        }

        onProgress?.('Merging data...');
        const localAlbums = await getAllAlbums();
        const localSongs = await getAllSongs();
        const localPlaylists = await getAllPlaylists();
        const localStats = await getListeningStats();
        const localTombstones = await getAllTombstones();
        const localSettings = await getAllSettings();

        const remoteTombstones = cloudData.tombstones || [];

        // 1. Merge tombstones (latest wins)
        const mergedTombstones = mergeTombstones(localTombstones, remoteTombstones);

        // 2. Merge items with tombstone filtering
        const mergedAlbums = mergeData(localAlbums, cloudData.albums || [], mergedTombstones);
        const mergedSongs = mergeData(localSongs, cloudData.songs || [], mergedTombstones);
        const mergedPlaylists = mergeData(localPlaylists, cloudData.playlists || [], mergedTombstones);
        const mergedStats = mergeStats(localStats, cloudData.stats || null);

        onProgress?.('Updating local library...');
        // Handle deletions locally based on merged tombstones
        // We use silent deletions (don't create new tombstones while syncing)
        for (const t of mergedTombstones) {
            if (t.type === 'album') await deleteAlbum(t.id, true);
            if (t.type === 'song') await deleteSong(t.id, true);
            if (t.type === 'playlist') await deletePlaylist(t.id, true);
        }

        // Save merged active items
        for (const album of mergedAlbums) await saveAlbum(album, true);
        for (const song of mergedSongs) await saveSong(song, true);
        for (const playlist of mergedPlaylists) await savePlaylist(playlist, true);

        if (mergedStats) {
            await saveSetting('listening_stats', mergedStats);
        }

        // Trigger a single update after all batch operations are done
        const { triggerStorageUpdate } = await import('./storage');
        triggerStorageUpdate();

        const syncPayload = {
            albums: mergedAlbums,
            songs: mergedSongs,
            playlists: mergedPlaylists,
            settings: localSettings,
            stats: mergedStats || localStats,
            tombstones: mergedTombstones,
            lastSynced: Date.now()
        };

        onProgress?.('Uploading to VibeSync...');
        const result = await vibeSyncService.uploadSync(syncPayload);

        if (result.message !== 'Sync successful') {
            throw new Error(result.message || 'Failed to upload sync');
        }

        await saveSetting('lastSyncDate', syncPayload.lastSynced);

        // Notify UI
        window.dispatchEvent(new CustomEvent('vibesync-completed', {
            detail: {
                albums: mergedAlbums.length,
                songs: mergedSongs.length,
                playlists: mergedPlaylists.length,
                timestamp: syncPayload.lastSynced
            }
        }));

        return {
            success: true,
            albumsCount: mergedAlbums.length,
            songsCount: mergedSongs.length,
            playlistsCount: mergedPlaylists.length,
            timestamp: syncPayload.lastSynced
        };
    } catch (error) {
        console.error('VibeSync error:', error);
        window.dispatchEvent(new CustomEvent('vibesync-error', { detail: error.message }));
        throw error;
    }
};

/**
 * Merge local and cloud data with tombstone resolution
 */
const mergeData = (local, cloud, tombstones) => {
    const merged = new Map();
    const tombstoneMap = new Map(tombstones.map(t => [t.id, t]));

    // Pool all items
    [...cloud, ...local].forEach(item => {
        if (!item?.id) return;
        const existing = merged.get(item.id);
        if (!existing || (item.updatedAt || 0) > (existing.updatedAt || 0)) {
            merged.set(item.id, item);
        }
    });

    // Filtering by tombstones
    merged.forEach((item, id) => {
        const tombstone = tombstoneMap.get(id);
        if (tombstone) {
            // If tombstone is newer than item, delete item
            if (tombstone.updatedAt > (item.updatedAt || 0)) {
                merged.delete(id);
            }
            // If item is newer than tombstone, item wins (re-added/modified)
        }
    });

    return Array.from(merged.values());
};

const mergeTombstones = (local, remote) => {
    const merged = new Map();
    [...remote, ...local].forEach(t => {
        const existing = merged.get(t.id);
        if (!existing || t.updatedAt > existing.updatedAt) {
            merged.set(t.id, t);
        }
    });
    // Keep tombstones for at least 30 days or until cleared to ensure propagation
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return Array.from(merged.values()).filter(t => t.updatedAt > thirtyDaysAgo);
};

/**
 * Merge local and cloud listening stats
 */
const mergeStats = (local, cloud) => {
    if (!cloud) return local;
    if (!local) return cloud;

    const merged = { ...local };

    // 1. Merge daily plays (take max count for each date)
    const allDates = new Set([
        ...Object.keys(local.dailyPlays || {}),
        ...Object.keys(cloud.dailyPlays || {})
    ]);

    merged.dailyPlays = {};
    allDates.forEach(date => {
        merged.dailyPlays[date] = Math.max(
            (local.dailyPlays && local.dailyPlays[date]) || 0,
            (cloud.dailyPlays && cloud.dailyPlays[date]) || 0
        );
    });

    // 2. Merge song plays (take max count and sync metadata)
    const allSongIds = new Set([
        ...Object.keys(local.songPlays || {}),
        ...Object.keys(cloud.songPlays || {})
    ]);

    merged.songPlays = {};
    allSongIds.forEach(id => {
        const localSong = (local.songPlays && local.songPlays[id]) || { count: 0 };
        const cloudSong = (cloud.songPlays && cloud.songPlays[id]) || { count: 0 };

        merged.songPlays[id] = {
            ...(localSong.count >= cloudSong.count ? localSong : cloudSong),
            count: Math.max(localSong.count, cloudSong.count)
        };
    });

    // 3. Last Played (most recent)
    const localLast = local.lastPlayed?.timestamp || 0;
    const cloudLast = cloud.lastPlayed?.timestamp || 0;
    merged.lastPlayed = localLast >= cloudLast ? local.lastPlayed : cloud.lastPlayed;

    // 4. Totals (recalculate or max)
    merged.totalPlays = Math.max(local.totalPlays || 0, cloud.totalPlays || 0);

    return merged;
};

// ===========================
// BACKGROUND SYNC ENGINE
// ===========================

let syncDebounceTimer = null;
let periodicSyncTimer = null;

export const startBackgroundSync = (isPro) => {
    if (!isPro) {
        stopBackgroundSync();
        return;
    }

    // 1. Initial sync on boot
    requestSync(2000);

    // 2. Setup periodic sync (every 10 minutes)
    if (periodicSyncTimer) clearInterval(periodicSyncTimer);
    periodicSyncTimer = setInterval(() => {
        requestSync();
    }, 10 * 60 * 1000);
};

export const stopBackgroundSync = () => {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    if (periodicSyncTimer) clearInterval(periodicSyncTimer);
};

export const requestSync = (delay = 5000) => {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

    window.dispatchEvent(new CustomEvent('vibesync-started'));

    syncDebounceTimer = setTimeout(async () => {
        try {
            await performSync();
        } catch (err) {
            console.warn('Background sync background error:', err);
        }
    }, delay);
};

/**
 * Calculate the approximate size of the sync data in bytes
 */
export const getPayloadSize = async () => {
    try {
        const [albums, songs, playlists, tombstones, settings] = await Promise.all([
            getAllAlbums(),
            getAllSongs(),
            getAllPlaylists(),
            getAllTombstones(),
            getAllSettings()
        ]);
        const data = JSON.stringify({ albums, songs, playlists, tombstones, settings });
        return data.length;
    } catch (error) {
        console.error('Error getting payload size:', error);
        return 0;
    }
};
