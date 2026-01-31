import React, { useState, useEffect } from 'react';
import { getAllPlaylists, updatePlaylist, savePlaylist } from '../../utils/storage';
import './AddToPlaylistModal.css';

const AddToPlaylistModal = ({ song, onClose }) => {
    const [playlists, setPlaylists] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadPlaylists = async () => {
            const all = await getAllPlaylists();
            // Don't show "Liked Music" here as it has a dedicated Heart toggle
            setPlaylists(all.filter(p => p.id !== 'liked-music'));
            setIsLoading(false);
        };
        loadPlaylists();
    }, []);

    const handleAddToPlaylist = async (playlist) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const songIds = playlist.songIds || [];
            if (!songIds.includes(song.id)) {
                await updatePlaylist(playlist.id, {
                    songIds: [...songIds, song.id]
                });
            }
            onClose();
        } catch (error) {
            console.error('Error adding to playlist:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim() || isSaving) return;

        setIsSaving(true);
        try {
            const newPlaylist = await savePlaylist({
                name: newPlaylistName.trim(),
                type: 'manual',
                songIds: [song.id]
            });
            onClose();
        } catch (error) {
            console.error('Error creating playlist:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="playlist-modal" onClick={e => e.stopPropagation()}>
                <div className="playlist-modal__header">
                    <h3>Add to Playlist</h3>
                    <button className="btn-icon" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="playlist-modal__content">
                    {isLoading ? (
                        <div className="spinner-center"><div className="spinner"></div></div>
                    ) : (
                        <>
                            {!showCreate ? (
                                <button className="create-plist-btn" onClick={() => setShowCreate(true)}>
                                    <div className="create-plist-btn__icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <span>Create New Playlist</span>
                                </button>
                            ) : (
                                <form className="playlist-create-form" onSubmit={handleCreatePlaylist}>
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Playlist name..."
                                        value={newPlaylistName}
                                        onChange={e => setNewPlaylistName(e.target.value)}
                                        className="playlist-input"
                                    />
                                    <div className="playlist-form-actions">
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary btn-sm" disabled={!newPlaylistName.trim() || isSaving}>
                                            Create & Add
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="playlist-selection-list">
                                {playlists.map(p => (
                                    <button
                                        key={p.id}
                                        className="playlist-selection-item"
                                        onClick={() => handleAddToPlaylist(p)}
                                        disabled={isSaving}
                                    >
                                        <div className="playlist-selection-item__artwork">
                                            {p.coverArt ? <img src={p.coverArt} alt="" /> : <div className="placeholder gradient-primary" />}
                                        </div>
                                        <div className="playlist-selection-item__info">
                                            <div className="name">{p.name}</div>
                                            <div className="count">{p.songIds?.length || 0} songs</div>
                                        </div>
                                        {p.songIds?.includes(song.id) && (
                                            <div className="added-check">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                                {playlists.length === 0 && !showCreate && (
                                    <p className="no-playlists">You haven't created any playlists yet.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddToPlaylistModal;
