import localforage from 'localforage';

// Configure localforage for IndexedDB
const albumStore = localforage.createInstance({
    name: 'VibeMusic',
    storeName: 'albums',
    description: 'Album data storage'
});

const songStore = localforage.createInstance({
    name: 'VibeMusic',
    storeName: 'songs',
    description: 'Song data storage'
});

const settingsStore = localforage.createInstance({
    name: 'VibeMusic',
    storeName: 'settings',
    description: 'App settings and state'
});

const playlistStore = localforage.createInstance({
    name: 'VibeMusic',
    storeName: 'playlists',
    description: 'User and system playlists'
});

const tombstoneStore = localforage.createInstance({
    name: 'VibeMusic',
    storeName: 'tombstones',
    description: 'Tracked deletions for sync'
});

// ===========================
// ALBUMS
// ===========================

export const saveAlbum = async (album, skipUpdate = false) => {
    try {
        const albumId = album.id || `album_${Date.now()}`;
        const albumData = {
            ...album,
            id: albumId,
            createdAt: album.createdAt || Date.now(),
            updatedAt: album.updatedAt || Date.now()
        };
        await albumStore.setItem(albumId, albumData);

        if (!skipUpdate) triggerStorageUpdate();
        return albumData;
    } catch (error) {
        console.error('Error saving album:', error);
        throw error;
    }
};

export const getAlbum = async (albumId) => {
    try {
        return await albumStore.getItem(albumId);
    } catch (error) {
        console.error('Error getting album:', error);
        return null;
    }
};

export const getAllAlbums = async () => {
    try {
        const albums = [];
        await albumStore.iterate((value) => {
            albums.push(value);
        });
        // Sort by most recently added
        return albums.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error('Error getting all albums:', error);
        return [];
    }
};

export const updateAlbum = async (albumId, updates, skipUpdate = false) => {
    try {
        const album = await getAlbum(albumId);
        if (!album) throw new Error('Album not found');

        const updatedAlbum = {
            ...album,
            ...updates,
            updatedAt: updates.updatedAt || Date.now()
        };
        await albumStore.setItem(albumId, updatedAlbum);
        if (!skipUpdate) triggerStorageUpdate();
        return updatedAlbum;
    } catch (error) {
        console.error('Error updating album:', error);
        throw error;
    }
};

export const deleteAlbum = async (albumId, isSyncing = false) => {
    try {
        if (!isSyncing) await saveTombstone(albumId, 'album');
        await albumStore.removeItem(albumId);
        if (!isSyncing) triggerStorageUpdate();
        // Also delete all songs from this album
        const songs = await getAllSongs();
        const albumSongs = songs.filter(song => song.albumId === albumId);
        await Promise.all(albumSongs.map(song => deleteSong(song.id, isSyncing)));
    } catch (error) {
        console.error('Error deleting album:', error);
        throw error;
    }
};

// ===========================
// SONGS
// ===========================

export const saveSong = async (song, skipUpdate = false) => {
    try {
        const songId = song.id || `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const songData = {
            ...song,
            id: songId,
            createdAt: song.createdAt || Date.now(),
            updatedAt: song.updatedAt || Date.now()
        };
        await songStore.setItem(songId, songData);
        if (!skipUpdate) triggerStorageUpdate();
        return songData;
    } catch (error) {
        console.error('Error saving song:', error);
        throw error;
    }
};

export const getSong = async (songId) => {
    try {
        return await songStore.getItem(songId);
    } catch (error) {
        console.error('Error getting song:', error);
        return null;
    }
};

export const getAllSongs = async () => {
    try {
        const songs = [];
        await songStore.iterate((value) => {
            songs.push(value);
        });
        return songs;
    } catch (error) {
        console.error('Error getting all songs:', error);
        return [];
    }
};

export const getSongsByAlbum = async (albumId) => {
    try {
        const allSongs = await getAllSongs();
        return allSongs.filter(song => song.albumId === albumId);
    } catch (error) {
        console.error('Error getting songs by album:', error);
        return [];
    }
};

export const updateSong = async (songId, updates) => {
    try {
        const song = await getSong(songId);
        if (!song) throw new Error('Song not found');

        const updatedSong = {
            ...song,
            ...updates,
            updatedAt: updates.updatedAt || Date.now()
        };
        await songStore.setItem(songId, updatedSong);
        return updatedSong;
    } catch (error) {
        console.error('Error updating song:', error);
        throw error;
    }
};

export const deleteSong = async (songId, isSyncing = false) => {
    try {
        if (!isSyncing) await saveTombstone(songId, 'song');
        await songStore.removeItem(songId);
        // Also remove from all playlists
        const playlists = await getAllPlaylists();
        for (const playlist of playlists) {
            if (playlist.songIds.includes(songId)) {
                const updatedSongIds = playlist.songIds.filter(id => id !== songId);
                await updatePlaylist(playlist.id, { songIds: updatedSongIds });
            }
        }
    } catch (error) {
        console.error('Error deleting song:', error);
        throw error;
    }
};

export const removeSongFromAlbum = async (albumId, songId) => {
    try {
        await saveTombstone(songId, 'song');
        await songStore.removeItem(songId);
    } catch (error) {
        console.error('Error removing song from album:', error);
        throw error;
    }
};

// ===========================
// PLAYLISTS
// ===========================

export const savePlaylist = async (playlist, skipUpdate = false) => {
    try {
        const playlistId = playlist.id || `playlist_${Date.now()}`;
        const playlistData = {
            ...playlist,
            id: playlistId,
            createdAt: playlist.createdAt || Date.now(),
            updatedAt: playlist.updatedAt || Date.now(),
            songIds: playlist.songIds || []
        };
        await playlistStore.setItem(playlistId, playlistData);
        if (!skipUpdate) triggerStorageUpdate();
        return playlistData;
    } catch (error) {
        console.error('Error saving playlist:', error);
        throw error;
    }
};

export const getPlaylist = async (playlistId) => {
    try {
        if (playlistId === 'liked-music') {
            const liked = await playlistStore.getItem('liked-music');
            if (!liked) {
                return await savePlaylist({
                    id: 'liked-music',
                    name: 'Liked Music',
                    description: 'Your favorite tracks',
                    type: 'system',
                    songIds: []
                });
            }
            return liked;
        }
        return await playlistStore.getItem(playlistId);
    } catch (error) {
        console.error('Error getting playlist:', error);
        return null;
    }
};

export const getAllPlaylists = async () => {
    try {
        const playlists = [];
        await playlistStore.iterate((value) => {
            playlists.push(value);
        });

        // Ensure "Liked Music" exists
        const hasLiked = playlists.some(p => p.id === 'liked-music');
        if (!hasLiked) {
            const liked = await getPlaylist('liked-music');
            playlists.push(liked);
        }

        // Sort: System first, then by updatedAt
        return playlists.sort((a, b) => {
            if (a.type === 'system' && b.type !== 'system') return -1;
            if (a.type !== 'system' && b.type === 'system') return 1;
            return b.updatedAt - a.updatedAt;
        });
    } catch (error) {
        console.error('Error getting all playlists:', error);
        return [];
    }
};

export const updatePlaylist = async (playlistId, updates) => {
    try {
        const playlist = await getPlaylist(playlistId);
        if (!playlist) throw new Error('Playlist not found');

        const updatedPlaylist = {
            ...playlist,
            ...updates,
            updatedAt: updates.updatedAt || Date.now()
        };
        await playlistStore.setItem(playlistId, updatedPlaylist);
        return updatedPlaylist;
    } catch (error) {
        console.error('Error updating playlist:', error);
        throw error;
    }
};

export const deletePlaylist = async (playlistId, isSyncing = false) => {
    try {
        const playlist = await getPlaylist(playlistId);
        if (playlist?.type === 'system') {
            throw new Error('Cannot delete system playlists');
        }
        if (!isSyncing) await saveTombstone(playlistId, 'playlist');
        await playlistStore.removeItem(playlistId);
        if (!isSyncing) triggerStorageUpdate();
    } catch (error) {
        console.error('Error deleting playlist:', error);
        throw error;
    }
};

export const toggleLike = async (songId) => {
    try {
        const likedPlaylist = await getPlaylist('liked-music');
        const isLiked = likedPlaylist.songIds.includes(songId);

        let newSongIds;
        if (isLiked) {
            newSongIds = likedPlaylist.songIds.filter(id => id !== songId);
        } else {
            newSongIds = [...likedPlaylist.songIds, songId];
        }

        return await updatePlaylist('liked-music', { songIds: newSongIds });
    } catch (error) {
        console.error('Error toggling like:', error);
        throw error;
    }
};

// ===========================
// SETTINGS & STATE
// ===========================

export const savePlayerState = async (state) => {
    try {
        await settingsStore.setItem('playerState', state);
    } catch (error) {
        console.error('Error saving player state:', error);
    }
};

export const getPlayerState = async () => {
    try {
        return await settingsStore.getItem('playerState');
    } catch (error) {
        console.error('Error getting player state:', error);
        return null;
    }
};

export const saveSetting = async (key, value) => {
    try {
        await settingsStore.setItem(key, value);
    } catch (error) {
        console.error('Error saving setting:', error);
    }
};

export const getSetting = async (key, defaultValue = null) => {
    try {
        const value = await settingsStore.getItem(key);
        return value !== null ? value : defaultValue;
    } catch (error) {
        console.error('Error getting setting:', error);
        return defaultValue;
    }
};

export const deleteSetting = async (key) => {
    try {
        await settingsStore.removeItem(key);
    } catch (error) {
        console.error('Error deleting setting:', error);
        throw error;
    }
};

export const getAllSettings = async () => {
    try {
        const settings = {};
        await settingsStore.iterate((value, key) => {
            settings[key] = value;
        });
        return settings;
    } catch (error) {
        console.error('Error getting all settings:', error);
        return {};
    }
};

export const clearAllData = async () => {
    try {
        await albumStore.clear();
        await songStore.clear();
        await settingsStore.clear();
        await playlistStore.clear();
        await tombstoneStore.clear();
    } catch (error) {
        console.error('Error clearing data:', error);
        throw error;
    }
};

// ===========================
// TOMBSTONES (for Sync)
// ===========================

export const saveTombstone = async (id, type) => {
    try {
        await tombstoneStore.setItem(id, { id, type, updatedAt: Date.now() });
    } catch (error) {
        console.error('Error saving tombstone:', error);
    }
};

export const getAllTombstones = async () => {
    try {
        const tombstones = [];
        await tombstoneStore.iterate((value) => {
            tombstones.push(value);
        });
        return tombstones;
    } catch (error) {
        console.error('Error getting all tombstones:', error);
        return [];
    }
};

export const clearTombstones = async () => {
    try {
        await tombstoneStore.clear();
    } catch (error) {
        console.error('Error clearing tombstones:', error);
    }
};

export const triggerStorageUpdate = () => {
    window.dispatchEvent(new CustomEvent('vibe-storage-update'));
};
