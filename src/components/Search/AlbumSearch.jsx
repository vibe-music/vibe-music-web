import React, { useState } from 'react';
import { searchAlbumsWithCovers, getCompleteAlbum } from '../../utils/musicBrainzAPI';
import { saveAlbum, saveSong } from '../../utils/storage';
import { useOnboarding } from '../../context/OnboardingContext';
import onboardingData from '../../data/onboardingData.json';
import MarqueeText from '../Common/MarqueeText';
import './AlbumSearch.css';

const AlbumSearch = ({ onClose, onAlbumAdded }) => {
    const { stepIndex, nextStep, run } = useOnboarding();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Simulation logic moved to OnboardingTour.js

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            const albums = await searchAlbumsWithCovers(query, 10);
            setResults(albums);
            setHasSearched(true);
        } catch (err) {
            setError('Failed to search albums. Please try again.');
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddAlbum = async (album) => {
        setIsAdding(true);
        setError(null);

        try {
            // Get full album details with tracks
            const fullAlbum = await getCompleteAlbum(album.id);

            // Save album
            const savedAlbum = await saveAlbum({
                id: `album_${fullAlbum.id}`,
                title: fullAlbum.title,
                artist: fullAlbum.artist,
                year: fullAlbum.year,
                type: fullAlbum.type,
                coverArt: fullAlbum.coverArt,
                coverArtThumbnail: fullAlbum.coverArtThumbnail,
                mbid: fullAlbum.id,
                mbReleaseId: fullAlbum.mbReleaseId
            });

            // Save all tracks (without URLs yet)
            const songPromises = fullAlbum.tracks.map(track =>
                saveSong({
                    id: `song_${savedAlbum.id}_${track.position}`,
                    albumId: savedAlbum.id,
                    title: track.title,
                    artist: fullAlbum.artist,
                    album: fullAlbum.title,
                    position: track.position,
                    duration: track.duration,
                    coverArt: fullAlbum.coverArtThumbnail,
                    url: null, // No URL yet - user will add later
                    hasUrl: false
                })
            );

            await Promise.all(songPromises);

            // Track album addition
            await import('../../utils/analytics').then(({ logAlbumAdded }) => {
                logAlbumAdded();
            });

            if (onAlbumAdded) {
                onAlbumAdded(savedAlbum);
            }

            onClose();
        } catch (err) {
            setError('Failed to add album. Please try again.');
            console.error(err);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Search Album</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSearch} className="search-form">
                        <div className="search-input-group">
                            <input
                                type="text"
                                id="onboarding-search-input"
                                placeholder="Search by album or artist name..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="btn btn-primary" disabled={isSearching}>
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        <div className="search-form-footer">
                            <div className="search-divider">
                                <span>OR</span>
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary btn-full"
                                onClick={() => {
                                    onClose();
                                    document.dispatchEvent(new CustomEvent('open-custom-album'));
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ marginRight: '8px' }}>
                                    <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Create Manual Album
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="search-results">
                        {results.length > 0 ? (
                            results.map((album, index) => (
                                <div
                                    key={album.id}
                                    className="search-result-item"
                                    id={index === 0 ? "onboarding-result-0" : ""}
                                >
                                    <div className="search-result-cover">
                                        {album.coverArt ? (
                                            <img src={album.coverArt} alt={album.title} />
                                        ) : (
                                            <div className="search-result-placeholder gradient-primary"></div>
                                        )}
                                    </div>
                                    <div className="search-result-info">
                                        <MarqueeText text={album.title} className="search-result-title" />
                                        <MarqueeText text={album.artist} className="search-result-artist" />
                                        {album.year && <div className="search-result-year">{album.year}</div>}
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            handleAddAlbum(album);
                                        }}
                                        disabled={isAdding}
                                    >
                                        Add
                                    </button>
                                </div>
                            ))
                        ) : (
                            hasSearched && !isSearching && (
                                <div className="search-empty">
                                    <p>No results found. Try a different search.</p>
                                    <div className="search-empty__custom">
                                        <p className="search-empty__hint">Or create a custom album manually</p>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                                onClose();
                                                document.dispatchEvent(new CustomEvent('open-custom-album'));
                                            }}
                                        >
                                            Create Custom Album
                                        </button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <p className="data-disclaimer">Data is from open public APIs</p>
                </div>
            </div>
        </div>
    );
};

export default AlbumSearch;
