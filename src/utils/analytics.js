// Analytics tracking utilities for listening stats

export const logSongPlay = async (song) => {
    const statsKey = 'listening_stats';
    const stats = await getStats();

    const today = new Date().toISOString().split('T')[0];

    // Update daily play count
    if (!stats.dailyPlays[today]) {
        stats.dailyPlays[today] = 0;
    }
    stats.dailyPlays[today]++;

    // Update total plays
    stats.totalPlays++;

    // Update song play count
    if (!stats.songPlays[song.id]) {
        stats.songPlays[song.id] = {
            count: 0,
            title: song.title,
            artist: song.artist,
            coverArt: song.coverArt
        };
    }
    stats.songPlays[song.id].count++;

    // Update last played
    stats.lastPlayed = {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        timestamp: Date.now()
    };

    await saveStats(stats);
};

export const logAlbumAdded = async () => {
    const stats = await getStats();
    const today = new Date().toISOString().split('T')[0];

    if (!stats.albumsAdded[today]) {
        stats.albumsAdded[today] = 0;
    }
    stats.albumsAdded[today]++;
    stats.totalAlbumsAdded++;

    await saveStats(stats);
};

export const logSongAdded = async () => {
    const stats = await getStats();
    stats.totalSongsWithUrls++;
    await saveStats(stats);
};

const getStats = async () => {
    const localStorage = await import('./storage');
    const stats = await localStorage.getSetting('listening_stats');

    return stats || {
        totalPlays: 0,
        totalAlbumsAdded: 0,
        totalSongsWithUrls: 0,
        dailyPlays: {},
        albumsAdded: {},
        songPlays: {},
        lastPlayed: null,
        createdAt: Date.now()
    };
};

const saveStats = async (stats) => {
    const localStorage = await import('./storage');
    await localStorage.saveSetting('listening_stats', stats);
};

export const getListeningStats = async () => {
    return await getStats();
};

export const getTopSongs = async (limit = 5) => {
    const stats = await getStats();
    const songs = Object.values(stats.songPlays);
    return songs
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
};

export const getDailyPlayCounts = async (days = 30) => {
    const stats = await getStats();
    const result = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        result.push({
            date: dateStr,
            count: stats.dailyPlays[dateStr] || 0,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
        });
    }

    return result;
};

export const getWeeklyHeatmap = async () => {
    // Returns data for last 4 weeks, grouped by day of week
    const stats = await getStats();
    const heatmap = Array(7).fill(0); // Mon-Sun
    const today = new Date();

    for (let i = 0; i < 28; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay(); // 0 = Sunday
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0

        heatmap[adjustedDay] += stats.dailyPlays[dateStr] || 0;
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => ({
        day,
        plays: heatmap[index]
    }));
};

export const logEvent = async (eventName, params = {}) => {
    const stats = await getStats();

    if (!stats.events) {
        stats.events = [];
    }

    stats.events.push({
        name: eventName,
        params,
        timestamp: Date.now()
    });

    // Keep only last 100 events to avoid bloating localStorage
    if (stats.events.length > 100) {
        stats.events = stats.events.slice(-100);
    }

    await saveStats(stats);
};
