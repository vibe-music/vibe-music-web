import { useState, useEffect, useRef, useCallback } from 'react';
import { savePlayerState, getPlayerState } from '../utils/storage';

/**
 * Custom hook for audio playback with queue management
 */
export const useAudioPlayer = () => {
    const audioRef = useRef(new Audio());
    // Configure audio element for streaming
    useEffect(() => {
        const audio = audioRef.current;
        audio.preload = 'metadata';
        // Reverted as it breaks playback for non-CORS sources like Archive.org
        // audio.crossOrigin = 'anonymous'; 
    }, []);

    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
    const [isRadioMode, setIsRadioMode] = useState(false);
    const [showRadioExitPrompt, setShowRadioExitPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    // Load saved state on mount
    useEffect(() => {
        const loadState = async () => {
            const savedState = await getPlayerState();
            if (savedState) {
                setQueue(savedState.queue || []);
                setCurrentIndex(savedState.currentIndex || 0);
                setVolume(savedState.volume || 1);
                setCurrentTime(savedState.currentTime || 0);
                setIsShuffle(savedState.isShuffle || false);
                setRepeatMode(savedState.repeatMode || 'none');

                if (savedState.currentSong) {
                    setCurrentSong(savedState.currentSong);
                }
            }
        };
        loadState();
    }, []);

    // Save state when it changes
    useEffect(() => {
        const saveState = async () => {
            // Don't persist radio mode or radio queues to storage
            if (isRadioMode) return;

            await savePlayerState({
                currentSong,
                currentTime,
                queue,
                currentIndex,
                volume,
                isShuffle,
                repeatMode
            });
        };

        // Debounce saves
        const timeoutId = setTimeout(saveState, 500);
        return () => clearTimeout(timeoutId);
    }, [currentSong, currentTime, queue, currentIndex, volume, isShuffle, repeatMode]);

    // Handle volume changes
    useEffect(() => {
        audioRef.current.volume = volume;
    }, [volume]);

    // Update Media Session API metadata
    useEffect(() => {
        if (!currentSong) return;

        // Check if Media Session API is supported
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: currentSong.title || 'Unknown Track',
                    artist: currentSong.artist || 'Unknown Artist',
                    album: currentSong.album || '',
                    artwork: currentSong.coverArt ? [
                        { src: currentSong.coverArt, sizes: '512x512', type: 'image/png' },
                        { src: currentSong.coverArt, sizes: '256x256', type: 'image/png' },
                        { src: currentSong.coverArt, sizes: '128x128', type: 'image/png' }
                    ] : []
                });
            } catch (error) {
                console.log('Media Session API not fully supported:', error);
            }
        }
    }, [currentSong]);

    // Update Media Session playback state
    useEffect(() => {
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
            } catch (error) {
                console.log('Could not update playback state:', error);
            }
        }
    }, [isPlaying]);

    // Safe play utility to handle AbortErrors
    const safePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio.src || audio.src === window.location.href) return;

        try {
            await audio.play();
            setIsPlaying(true);
        } catch (err) {
            if (err.name === 'AbortError') {
                // Ignore AbortError - it's normal during rapid changes
                console.log('Playback interrupted (AbortError handled)');
            } else {
                console.error('Play error:', err);
                setIsPlaying(false);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);


    // Play/pause control
    const togglePlayPause = useCallback(() => {
        const audio = audioRef.current;

        if (!currentSong || !currentSong.url) {
            return;
        }

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            setIsLoading(true);
            safePlay();
        }
    }, [isPlaying, currentSong, safePlay]);

    // Seek to specific time
    const seekTo = useCallback((time) => {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }, []);

    // Skip to next song
    const skipToNext = useCallback(() => {
        if (queue.length === 0) return;

        // Radio Mode Override: Always sequential and infinite (loops back)
        if (isRadioMode) {
            const nextIndex = (currentIndex + 1) % queue.length;
            setCurrentIndex(nextIndex);
            setCurrentSong(queue[nextIndex]);
            setCurrentTime(0);
            return;
        }

        // If repeat one is on, or if it's the only song and we're repeating all
        if ((repeatMode === 'one') || (repeatMode === 'all' && queue.length === 1)) {
            audioRef.current.currentTime = 0;
            safePlay();
            return;
        }

        let nextIndex;
        if (isShuffle) {
            // Pick a random index that isn't the current one (if possible)
            if (queue.length > 1) {
                do {
                    nextIndex = Math.floor(Math.random() * queue.length);
                } while (nextIndex === currentIndex);
            } else {
                nextIndex = 0;
            }
        } else {
            nextIndex = (currentIndex + 1) % queue.length;

            // If repeatMode is 'none' and we reached the end, stop
            if (repeatMode === 'none' && nextIndex === 0 && currentIndex === queue.length - 1) {
                setIsPlaying(false);
                return;
            }
        }

        const nextSong = queue[nextIndex];

        // If the song is the same but we are skipping (e.g. queue repeats)
        if (nextSong.id === currentSong?.id) {
            audioRef.current.currentTime = 0;
            safePlay();
        } else {
            setCurrentIndex(nextIndex);
            setCurrentSong(nextSong);
            setCurrentTime(0);
        }
    }, [queue, currentIndex, isShuffle, repeatMode, currentSong, safePlay, isRadioMode]);

    // Skip to previous song
    const skipToPrevious = useCallback(() => {
        if (queue.length === 0) return;

        // If more than 3 seconds played, restart current song
        if (currentTime > 3) {
            seekTo(0);
            return;
        }

        // Radio Mode Override: Always sequential
        if (isRadioMode) {
            const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
            setCurrentIndex(prevIndex);
            setCurrentSong(queue[prevIndex]);
            setCurrentTime(0);
            return;
        }

        let prevIndex;
        if (isShuffle) {
            // In shuffle, previous is also random (Spotify style)
            if (queue.length > 1) {
                do {
                    prevIndex = Math.floor(Math.random() * queue.length);
                } while (prevIndex === currentIndex);
            } else {
                prevIndex = 0;
            }
        } else {
            prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
        }

        setCurrentIndex(prevIndex);
        setCurrentSong(queue[prevIndex]);
        setCurrentTime(0);
    }, [queue, currentIndex, currentTime, seekTo, isShuffle]);

    // Play specific song
    const playSong = useCallback((song) => {
        const action = () => {
            setCurrentSong(song);
            setCurrentTime(0);
            setIsPlaying(true);

            // Track song play
            import('../utils/analytics').then(({ logSongPlay }) => {
                logSongPlay(song);
            });
        };

        if (isRadioMode) {
            setPendingAction(() => action);
            setShowRadioExitPrompt(true);
        } else {
            action();
        }
    }, [isRadioMode]);

    // Set queue and play
    const playQueue = useCallback((songs, startIndex = 0) => {
        const action = () => {
            setQueue(songs);
            setCurrentIndex(startIndex);
            setCurrentSong(songs[startIndex]);
            setCurrentTime(0);
            setIsPlaying(true);

            // Track song play
            import('../utils/analytics').then(({ logSongPlay }) => {
                logSongPlay(songs[startIndex]);
            });
        };

        if (isRadioMode) {
            setPendingAction(() => action);
            setShowRadioExitPrompt(true);
        } else {
            action();
        }
    }, [isRadioMode]);

    // Add to queue
    const addToQueue = useCallback((song) => {
        setQueue(prev => [...prev, song]);
    }, []);

    // Clear queue
    const clearQueue = useCallback(() => {
        setQueue([]);
        setCurrentIndex(0);
        setCurrentSong(null);
        setIsPlaying(false);
        setIsRadioMode(false);
    }, []);

    // Start Radio Mode
    const startRadio = useCallback((allSongs) => {
        if (!allSongs || allSongs.length === 0) return;

        // Reset other modes
        setIsShuffle(false);
        setRepeatMode('none');
        setIsRadioMode(true);

        // Filter for songs with URLs and pick 10 random
        const songsWithUrl = allSongs.filter(s => s.url);
        if (songsWithUrl.length === 0) return;

        const shuffled = [...songsWithUrl].sort(() => 0.5 - Math.random());
        const radioQueue = shuffled.slice(0, 10).map(song => ({
            ...song,
            stationName: 'Vibe Mix',
            isRadioTrack: true
        }));

        setQueue(radioQueue);
        setCurrentIndex(0);
        setCurrentSong(radioQueue[0]);
        setCurrentTime(0);
        setIsPlaying(true);

        // Force audio update and play
        const audio = audioRef.current;
        audio.src = radioQueue[0].url;
        audio.load();
        audio.play().catch(e => console.log('Radio auto-play failed:', e));

        // Track radio start
        import('../utils/analytics').then(({ logEvent }) => {
            logEvent('start_radio', { songCount: radioQueue.length });
        });
    }, []);

    const confirmRadioExit = useCallback(() => {
        if (pendingAction) {
            setIsRadioMode(false);
            pendingAction();
            setPendingAction(null);
        }
        setShowRadioExitPrompt(false);
    }, [pendingAction]);

    const cancelRadioExit = useCallback(() => {
        setPendingAction(null);
        setShowRadioExitPrompt(false);
    }, []);

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Audio element event handlers
    useEffect(() => {
        const audio = audioRef.current;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleDurationChange = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            skipToNext();
        };

        const handleCanPlay = () => {
            setIsLoading(false);
        };

        const handleWaiting = () => {
            setIsLoading(true);
        };

        const handleError = (e) => {
            console.error('Audio error:', e);
            setIsLoading(false);

            // Auto-skip if in radio mode or if there's a queue and we're playing
            if (isRadioMode || (queue.length > 1 && isPlaying)) {
                console.log('Encountered error, skipping to next track...');
                skipToNext();
            } else {
                setIsPlaying(false);
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('error', handleError);
        };
    }, [skipToNext]);

    // Update Media Session playback state
    useEffect(() => {
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
            } catch (error) {
                console.log('Could not update playback state:', error);
            }
        }
    }, [isPlaying]);

    // Register Media Session action handlers
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.setActionHandler('play', safePlay);
            navigator.mediaSession.setActionHandler('pause', () => {
                audioRef.current.pause();
                setIsPlaying(false);
            });
            navigator.mediaSession.setActionHandler('previoustrack', skipToPrevious);
            navigator.mediaSession.setActionHandler('nexttrack', skipToNext);
            navigator.mediaSession.setActionHandler('seekbackward', () => {
                const newTime = Math.max(0, audioRef.current.currentTime - 10);
                audioRef.current.currentTime = newTime;
            });

            navigator.mediaSession.setActionHandler('seekforward', () => {
                const newTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
                audioRef.current.currentTime = newTime;
            });

            // Cleanup handlers on unmount
            return () => {
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.setActionHandler('play', null);
                    navigator.mediaSession.setActionHandler('pause', null);
                    navigator.mediaSession.setActionHandler('previoustrack', null);
                    navigator.mediaSession.setActionHandler('nexttrack', null);
                    navigator.mediaSession.setActionHandler('seekbackward', null);
                    navigator.mediaSession.setActionHandler('seekforward', null);
                }
            };
        } catch (error) {
            console.log('Could not set Media Session handlers:', error);
        }
    }, [skipToNext, skipToPrevious, safePlay]); // Added safePlay to dependencies

    // Main Playback Logic
    useEffect(() => {
        const audio = audioRef.current;

        if (currentSong && currentSong.url) {
            // Only update src if it's fundamentally different or if there was an error
            const currentSrc = audio.src;
            const newSrc = currentSong.url;

            if (currentSrc !== newSrc || audio.error) {
                audio.src = newSrc;
                audio.load();

                // Restore saved position if available
                if (currentTime > 0 && isPlaying === false) {
                    audio.currentTime = currentTime;
                }
            }

            if (isPlaying) {
                safePlay();
            }
        }
    }, [currentSong?.id, currentSong?.url, isPlaying, currentTime, safePlay]);

    return {
        // State
        currentSong,
        isPlaying,
        currentTime,
        duration,
        queue,
        currentIndex,
        volume,
        isLoading,
        isShuffle,
        repeatMode,
        isRadioMode,

        // Controls
        togglePlayPause,
        seekTo,
        skipToNext,
        skipToPrevious,
        playSong,
        playQueue,
        addToQueue,
        clearQueue,
        setVolume,
        setIsShuffle,
        setRepeatMode,
        startRadio,
        setIsRadioMode,
        showRadioExitPrompt,
        confirmRadioExit,
        cancelRadioExit,

        // Helpers
        formatTime,
        progress: duration > 0 ? (currentTime / duration) * 100 : 0
    };
};
