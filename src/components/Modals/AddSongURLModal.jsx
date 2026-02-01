import React, { useState } from 'react';
import { updateSong } from '../../utils/storage';
import { useOnboarding } from '../../context/OnboardingContext';
import onboardingData from '../../data/onboardingData.json';
import './AddSongURLModal.css';

const AddSongURLModal = ({ song, onClose, onSaved }) => {
    const { run, stepIndex, nextStep } = useOnboarding();
    const [url, setUrl] = useState(song.url || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // Simulation logic moved to OnboardingTour.jsx

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!url.trim()) {
            setError('Please enter a valid URL');
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch (err) {
            setError('Invalid URL format');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await updateSong(song.id, {
                url: url.trim(),
                hasUrl: true
            });

            if (onSaved) {
                onSaved();
            }

            onClose();
        } catch (err) {
            setError('Failed to save URL. Please try again.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{song.url ? 'Edit Song URL' : 'Add Song URL'}</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div className="modal-body">
                        <div className="song-info">
                            <h3>{song.title}</h3>
                            <p>{song.artist}</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="url">Direct MP3/Audio URL</label>
                            <input
                                id="onboarding-url-input"
                                type="url"
                                placeholder="https://example.com/song.mp3"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                autoFocus
                            />
                            <p className="help-text">
                                Enter a direct link to the audio file. The URL should point directly to an MP3, M4A, or other audio format.
                            </p>
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
                        <button
                            type="submit"
                            className="btn btn-primary"
                            id="onboarding-save-url"
                            disabled={isSaving}
                            onClick={() => {
                                if (run && stepIndex === 4) nextStep();
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSongURLModal;
