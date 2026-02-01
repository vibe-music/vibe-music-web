import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAlbum, getSongsByAlbum, deleteAlbum, deleteSong } from '../../utils/storage';
import { usePlayer } from '../../context/AudioPlayerContext';
import AddSongURLModal from '../Modals/AddSongURLModal';
import AddTrackModal from '../Modals/AddTrackModal';
import EditAlbumModal from '../Modals/EditAlbumModal';
import { showToast } from '../../utils/toast';
import { useOnboarding } from '../../context/OnboardingContext';
import { getCompleteAlbum } from '../../utils/musicBrainzAPI';
import MarqueeText from '../Common/MarqueeText';
import './AlbumDetail.css';

const AlbumDetail = () => {
    const { stepIndex, nextStep, run } = useOnboarding();
    const { albumId } = useParams();
    const navigate = useNavigate();
    const { playQueue } = usePlayer();

    const [album, setAlbum] = useState(null);
    const [songs, setSongs] = useState([]);
    const [selectedSong, setSelectedSong] = useState(null);
    const [showAddTrack, setShowAddTrack] = useState(false);
    const [showEditAlbum, setShowEditAlbum] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAlbumData();
    }, [albumId]);

    const loadAlbumData = async () => {
        setIsLoading(true);
        try {
            const albumData = await getAlbum(albumId);
            const songsData = await getSongsByAlbum(albumId);
            setAlbum(albumData);
            setSongs(songsData.sort((a, b) => a.position - b.position));
        } catch (err) {
            console.error('Error loading album:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlayAll = () => {
        const playableSongs = songs.filter(song => song.hasUrl && song.url);
        if (playableSongs.length > 0) {
            playQueue(playableSongs, 0);
            navigate('/player');
        }
    };

    const handlePlaySong = (song, index) => {
        if (!song.hasUrl || !song.url) return;

        const playableSongs = songs.filter(s => s.hasUrl && s.url);
        const songIndex = playableSongs.findIndex(s => s.id === song.id);
        playQueue(playableSongs, songIndex);
        navigate('/player');
    };

    const handleAddURL = (song) => {
        setSelectedSong(song);
    };

    const handleURLSaved = () => {
        loadAlbumData();
    };

    const handleDeleteAlbum = async () => {
        if (window.confirm('Are you sure you want to delete this album and all its tracks from your library?')) {
            try {
                await deleteAlbum(albumId);
                showToast.success('Album deleted');
                navigate('/');
            } catch (err) {
                console.error('Error deleting album:', err);
                showToast.error('Failed to delete album');
            }
        }
    };

    const handleDeleteSong = async (songId, songTitle) => {
        if (window.confirm(`Are you sure you want to delete "${songTitle}" from your library?`)) {
            try {
                await deleteSong(songId);
                loadAlbumData(); // Refresh list
                showToast.success(`Deleted "${songTitle}"`);
            } catch (err) {
                console.error('Error deleting song:', err);
                showToast.error('Failed to delete song');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="album-detail-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="album-detail-error">
                <p>Album not found</p>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    Go Home
                </button>
            </div>
        );
    }

    const hasPlayableSongs = songs.some(song => song.hasUrl && song.url);

    return (
        <div className="album-detail safe-bottom">
            <div className="album-detail__header">
                <button className="btn-icon" onClick={() => navigate('/')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="album-detail__header-actions">
                    <button className="btn-icon" onClick={() => setShowEditAlbum(true)} title="Edit Album">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button className="btn-icon btn-delete-album" onClick={handleDeleteAlbum} title="Delete Album">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="album-detail__cover-container">
                {album.coverArt || album.coverArtThumbnail ? (
                    <img
                        src={album.coverArt || album.coverArtThumbnail}
                        alt={album.title}
                        className="album-detail__artwork"
                    />
                ) : (
                    <div className="album-detail__cover-placeholder gradient-primary">
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="album-detail__info">
                <MarqueeText text={album.title} className="album-detail__title-h1" />
                <div className="album-detail__meta">
                    <span className="album-detail__artist">{album.artist}</span>
                    {album.year && (
                        <>
                            <span className="dot">•</span>
                            <p className="album-detail__year">{album.year}</p>
                        </>
                    )}
                    {album.type === 'custom' && (
                        <span className="badge badge--custom">Personal</span>
                    )}
                </div>

                {hasPlayableSongs && (
                    <button className="btn btn-primary btn-play-all" onClick={handlePlayAll}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                        Play All
                    </button>
                )}
            </div>

            <div className="album-detail__tracks">
                <div className="section-header">
                    <h3>Tracks</h3>
                    <button
                        className="btn-icon btn-add-track"
                        onClick={() => setShowAddTrack(true)}
                        title="Add Manual Track"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
                {songs.length === 0 ? (
                    <div className="tracks-empty">
                        <p>No tracks added yet.</p>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddTrack(true)}>
                            Add First Track
                        </button>
                    </div>
                ) : (
                    songs.map((song, index) => (
                        <div
                            key={song.id}
                            className={`track-item ${song.hasUrl ? 'track-item--playable' : ''}`}
                            id={index === 0 ? "onboarding-track-0" : ""}
                            onClick={() => handlePlaySong(song, index)}
                        >
                            <div className="track-item__number">{song.position}</div>
                            <div className="track-item__info">
                                <div className="track-item__title">{song.title}</div>
                                {song.duration && (
                                    <div className="track-item__duration">
                                        {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                                    </div>
                                )}
                            </div>
                            {song.hasUrl ? (
                                <div className="track-item__actions">
                                    <div className="track-item__status track-item__status--ready">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="12" r="10" opacity="0.2" />
                                            <path d="M9 12l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <button
                                        className="btn-icon btn-edit-track"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddURL(song);
                                        }}
                                        title="Edit URL"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <button
                                        className="btn-icon btn-delete-track"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSong(song.id, song.title);
                                        }}
                                        title="Delete Track"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (index === 0 && run) {
                                            // Do nothing - driver handles navigation
                                        }
                                        handleAddURL(song);
                                    }}
                                >
                                    Add URL
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {showAddTrack && (
                <AddTrackModal
                    album={album}
                    lastPosition={songs.length > 0 ? Math.max(...songs.map(s => s.position)) : 0}
                    onClose={() => setShowAddTrack(false)}
                    onSaved={loadAlbumData}
                />
            )}

            {selectedSong && (
                <AddSongURLModal
                    song={selectedSong}
                    onClose={() => setSelectedSong(null)}
                    onSaved={handleURLSaved}
                />
            )}

            {showEditAlbum && (
                <EditAlbumModal
                    album={album}
                    onClose={() => setShowEditAlbum(false)}
                    onAlbumUpdated={loadAlbumData}
                />
            )}
        </div>
    );
};

export default AlbumDetail;
