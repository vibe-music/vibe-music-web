import React, { useState, useEffect } from 'react';
import { getAllAlbums, getAllSongs } from '../utils/storage';
import { getListeningStats, getTopSongs, getDailyPlayCounts, getWeeklyHeatmap } from '../utils/analytics';
import './Stats.css';

const Stats = () => {
    const [stats, setStats] = useState(null);
    const [topSongs, setTopSongs] = useState([]);
    const [dailyPlays, setDailyPlays] = useState([]);
    const [heatmap, setHeatmap] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const [
                listeningStats,
                albums,
                songs,
                top,
                daily,
                heat
            ] = await Promise.all([
                getListeningStats(),
                getAllAlbums(),
                getAllSongs(),
                getTopSongs(5),
                getDailyPlayCounts(14),
                getWeeklyHeatmap()
            ]);

            const songsWithUrls = songs.filter(s => s.hasUrl && s.url);

            setStats({
                ...listeningStats,
                totalAlbums: albums.length,
                totalSongs: songs.length,
                songsReady: songsWithUrls.length
            });
            setTopSongs(top);
            setDailyPlays(daily);
            setHeatmap(heat);
        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="stats-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    const maxPlays = Math.max(...dailyPlays.map(d => d.count), 1);
    const maxHeatmap = Math.max(...heatmap.map(h => h.plays), 1);

    return (
        <div className="stats safe-bottom">
            <header className="stats-header safe-top">
                <h1>Your Stats</h1>
                <p>Listening insights and analytics</p>
            </header>

            <div className="stats-content">
                {/* 1. Top Songs - Back at the Top */}
                {topSongs.length > 0 && (
                    <div className="stats-section">
                        <h2>Most Played</h2>
                        <div className="top-songs">
                            {topSongs.map((song, index) => (
                                <div key={index} className="top-song-item">
                                    <div className="top-song__rank">#{index + 1}</div>
                                    {song.coverArt && (
                                        <img
                                            src={song.coverArt}
                                            alt={song.title}
                                            className="top-song__artwork"
                                        />
                                    )}
                                    <div className="top-song__info">
                                        <div className="top-song__title">{song.title}</div>
                                        <div className="top-song__artist">{song.artist}</div>
                                    </div>
                                    <div className="top-song__plays">
                                        {song.count} plays
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Overview Cards (Status) */}
                <div className="stats-grid">
                    <div className="stat-card gradient-primary">
                        <div className="stat-card__icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="stat-card__value">{stats.totalPlays || 0}</div>
                        <div className="stat-card__label">Total Plays</div>
                    </div>

                    <div className="stat-card gradient-secondary">
                        <div className="stat-card__icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                                <path d="M9 9h.01M9 15h.01M15 9h.01M15 15h.01" strokeWidth="2" />
                            </svg>
                        </div>
                        <div className="stat-card__value">{stats.totalAlbums || 0}</div>
                        <div className="stat-card__label">Albums</div>
                    </div>

                    <div className="stat-card gradient-accent">
                        <div className="stat-card__icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <div className="stat-card__value">{stats.songsReady || 0}</div>
                        <div className="stat-card__label">Songs Ready</div>
                    </div>
                </div>

                {/* 3. Weekly Heatmap */}
                <div className="stats-section">
                    <h2>Weekly Pattern</h2>
                    <p className="stats-section__subtitle">Average plays by day of week (last 4 weeks)</p>
                    <div className="heatmap">
                        {heatmap.map((item, index) => {
                            const intensity = item.plays / maxHeatmap;
                            return (
                                <div key={index} className="heatmap-item">
                                    <div
                                        className="heatmap-bar"
                                        style={{
                                            opacity: intensity > 0 ? 0.3 + (intensity * 0.7) : 0.1
                                        }}
                                    >
                                        <span className="heatmap-value">{item.plays}</span>
                                    </div>
                                    <div className="heatmap-label">{item.day}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 4. Activity Pulse (Last 14 Days) */}
                <div className="stats-section">
                    <div className="stats-section__header">
                        <h2>Activity Pulse</h2>
                        <div className="stats-badge">
                            {dailyPlays.reduce((acc, d) => acc + d.count, 0)} plays
                        </div>
                    </div>
                    <div className="activity-pulse">
                        {dailyPlays.map((day, index) => {
                            const intensity = day.count / maxPlays;
                            return (
                                <div
                                    key={index}
                                    className="pulse-square"
                                    style={{
                                        opacity: intensity > 0 ? 0.2 + (intensity * 0.8) : 0.05,
                                        background: 'var(--gradient-primary)'
                                    }}
                                    title={`${day.dayName}: ${day.count} plays`}
                                >
                                    <span className="pulse-label">{day.dayName.charAt(0)}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="stats-section__footer">
                        Listening intensity over the last 14 days
                    </p>
                </div>

                {stats.totalPlays === 0 && (
                    <div className="stats-empty">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <h3>No listening data yet</h3>
                        <p>Start playing songs to see your stats here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Stats;
