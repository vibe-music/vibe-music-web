import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlaylist, getSong, deleteSong } from '../utils/storage';
import { usePlayer } from '../context/AudioPlayerContext';
import SongListItem from '../components/Song/SongListItem';
import { showToast } from '../utils/toast';
import './PlaylistDetail.css';

const PlaylistDetail = () => {
    const { playlistId } = useParams();
    const navigate = useNavigate();
    const { playSongs } = usePlayer();

    const [playlist, setPlaylist] = useState(null);
    const [songs, setSongs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPlaylistData = async () => {
            setIsLoading(true);
            try {
                const data = await getPlaylist(playlistId);
                if (!data) {
                    navigate('/library');
                    return;
                }
                setPlaylist(data);

                // Load songs by IDs
                const songPromises = (data.songIds || []).map(id => getSong(id));
                const loadedSongs = await Promise.all(songPromises);
                setSongs(loadedSongs.filter(Boolean));
            } catch (error) {
                console.error('Error loading playlist detail:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPlaylistData();

        // Listen for updates (e.g. liking/unliking)
        const handleUpdate = () => loadPlaylistData();
        window.addEventListener('liked-music-updated', handleUpdate);
        return () => window.removeEventListener('liked-music-updated', handleUpdate);
    }, [playlistId, navigate]);

    const handleShufflePlay = () => {
        if (songs.length === 0) return;
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        playSongs(shuffled, 0);
    };

    const handlePlayAll = () => {
        if (songs.length === 0) return;
        playSongs(songs, 0);
    };

    const loadPlaylistData = async () => {
        setIsLoading(true);
        try {
            const data = await getPlaylist(playlistId);
            if (!data) {
                navigate('/library');
                return;
            }
            setPlaylist(data);

            const songPromises = (data.songIds || []).map(id => getSong(id));
            const loadedSongs = await Promise.all(songPromises);
            setSongs(loadedSongs.filter(Boolean));
        } catch (error) {
            console.error('Error loading playlist detail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSong = async (song) => {
        if (window.confirm(`Are you sure you want to delete "${song.title}" from your library? This will remove it from all albums and playlists.`)) {
            try {
                await deleteSong(song.id);
                loadPlaylistData(); // Refresh current view
                showToast.success(`Deleted "${song.title}"`);
            } catch (err) {
                console.error('Error deleting song:', err);
                showToast.error('Failed to delete song');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="playlist-detail-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="playlist-detail safe-bottom">
            <header className="playlist-detail__header safe-top">
                <button className="btn-icon" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="playlist-detail__header-title">Playlist</div>
            </header>

            <div className="playlist-detail__hero">
                <div className="playlist-detail__artwork-container">
                    {playlist.coverArt ? (
                        <img src={playlist.coverArt} alt={playlist.name} className="playlist-detail__artwork" />
                    ) : (
                        <div className="playlist-detail__artwork-placeholder gradient-primary">
                            {playlist.id === 'liked-music' ? (
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                            ) : (
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                    )}
                </div>
                <div className="playlist-detail__info">
                    <h1 className="playlist-detail__name">{playlist.name}</h1>
                    <p className="playlist-detail__description">{playlist.description || 'No description'}</p>
                    <p className="playlist-detail__meta">
                        {songs.length} {songs.length === 1 ? 'song' : 'songs'}
                    </p>
                </div>
            </div>

            <div className="playlist-detail__actions">
                <button className="btn btn-primary" onClick={handlePlayAll} disabled={songs.length === 0}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    Play
                </button>
                <button className="btn btn-secondary" onClick={handleShufflePlay} disabled={songs.length === 0}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeWidth="2" />
                        <polyline points="7.5 4.21 12 6.81 16.5 4.21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="7.5 19.79 7.5 14.6 3 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="21 12 16.5 14.6 16.5 19.79" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="12" y1="22.08" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Shuffle
                </button>
            </div>

            <div className="playlist-detail__songs">
                {songs.map((song, index) => (
                    <SongListItem
                        key={`${song.id}-${index}`}
                        song={song}
                        index={index}
                        playlistSongs={songs}
                        onDelete={handleDeleteSong}
                    />
                ))}
                {songs.length === 0 && (
                    <div className="playlist-detail__empty">
                        <p>No songs in this playlist yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistDetail;
