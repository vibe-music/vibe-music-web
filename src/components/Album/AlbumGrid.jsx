import React from 'react';
import AlbumCard from './AlbumCard';
import './AlbumGrid.css';

const AlbumGrid = ({ albums, onboardingId }) => {
    if (albums.length === 0) {
        return (
            <div className="album-grid-empty">
                <div className="album-grid-empty__icon">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                </div>
                <h2>No Albums Yet</h2>
                <p>Start by adding your first album</p>
            </div>
        );
    }

    return (
        <div className="album-grid">
            {albums.map((album, index) => (
                <AlbumCard
                    key={album.id}
                    album={album}
                    id={index === 0 ? onboardingId : undefined}
                />
            ))}
        </div>
    );
};

export default AlbumGrid;
