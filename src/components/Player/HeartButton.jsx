import React, { useState, useEffect } from 'react';
import { getPlaylist, toggleLike } from '../../utils/storage';
import './HeartButton.css';

const HeartButton = ({ songId, size = 24 }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const checkLikedStatus = async () => {
            if (!songId) return;
            const likedPlaylist = await getPlaylist('liked-music');
            setIsLiked(likedPlaylist?.songIds.includes(songId) || false);
        };
        checkLikedStatus();

        // Listen for external updates (e.g., from other components)
        const handleUpdate = () => checkLikedStatus();
        window.addEventListener('liked-music-updated', handleUpdate);
        return () => window.removeEventListener('liked-music-updated', handleUpdate);
    }, [songId]);

    const handleToggleLike = async (e) => {
        e.stopPropagation();
        if (!songId) return;

        setIsAnimating(true);
        try {
            const updatedPlaylist = await toggleLike(songId);
            setIsLiked(updatedPlaylist.songIds.includes(songId));

            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('liked-music-updated'));
        } catch (error) {
            console.error('Error toggling like:', error);
        } finally {
            setTimeout(() => setIsAnimating(false), 450);
        }
    };

    return (
        <button
            className={`heart-button ${isLiked ? 'heart-button--liked' : ''} ${isAnimating ? 'heart-button--animating' : ''}`}
            onClick={handleToggleLike}
            aria-label={isLiked ? "Remove from Liked Music" : "Add to Liked Music"}
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
};

export default HeartButton;
