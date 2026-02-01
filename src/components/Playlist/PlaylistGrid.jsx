import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarqueeText from '../Common/MarqueeText';
import './PlaylistGrid.css';

const PlaylistGrid = ({ playlists }) => {
    const navigate = useNavigate();

    if (!playlists || playlists.length === 0) {
        return (
            <div className="playlist-grid-empty">
                <p>No playlists found.</p>
            </div>
        );
    }

    return (
        <div className="playlist-grid">
            {playlists.map(playlist => (
                <div
                    key={playlist.id}
                    className={`playlist-card ${playlist.type === 'system' ? 'playlist-card--system' : ''}`}
                    onClick={() => navigate(`/playlist/${playlist.id}`)}
                >
                    <div className="playlist-card__artwork-container">
                        {playlist.coverArt ? (
                            <img src={playlist.coverArt} alt={playlist.name} className="playlist-card__artwork" />
                        ) : (
                            <div className="playlist-card__artwork-placeholder gradient-primary">
                                {playlist.id === 'liked-music' ? (
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="21" y1="15" x2="21" y2="6" />
                                        <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                                        <line x1="12" y1="12" x2="3" y2="12" />
                                        <line x1="16" y1="6" x2="3" y2="6" />
                                        <line x1="12" y1="18" x2="3" y2="18" />
                                    </svg>
                                )}
                            </div>
                        )}
                        {playlist.type === 'system' && <div className="playlist-card__badge">System</div>}
                    </div>
                    <div className="playlist-card__info">
                        <MarqueeText text={playlist.name} className="playlist-card__name" />
                        <p className="playlist-card__count">{playlist.songs?.length || 0} songs</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PlaylistGrid;
