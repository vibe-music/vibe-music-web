import React, { useState, useEffect, useRef } from 'react';
import AlbumGrid from '../components/Album/AlbumGrid';
import SongListItem from '../components/Song/SongListItem';
import AlphabetIndex from '../components/Song/AlphabetIndex';
import PlaylistGrid from '../components/Playlist/PlaylistGrid';
import { getAllAlbums, getAllSongs, getAllPlaylists } from '../utils/storage';
import './Library.css';

const Library = () => {
    const [albums, setAlbums] = useState([]);
    const [songs, setSongs] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [activeTab, setActiveTab] = useState('albums');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentLetter, setCurrentLetter] = useState('');
    const sectionRefs = useRef({});
    const observerRef = useRef(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [allAlbums, allSongs, allPlaylists] = await Promise.all([
                getAllAlbums(),
                getAllSongs(),
                getAllPlaylists()
            ]);
            setAlbums(allAlbums);
            setPlaylists(allPlaylists);
            // Only songs with a valid URL (successful link)
            setSongs(allSongs.filter(s => s.url).sort((a, b) => (a.title || '').localeCompare(b.title || '')));
        } catch (err) {
            console.error('Error loading library data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLetterClick = (letter) => {
        const element = sectionRefs.current[letter];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setCurrentLetter(letter);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Group songs by first letter
    const groupedSongs = songs
        .filter(song =>
            (song.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (song.artist || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        .reduce((acc, song) => {
            const title = song.title || 'Unknown';
            const firstLetter = title[0].toUpperCase();
            const key = /^[A-Z]/.test(firstLetter) ? firstLetter : '#';
            if (!acc[key]) acc[key] = [];
            acc[key].push(song);
            return acc;
        }, {});

    const alphabetKeys = Object.keys(groupedSongs).sort();

    useEffect(() => {
        if (activeTab !== 'songs') return;

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setCurrentLetter(entry.target.dataset.section);
                }
            });
        }, {
            root: null,
            rootMargin: '-10% 0px -80% 0px', // Detect near the top
            threshold: 0
        });

        Object.values(sectionRefs.current).forEach(section => {
            if (section) observerRef.current.observe(section);
        });

        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, [activeTab, groupedSongs]);

    if (isLoading) {
        return (
            <div className="library-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="library safe-bottom">
            <header className="library-header safe-top">
                <div className="library-header__top">
                    <h1>Library</h1>
                    <div className="library-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'albums' ? 'active' : ''}`}
                            onClick={() => setActiveTab('albums')}
                        >
                            Albums
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'songs' ? 'active' : ''}`}
                            onClick={() => setActiveTab('songs')}
                        >
                            Songs
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'playlists' ? 'active' : ''}`}
                            onClick={() => setActiveTab('playlists')}
                        >
                            Playlists
                        </button>
                    </div>
                </div>

                {(activeTab === 'songs' || activeTab === 'playlists') && (
                    <div className="library-search">
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}
            </header>

            <div className="library-content">
                {activeTab === 'albums' ? (
                    <AlbumGrid albums={albums.filter(a =>
                        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.artist.toLowerCase().includes(searchQuery.toLowerCase())
                    )} />
                ) : activeTab === 'playlists' ? (
                    <PlaylistGrid playlists={playlists.filter(p =>
                        p.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )} />
                ) : (
                    <div className="library-songs">
                        {alphabetKeys.length > 0 ? (
                            <>
                                <div className="songs-list">
                                    {alphabetKeys.map(letter => (
                                        <div
                                            key={letter}
                                            className="song-section"
                                            data-section={letter}
                                            ref={el => sectionRefs.current[letter] = el}
                                        >
                                            <div className="song-section__header">{letter}</div>
                                            <div className="song-section__items">
                                                {groupedSongs[letter].map(song => (
                                                    <SongListItem key={song.id} song={song} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <AlphabetIndex
                                    onLetterClick={handleLetterClick}
                                    currentLetter={currentLetter}
                                />
                            </>
                        ) : (
                            <div className="empty-songs">
                                <p>No songs found with valid links.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Library;
