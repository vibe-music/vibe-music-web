// URL health checking utilities

export const checkUrlHealth = async (url) => {
    try {
        // Use HEAD request to minimize bandwidth usage
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors', // Allow checking cross-origin URLs
            cache: 'no-cache'
        });

        // If no-cors mode, we can't read status, assume it's okay if no error
        return {
            url,
            status: response.status || 0,
            healthy: true,
            error: null
        };
    } catch (error) {
        return {
            url,
            status: 0,
            healthy: false,
            error: error.message
        };
    }
};

export const scanLibraryHealth = async (onProgress) => {
    const { getAllSongs } = await import('./storage');
    const songs = await getAllSongs();

    const songsWithUrls = songs.filter(s => s.hasUrl && s.url);
    const results = {
        total: songsWithUrls.length,
        healthy: 0,
        unhealthy: 0,
        checked: 0,
        issues: []
    };

    // Check URLs with rate limiting to avoid overwhelming the network
    for (let i = 0; i < songsWithUrls.length; i++) {
        const song = songsWithUrls[i];

        try {
            const health = await checkUrlHealth(song.url);

            results.checked++;

            if (health.healthy) {
                results.healthy++;
            } else {
                results.unhealthy++;
                results.issues.push({
                    songId: song.id,
                    title: song.title,
                    artist: song.artist,
                    url: song.url,
                    error: health.error
                });
            }

            // Call progress callback
            if (onProgress) {
                onProgress({
                    ...results,
                    progress: ((i + 1) / songsWithUrls.length) * 100
                });
            }

            // Rate limiting: wait 100ms between requests
            if (i < songsWithUrls.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error(`Error checking ${song.title}:`, error);
            results.unhealthy++;
            results.issues.push({
                songId: song.id,
                title: song.title,
                artist: song.artist,
                url: song.url,
                error: error.message
            });
        }
    }

    return results;
};
