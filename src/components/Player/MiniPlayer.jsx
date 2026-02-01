import React from 'react';
import { usePlayer } from '../../context/AudioPlayerContext';
import { useNavigate } from 'react-router-dom';
import HeartButton from './HeartButton';
import MarqueeText from '../Common/MarqueeText';
import './MiniPlayer.css';

const MiniPlayer = () => {
    const { currentSong, isPlaying, togglePlayPause, progress } = usePlayer();
    const navigate = useNavigate();

    if (!currentSong) return null;

    const handleExpand = () => {
        navigate('/player');
    };

    return (
        <div className="mini-player glass" onClick={handleExpand}>
            <div className="mini-player__progress" style={{ width: `${progress}%` }}></div>

            <div className="mini-player__content">
                {currentSong.coverArt && (
                    <img
                        src={currentSong.coverArt}
                        alt={currentSong.title}
                        className="mini-player__artwork"
                    />
                )}

                <div className="mini-player__info">
                    <MarqueeText text={currentSong.title} className="mini-player__title" />
                    <MarqueeText text={currentSong.artist} className="mini-player__artist" />
                </div>

                <div className="mini-player__actions">
                    <HeartButton songId={currentSong.id} size={20} />
                    <button
                        className="mini-player__play-btn btn-icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePlayPause();
                        }}
                    >
                        {isPlaying ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MiniPlayer;
