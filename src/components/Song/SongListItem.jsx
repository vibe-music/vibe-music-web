import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/AudioPlayerContext';
import AddToPlaylistModal from '../Modals/AddToPlaylistModal';
import PlayNextAlert from '../Modals/PlayNextAlert';
import MarqueeText from '../Common/MarqueeText';
import './SongListItem.css';

const SongListItem = ({ song, onClick, onDelete }) => {
    const { currentSong, isPlaying, playSong } = usePlayer();
    const [showPlaylistModal, setShowPlaylistModal] = React.useState(false);
    const [showPlayNextAlert, setShowPlayNextAlert] = React.useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = React.useRef(null);
    const isActive = currentSong?.id === song.id;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    const handleClick = () => {
        if (onClick) {
            onClick(song);
        } else {
            playSong(song);
        }
    };

    return (
        <div
            className={`song-list-item ${isActive ? 'active' : ''} ${isPlaying && isActive ? 'playing' : ''}`}
            onClick={handleClick}
        >
            <div className="song-list-item__artwork">
                {song.coverArt ? (
                    <img src={song.coverArt} alt={song.title} className="song-item__artwork" />
                ) : (
                    <div className="song-list-item__placeholder gradient-primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
                {isActive && (
                    <div className="song-list-item__play-state">
                        {isPlaying ? (
                            <div className="playing-bars">
                                <span></span><span></span><span></span>
                            </div>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </div>
                )}
            </div>
            <div className="song-list-item__info">
                <div className="song-list-item__title">{song.title}</div>
                <div className="song-list-item__metadata">
                    <span className="song-list-item__artist">{song.artist}</span>
                    <span className="song-list-item__dot">•</span>
                    <span className="song-list-item__album">{song.album}</span>
                </div>
            </div>
            {song.duration && (
                <div className="song-list-item__duration">
                    {typeof song.duration === 'string' ? song.duration : Math.floor(song.duration / 60) + ':' + (song.duration % 60).toString().padStart(2, '0')}
                </div>
            )}
            <div className="song-list-item__actions" ref={dropdownRef}>
                <button
                    className="song-list-item__more btn-icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(!showDropdown);
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="5" r="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="19" r="1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {showDropdown && (
                    <div className="song-item-dropdown animate-scale-in">
                        <button className="dropdown-item" onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            setShowPlaylistModal(true);
                        }}>
                            <span className="item-icon">➕</span> Add to Playlist
                        </button>
                        <button className="dropdown-item" onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            setShowPlayNextAlert(true);
                        }}>
                            <span className="item-icon">⏭️</span> Play Next
                        </button>
                        {onDelete && (
                            <button className="dropdown-item delete-item" onClick={(e) => {
                                e.stopPropagation();
                                setShowDropdown(false);
                                onDelete(song);
                            }}>
                                <span className="item-icon">🗑️</span> Delete Song
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showPlaylistModal && (
                <AddToPlaylistModal
                    song={song}
                    onClose={() => setShowPlaylistModal(false)}
                />
            )}

            {showPlayNextAlert && (
                <PlayNextAlert
                    isOpen={showPlayNextAlert}
                    songName={song.title}
                    onClose={() => setShowPlayNextAlert(false)}
                    onConfirm={() => {
                        console.log('Play Next confirmed for:', song.title);
                        // In a real app, logic to move to front of queue would go here
                        setShowPlayNextAlert(false);
                    }}
                />
            )}
        </div>
    );
};

export default SongListItem;
