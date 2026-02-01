// Data backup and restore utilities

import { getAllAlbums, getAllSongs, getAllPlaylists, saveAlbum, saveSong, savePlaylist, getSetting, saveSetting } from './storage';

export const exportLibraryData = async () => {
    const [albums, songs, playlists, stats] = await Promise.all([
        getAllAlbums(),
        getAllSongs(),
        getAllPlaylists(),
        getSetting('listening_stats')
    ]);

    const exportData = {
        version: '1.1',
        exportDate: new Date().toISOString(),
        albums,
        songs,
        playlists,
        stats: stats || null,
        metadata: {
            totalAlbums: albums.length,
            totalSongs: songs.length,
            totalPlaylists: playlists.length
        }
    };

    return exportData;
};

export const getPayloadSize = async () => {
    const albums = await getAllAlbums();
    const songs = await getAllSongs();
    const playlists = await getAllPlaylists();
    const data = { albums, songs, playlists, lastSynced: Date.now() };
    return (JSON.stringify(data).length / 1024).toFixed(2);
};

export const downloadBackup = async () => {
    const data = await exportLibraryData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `vibe-music-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const validateBackupData = (data) => {
    const errors = [];

    // Check version
    if (!data.version) {
        errors.push('Missing version field');
    }

    // Check required fields
    if (!Array.isArray(data.albums)) {
        errors.push('Invalid or missing albums array');
    }

    if (!Array.isArray(data.songs)) {
        errors.push('Invalid or missing songs array');
    }

    // Validate album schema
    if (data.albums) {
        data.albums.forEach((album, index) => {
            if (!album.id || !album.title || !album.artist) {
                errors.push(`Album at index ${index} missing required fields`);
            }
        });
    }

    // Validate song schema
    if (data.songs) {
        data.songs.forEach((song, index) => {
            if (!song.id || !song.title || !song.albumId) {
                errors.push(`Song at index ${index} missing required fields`);
            }
        });
    }

    // Validate playlist schema
    if (data.playlists) {
        data.playlists.forEach((playlist, index) => {
            if (!playlist.id || !playlist.name || !Array.isArray(playlist.songIds)) {
                errors.push(`Playlist at index ${index} missing required fields`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

// Helper to merge data, prioritizing new data but keeping existing if not present in new
const mergeData = (localData, cloudData) => {
    const merged = new Map();
    localData.forEach(item => merged.set(item.id, item));
    cloudData.forEach(item => merged.set(item.id, item)); // Cloud data overwrites local if IDs match
    return Array.from(merged.values());
};

export const syncWithCloud = async (apiKey, binId, onProgress) => {
    onProgress?.('Pulling latest from cloud...');
    const cloudData = await pullFromCloud(apiKey, binId);

    onProgress?.('Merging data...');
    const localAlbums = await getAllAlbums();
    const localSongs = await getAllSongs();
    const localPlaylists = await getAllPlaylists();

    const mergedAlbums = mergeData(localAlbums, cloudData.albums || []);
    const mergedSongs = mergeData(localSongs, cloudData.songs || []);
    const mergedPlaylists = mergeData(localPlaylists, cloudData.playlists || []);

    onProgress?.('Saving to local storage...');
    for (const album of mergedAlbums) {
        await saveAlbum(album);
    }
    for (const song of mergedSongs) {
        await saveSong(song);
    }
    for (const playlist of mergedPlaylists) {
        await savePlaylist(playlist);
    }

    const syncMetadata = {
        albums: mergedAlbums,
        songs: mergedSongs,
        playlists: mergedPlaylists,
        lastSynced: Date.now()
    };

    onProgress?.('Pushing to cloud...');
    await pushToCloud(apiKey, binId, syncMetadata);

    await saveSetting('lastSyncDate', syncMetadata.lastSynced);

    return {
        success: true,
        albumsCount: mergedAlbums.length,
        songsCount: mergedSongs.length,
        playlistsCount: mergedPlaylists.length,
        timestamp: syncMetadata.lastSynced
    };
};

export const importLibraryData = async (data) => {
    const validation = validateBackupData(data);

    if (!validation.valid) {
        throw new Error(`Invalid backup data: ${validation.errors.join(', ')}`);
    }

    // Import albums
    for (const album of data.albums) {
        await saveAlbum(album);
    }

    // Import songs
    for (const song of data.songs) {
        await saveSong(song);
    }

    // Import playlists (if available)
    if (Array.isArray(data.playlists)) {
        for (const playlist of data.playlists) {
            await savePlaylist(playlist);
        }
    }

    // Import stats if available
    if (data.stats) {
        await saveSetting('listening_stats', data.stats);
    }

    return {
        albumsImported: data.albums.length,
        songsImported: data.songs.length,
        playlistsImported: (data.playlists || []).length
    };
};

export const importFromFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const result = await importLibraryData(data);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};
