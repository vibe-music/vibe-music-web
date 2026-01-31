import React, { useState } from 'react';
import { saveAlbum } from '../../utils/storage';
import './CustomAlbumModal.css';

const CustomAlbumModal = ({ onClose, onAlbumAdded }) => {
    const [albumData, setAlbumData] = useState({
        title: '',
        artist: '',
        year: new Date().getFullYear().toString(),
        description: '',
        coverArt: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleAlbumChange = (e) => {
        const { name, value } = e.target;
        setAlbumData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!albumData.title.trim() || !albumData.artist.trim()) {
            setError('Album Title and Artist are required');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const albumId = `custom_${Date.now()}`;
            const savedAlbum = await saveAlbum({
                ...albumData,
                id: albumId,
                type: 'custom',
                createdAt: Date.now()
            });

            if (onAlbumAdded) {
                onAlbumAdded(savedAlbum);
            }
            onClose();
        } catch (err) {
            console.error('Error creating custom album:', err);
            setError('Failed to create album. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create Custom Album</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="custom-album-form">
                    <div className="modal-body">
                        <section className="form-section">
                            <div className="form-group">
                                <label>Album Title *</label>
                                <input
                                    name="title"
                                    value={albumData.title}
                                    onChange={handleAlbumChange}
                                    placeholder="Pulse of the Universe"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Artist *</label>
                                <input
                                    name="artist"
                                    value={albumData.artist}
                                    onChange={handleAlbumChange}
                                    placeholder="Cosmic Echo"
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>Year</label>
                                    <input
                                        name="year"
                                        value={albumData.year}
                                        onChange={handleAlbumChange}
                                        placeholder="2024"
                                    />
                                </div>
                                <div className="form-group flex-2">
                                    <label>Cover Art URL (Optional)</label>
                                    <input
                                        name="coverArt"
                                        value={albumData.coverArt}
                                        onChange={handleAlbumChange}
                                        placeholder="https://example.com/cover.jpg"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <textarea
                                    name="description"
                                    value={albumData.description}
                                    onChange={handleAlbumChange}
                                    placeholder="Tell us about this vibe..."
                                    rows="3"
                                />
                            </div>
                        </section>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Creating...' : 'Create Album'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomAlbumModal;
