import React, { useState } from 'react';
import { saveSong } from '../../utils/storage';
import './CustomAlbumModal.css'; // Reusing some styles

const AddTrackModal = ({ album, lastPosition, onClose, onSaved }) => {
    const [trackData, setTrackData] = useState({
        title: '',
        url: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTrackData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!trackData.title.trim()) {
            setError('Track title is required');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const songId = `song_${album.id}_${Date.now()}`;
            await saveSong({
                id: songId,
                albumId: album.id,
                title: trackData.title,
                artist: album.artist,
                album: album.title,
                position: lastPosition + 1,
                url: trackData.url.trim() || null,
                hasUrl: !!trackData.url.trim(),
                coverArt: album.coverArt || album.coverArtThumbnail || null,
                createdAt: Date.now()
            });

            if (onSaved) {
                onSaved();
            }
            onClose();
        } catch (err) {
            console.error('Error adding track:', err);
            setError('Failed to add track. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Track</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Track Title *</label>
                            <input
                                name="title"
                                value={trackData.title}
                                onChange={handleChange}
                                placeholder="E.g. Cosmic Voyage"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Source URL (Optional)</label>
                            <input
                                name="url"
                                type="url"
                                value={trackData.url}
                                onChange={handleChange}
                                placeholder="https://example.com/audio.mp3"
                            />
                            <p className="help-text">You can add or change the URL later if you don't have it yet.</p>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Adding...' : 'Add Track'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTrackModal;
