import { safeStorage } from '../utils/safeStorage';
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { usePlayer } from '../context/AudioPlayerContext';
import { useOnboarding } from '../context/OnboardingContext';
import TopRightProfile from '../components/Layout/TopRightProfile';
import MarqueeText from '../components/Common/MarqueeText';
import { Link, useNavigate } from 'react-router-dom';
import AlbumGrid from '../components/Album/AlbumGrid';
import SongListItem from '../components/Song/SongListItem';
import AlbumSearch from '../components/Search/AlbumSearch';
import CustomAlbumModal from '../components/Modals/CustomAlbumModal';
import { getAllAlbums, getAllSongs, getPlaylist } from '../utils/storage';
import { getListeningStats } from '../utils/analytics';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const { user, isPro } = useUser();
    const { playSong, startRadio } = usePlayer();
    const { startTour, completeOnboarding, run, isCompleted } = useOnboarding();
    const [albums, setAlbums] = useState([]);
    const [likedSongs, setLikedSongs] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [quickSongs, setQuickSongs] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();

        const handleOpenCustom = () => setShowCustom(true);

        // Debounce storage updates to prevent flickering during bulk operations like sync
        let updateTimer = null;
        const handleStorageUpdate = () => {
            if (updateTimer) clearTimeout(updateTimer);
            updateTimer = setTimeout(() => {
                loadData(true);
            }, 1000); // Wait for 1s of silence before refreshing
        };

        document.addEventListener('open-custom-album', handleOpenCustom);
        window.addEventListener('vibe-storage-update', handleStorageUpdate);

        return () => {
            if (updateTimer) clearTimeout(updateTimer);
            document.removeEventListener('open-custom-album', handleOpenCustom);
            window.removeEventListener('vibe-storage-update', handleStorageUpdate);
        };
    }, []);

    useEffect(() => {
        // Only show prompt if:
        // 1. Storage says no status yet
        // 2. Context says tour isn't currently running
        // 3. Context says tour isn't completed
        const onboardingStatus = safeStorage.getItem('vibe_onboarding_status');
        if (!onboardingStatus && !run && !isCompleted) {
            const timer = setTimeout(() => {
                if (window.confirm("Welcome to Vibe Music! Would you like a quick interactive tour to see how to add your first album?")) {
                    startTour(true);
                } else {
                    completeOnboarding('skipped');
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [startTour, completeOnboarding, run, isCompleted]);

    const loadData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [allAlbums, allSongs, stats, likedPlaylist] = await Promise.all([
                getAllAlbums(),
                getAllSongs(),
                getListeningStats(),
                getPlaylist('liked-music')
            ]);

            const songsWithUrl = (allSongs || []).filter(s => s.url);

            // Recent Albums (Limit to 4) with Guard
            const nextAlbums = (allAlbums || []).slice(0, 4);
            setAlbums(prev => {
                if (JSON.stringify(prev) === JSON.stringify(nextAlbums)) return prev;
                return nextAlbums;
            });

            // Filter songs with URLs and sort by most played (count)
            const nextQuickSongs = [...songsWithUrl]
                .sort((a, b) => {
                    const countA = stats?.songPlays?.[a.id]?.count || 0;
                    const countB = stats?.songPlays?.[b.id]?.count || 0;
                    return countB - countA;
                })
                .slice(0, 4);

            setQuickSongs(prev => {
                if (JSON.stringify(prev) === JSON.stringify(nextQuickSongs)) return prev;
                return nextQuickSongs;
            });

            // Liked Songs (Last 2) with Guard
            let nextLiked = [];
            if (likedPlaylist && likedPlaylist.songIds && likedPlaylist.songIds.length > 0) {
                const likedSongIds = likedPlaylist.songIds.slice(-2).reverse();
                const matchedSongs = songsWithUrl.filter(s => likedSongIds.includes(s.id));
                nextLiked = likedSongIds
                    .map(id => matchedSongs.find(s => s.id === id))
                    .filter(Boolean);
            }

            setLikedSongs(prev => {
                if (JSON.stringify(prev) === JSON.stringify(nextLiked)) return prev;
                return nextLiked;
            });

            // Recommendations Stability: Only generate if we don't have them yet
            setRecommendations(prev => {
                if (prev.length > 0) return prev;

                const pool = [
                    ...(allAlbums || []).map(a => ({ ...a, type: 'album' })),
                    ...songsWithUrl.map(s => ({ ...s, type: 'song' }))
                ];

                if (pool.length > 0) {
                    return [...pool].sort(() => 0.5 - Math.random()).slice(0, 4);
                }
                return prev;
            });

        } catch (err) {
            console.error('Error loading home data:', err);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleAlbumAdded = () => {
        loadData();
    };

    const handleStartRadio = async () => {
        try {
            const allSongs = await getAllSongs();
            if (allSongs && allSongs.length > 0) {
                startRadio(allSongs);
                navigate('/player');
            }
        } catch (err) {
            console.error('Error starting radio:', err);
        }
    };

    return (
        <div className="home safe-bottom">
            <header className="home-header safe-top">
                <div className="home-header__content">
                    <div className="home-header__title-row">
                        <div className="home-header__title-group">
                            <h1 className="home-header__title">
                                Vibe Music
                            </h1>
                            <span className={`user-badge-premium ${isPro ? 'pro' : 'free'}`}>
                                {isPro ? 'PRO' : 'FREE'}
                            </span>
                        </div>
                        <TopRightProfile />
                    </div>
                    <p className="home-subtitle">Your music, your sources</p>
                </div>
            </header>

            <section className="home-content">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading your vibes...</p>
                    </div>
                ) : (
                    <>
                        {/* 1. Quick Play */}
                        {quickSongs.length > 0 && (
                            <section className="home-section quick-play">
                                <div className="section-header">
                                    <h2 className="section-title">Quick Play</h2>
                                    <button
                                        className="btn-radio-mini"
                                        onClick={handleStartRadio}
                                        title="Start Vibe Radio"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        <span>Start Radio</span>
                                    </button>
                                </div>
                                <div className="quick-songs-grid">
                                    {quickSongs.map(song => (
                                        <SongListItem key={song.id} song={song} />
                                    ))}
                                </div>
                            </section>
                        )}


                        {/* 2. Your Albums (Recent 4) */}
                        <section className="home-section">
                            <div className="section-header">
                                <h2 className="section-title">Recent Albums</h2>
                                <Link to="/library" className="view-all-link">View All</Link>
                            </div>
                            {albums.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state__icon">
                                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="6" cy="18" r="2" strokeWidth="2" />
                                            <circle cx="18" cy="16" r="2" strokeWidth="2" />
                                        </svg>
                                    </div>
                                    <p>Start building your library by adding albums from Archive.org</p>
                                </div>
                            ) : (
                                <AlbumGrid albums={albums} onboardingId="onboarding-recent-album-0" />
                            )}
                        </section>

                        {/* 3. Liked Songs (Last 2) */}
                        {likedSongs.length > 0 && (
                            <section className="home-section liked-preview">
                                <div className="section-header">
                                    <h2 className="section-title">Recently Liked</h2>
                                    <Link to="/playlists/liked-music" className="view-all-link">View Liked</Link>
                                </div>
                                <div className="quick-songs-grid">
                                    {likedSongs.map(song => (
                                        <SongListItem key={song.id} song={song} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 4. Recommendations (Random 4) */}
                        {recommendations.length > 0 && (
                            <section className="home-section recommendations">
                                <div className="section-header">
                                    <h2 className="section-title">Recommended for You</h2>
                                </div>
                                <div className="recommendations-container">
                                    <div className="recommendations-grid">
                                        {recommendations.map((item, idx) => (
                                            <div key={`${item.type}-${item.id}`} className={`rec-card rec-${item.type}`}>
                                                <div className="rec-card__artwork">
                                                    {item.coverArt ? (
                                                        <img src={item.coverArt} alt={item.title} loading="lazy" />
                                                    ) : (
                                                        <div className="rec-card__placeholder gradient-primary">
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="rec-card__info">
                                                    <div className="rec-card__title">{item.title}</div>
                                                    <div className="rec-card__subtitle">
                                                        {item.type === 'album' ? item.artist : `${item.artist} • Song`}
                                                    </div>
                                                </div>
                                                <Link
                                                    to={item.type === 'album' ? `/album/${item.id}` : '#'}
                                                    className="rec-card__link"
                                                    onClick={(e) => {
                                                        if (item.type === 'song') {
                                                            e.preventDefault();
                                                            playSong(item);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </section>

            <div className="home-fab-container">
                <button
                    className="btn-fab"
                    id="btn-fab-add"
                    onClick={() => setShowSearch(true)}
                    aria-label="Add album from Archive.org"
                    title="Add from Archive.org"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {showSearch && (
                <AlbumSearch
                    onClose={() => setShowSearch(false)}
                    onAlbumAdded={handleAlbumAdded}
                />
            )}

            {showCustom && (
                <CustomAlbumModal
                    onClose={() => setShowCustom(false)}
                    onAlbumAdded={handleAlbumAdded}
                />
            )}
        </div>
    );
};

export default Home;
