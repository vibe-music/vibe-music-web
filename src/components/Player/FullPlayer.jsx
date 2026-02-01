import React, { useState, useRef, useEffect } from 'react';
import { usePlayer } from '../../context/AudioPlayerContext';
import { useNavigate } from 'react-router-dom';
import HeartButton from './HeartButton';
import AddToPlaylistModal from '../Modals/AddToPlaylistModal';
import VibeModeOverlay from './VibeModeOverlay';
import MarqueeText from '../Common/MarqueeText';
import { useVibeMode } from '../../hooks/useVibeMode';
import './FullPlayer.css';

const FullPlayer = () => {
    const {
        currentSong,
        isPlaying,
        currentTime,
        duration,
        togglePlayPause,
        seekTo,
        skipToNext,
        skipToPrevious,
        formatTime,
        queue,
        currentIndex,
        isLoading,
        isShuffle,
        setIsShuffle,
        repeatMode,
        setRepeatMode,
        isRadioMode
    } = usePlayer();

    const navigate = useNavigate();
    const [isDragging, setIsDragging] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [seekPosition, setSeekPosition] = useState(null);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const {
        isActive: isVibeMode,
        characterIndex,
        usageError,
        remainingSessions,
        showProDiscovery,
        enterVibeMode,
        exitVibeMode,
        nextCharacter,
        dismissProDiscovery
    } = useVibeMode();
    const touchStartY = useRef(0);
    const seekBarRef = useRef(null);

    // Mobile Immersion Logic
    useEffect(() => {
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        const defaultTheme = '#0f172a'; // Match current app background

        if (isVibeMode) {
            if (themeMeta) themeMeta.setAttribute('content', '#000000');

            // Attempt Fullscreen
            try {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => { });
                }
            } catch (e) { }
        } else {
            if (themeMeta) themeMeta.setAttribute('content', defaultTheme);

            // Exit Fullscreen
            try {
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen().catch(() => { });
                }
            } catch (e) { }
        }

        return () => {
            if (themeMeta) themeMeta.setAttribute('content', defaultTheme);
        };
    }, [isVibeMode]);

    const handleBack = () => {
        navigate(-1);
    };

    // Touch handlers for swipe down to close
    const handleTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
        setDragY(0);
    };

    const handleTouchMove = (e) => {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;

        if (diff > 0) {
            setDragY(diff);
            setIsDragging(true);
        }
    };

    const handleTouchEnd = () => {
        if (dragY > 100) {
            handleBack();
        }
        setDragY(0);
        setIsDragging(false);
    };

    // Enhanced seek bar handlers with hover preview
    const handleSeekBarClick = (e) => {
        const bar = seekBarRef.current;
        const rect = bar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        seekTo(pos * duration);
        setSeekPosition(null);
    };

    const handleSeekBarHover = (e) => {
        const bar = seekBarRef.current;
        const rect = bar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        setSeekPosition(pos);
    };

    const handleSeekBarLeave = () => {
        setSeekPosition(null);
    };

    if (!currentSong) {
        return (
            <div className="full-player">
                <div className="full-player__header">
                    <button className="btn-icon" onClick={handleBack}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
                <div className="full-player__empty">
                    <p>No song playing</p>
                </div>
            </div>
        );
    }

    const hasQueue = queue.length > 1;

    const cycleRepeatMode = () => {
        const modes = ['none', 'all', 'one'];
        const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
        setRepeatMode(modes[nextIndex]);
    };

    return (
        <div
            className="full-player animate-slide-up"
            style={{
                transform: isDragging ? `translateY(${dragY}px)` : 'none',
                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="full-player__header">
                <button className="btn-icon" onClick={handleBack}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="full-player__title-text">Now Playing</div>
                <button
                    className="btn-icon"
                    onClick={() => setShowPlaylistModal(true)}
                    aria-label="Add to Playlist"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="5" r="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="19" r="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="full-player__swipe-indicator"></div>
            </div>

            <div className="full-player__content">
                <div className="full-player__artwork-container">
                    <div className="artwork-wrapper">
                        {currentSong.coverArt ? (
                            <img
                                src={currentSong.coverArt}
                                alt={currentSong.title}
                                className="full-player__artwork"
                            />
                        ) : (
                            <div className="full-player__artwork-placeholder gradient-primary">
                                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        )}
                        {/* Vibe Mode Trigger - Restored to original position */}
                        <button className="vibe-mode-trigger" onClick={(e) => { e.stopPropagation(); enterVibeMode(); }}>
                            <div className="vibe-sparkles">✨</div>
                            <span>Vibe Mode</span>
                        </button>
                    </div>
                    {/* The usageError toast here is removed as it's now rendered at the bottom */}
                </div>

                <div className="full-player__info">
                    <div className="full-player__metadata-group">
                        {isRadioMode && (
                            <MarqueeText
                                text={`Station: ${currentSong.stationName || 'Vibe Mix'}`}
                                className="full-player__station-name animate-slide-up"
                            />
                        )}
                        <div className="full-player__title-row">
                            <MarqueeText text={currentSong.title} className="full-player__title" />
                            <HeartButton songId={currentSong.id} size={24} />
                        </div>
                        <div className="full-player__artist-row">
                            <div className="full-player__artist">{currentSong.artist}</div>
                            {isRadioMode && (
                                <span className="radio-badge animate-pulse">VIBE RADIO</span>
                            )}
                        </div>
                        {!isRadioMode && (
                            <div className="full-player__album">{currentSong.album}</div>
                        )}
                    </div>

                </div>
            </div>

            <div className="full-player__controls">
                {/* Enhanced Seek Bar */}
                <div
                    className="full-player__seek-bar"
                    ref={seekBarRef}
                    onClick={handleSeekBarClick}
                    onMouseMove={handleSeekBarHover}
                    onMouseLeave={handleSeekBarLeave}
                >
                    <div className="full-player__seek-bar-bg">
                        <div
                            className="full-player__seek-bar-fill gradient-primary"
                            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                        ></div>
                        {seekPosition !== null && (
                            <div
                                className="full-player__seek-preview"
                                style={{ left: `${seekPosition * 100}%` }}
                            >
                                {formatTime(seekPosition * duration)}
                            </div>
                        )}
                        <div
                            className="full-player__seek-bar-thumb"
                            style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="full-player__time">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>

                {/* Main Controls */}
                <div className="full-player__main-controls">
                    <button
                        className={`control-btn control-btn--small ${isShuffle ? 'active' : ''} ${isRadioMode ? 'disabled' : ''}`}
                        onClick={() => !isRadioMode && setIsShuffle(!isShuffle)}
                        title={isRadioMode ? "Shuffle disabled in Radio Mode" : "Shuffle"}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    <button
                        className="control-btn control-btn--secondary"
                        onClick={skipToPrevious}
                        disabled={!queue.length}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
                        </svg>
                    </button>

                    <button
                        className="control-btn control-btn--primary"
                        onClick={togglePlayPause}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="control-spinner"></div>
                        ) : isPlaying ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    <button
                        className="control-btn control-btn--secondary"
                        onClick={skipToNext}
                        disabled={!queue.length}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                        </svg>
                    </button>

                    <button
                        className={`control-btn control-btn--small ${repeatMode !== 'none' ? 'active' : ''} ${isRadioMode ? 'disabled' : ''}`}
                        onClick={() => !isRadioMode && cycleRepeatMode()}
                        title={isRadioMode ? "Repeat disabled in Radio Mode" : `Repeat: ${repeatMode}`}
                    >
                        <div className="repeat-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {repeatMode === 'one' && <span className="repeat-one-indicator">1</span>}
                        </div>
                    </button>
                </div>
            </div>

            {showPlaylistModal && (
                <AddToPlaylistModal
                    song={currentSong}
                    onClose={() => setShowPlaylistModal(false)}
                />
            )}

            {/* Vibe Mode Overlay */}
            {isVibeMode && (
                <VibeModeOverlay
                    onClose={exitVibeMode}
                    characterIndex={characterIndex}
                    onNextCharacter={nextCharacter}
                />
            )}

            {/* Vibe Mode Discovery / Limit Toasts */}
            {showProDiscovery && (
                <div className="vibe-discovery-toast animate-slide-up">
                    <div className="vibe-discovery-content">
                        <div className="vibe-discovery-icon">✨</div>
                        <div className="vibe-discovery-text">
                            <h3>Pro Feature Discovered!</h3>
                            <p>Vibe Mode is a premium experience. Enjoy your free session!</p>
                        </div>
                        <div className="vibe-discovery-actions">
                            <button className="vibe-discovery-btn vibe-discovery-btn--pro" onClick={() => window.location.hash = '#/settings'}>
                                Upgrade
                            </button>
                            <button className="vibe-discovery-btn" title="Dismiss" onClick={(e) => { e.stopPropagation(); dismissProDiscovery(); }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {usageError && (
                <div className="vibe-error-toast animate-slide-up">
                    <span>{usageError}</span>
                </div>
            )}
        </div>
    );
};

export default FullPlayer;
