// MusicBrainz API Integration
// Docs: https://musicbrainz.org/doc/MusicBrainz_API

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const COVERART_API = 'https://coverartarchive.org';
const APP_NAME = 'VibeMusic';
const APP_VERSION = '1.0.0';
const CONTACT = 'user@example.com'; // MusicBrainz asks for contact info

// Rate limiting: MusicBrainz allows 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const rateLimit = async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await wait(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }

    lastRequestTime = Date.now();
};

const fetchWithRateLimit = async (url) => {
    await rateLimit();

    const response = await fetch(url, {
        headers: {
            'User-Agent': `${APP_NAME}/${APP_VERSION} ( ${CONTACT} )`
        }
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
};

/**
 * Search for albums by name
 * @param {string} query - Album name or artist + album
 * @param {number} limit - Number of results (default 10)
 */
export const searchAlbums = async (query, limit = 10) => {
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `${MUSICBRAINZ_API}/release-group?query=${encodedQuery}&limit=${limit}&fmt=json`;

        const data = await fetchWithRateLimit(url);

        if (!data['release-groups'] || data['release-groups'].length === 0) {
            return [];
        }

        return data['release-groups'].map(rg => ({
            id: rg.id,
            title: rg.title,
            artist: rg['artist-credit']?.[0]?.name || 'Unknown Artist',
            type: rg['primary-type'],
            year: rg['first-release-date']?.substring(0, 4),
            mbid: rg.id
        }));
    } catch (error) {
        console.error('Error searching albums:', error);
        throw error;
    }
};

/**
 * Get album details including track list
 * @param {string} releaseGroupId - MusicBrainz release group ID
 */
export const getAlbumDetails = async (releaseGroupId) => {
    try {
        // First get the release group details
        const rgUrl = `${MUSICBRAINZ_API}/release-group/${releaseGroupId}?inc=artist-credits+releases&fmt=json`;
        const rgData = await fetchWithRateLimit(rgUrl);

        // Get the first release to fetch track list
        // Get the first release to fetch track list
        const releaseId = rgData.releases?.[0]?.id;

        if (!releaseId) {
            console.warn('No releases found for this album, returning basic info');
            return {
                id: releaseGroupId,
                mbReleaseId: null,
                title: rgData.title,
                artist: rgData['artist-credit']?.[0]?.name || 'Unknown Artist',
                type: rgData['primary-type'],
                year: rgData['first-release-date']?.substring(0, 4),
                tracks: []
            };
        }

        // Get the release with recordings (tracks)
        const releaseUrl = `${MUSICBRAINZ_API}/release/${releaseId}?inc=recordings+artist-credits&fmt=json`;
        const releaseData = await fetchWithRateLimit(releaseUrl);

        // Extract track list
        const tracks = [];
        if (releaseData.media) {
            releaseData.media.forEach(medium => {
                medium.tracks?.forEach((track, index) => {
                    tracks.push({
                        position: track.position || index + 1,
                        title: track.title || track.recording?.title,
                        duration: track.length ? Math.floor(track.length / 1000) : null, // Convert to seconds
                        recordingId: track.recording?.id
                    });
                });
            });
        }

        return {
            id: releaseGroupId,
            mbReleaseId: releaseId,
            title: rgData.title,
            artist: rgData['artist-credit']?.[0]?.name || 'Unknown Artist',
            type: rgData['primary-type'],
            year: rgData['first-release-date']?.substring(0, 4),
            tracks
        };
    } catch (error) {
        console.error('Error getting album details:', error);
        throw error;
    }
};

/**
 * Get cover art for an album
 * @param {string} releaseId - MusicBrainz release ID (not release group)
 */
export const getCoverArt = async (releaseId) => {
    try {
        const url = `${COVERART_API}/release/${releaseId}`;

        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                return null; // No cover art available
            }
            throw new Error(`Cover art request failed: ${response.status}`);
        }

        const data = await response.json();

        // Get the front cover or the first available image
        const frontCover = data.images?.find(img => img.front === true);
        const coverImage = frontCover || data.images?.[0];

        if (!coverImage) {
            return null;
        }

        return {
            thumbnail: coverImage.thumbnails?.small || coverImage.thumbnails?.['250'],
            small: coverImage.thumbnails?.large || coverImage.thumbnails?.['500'],
            large: coverImage.image,
            approved: coverImage.approved
        };
    } catch (error) {
        console.error('Error getting cover art:', error);
        return null; // Return null instead of throwing to handle missing covers gracefully
    }
};

/**
 * Search and get complete album data with cover art
 * @param {string} query - Search query
 * @param {number} limit - Number of results
 */
export const searchAlbumsWithCovers = async (query, limit = 10) => {
    try {
        const albums = await searchAlbums(query, limit);

        // For each album, try to get the release ID and cover art
        const albumsWithCovers = await Promise.all(
            albums.map(async (album) => {
                try {
                    const details = await getAlbumDetails(album.id);
                    const coverArt = await getCoverArt(details.mbReleaseId);

                    return {
                        ...album,
                        mbReleaseId: details.mbReleaseId,
                        coverArt: coverArt?.small || null
                    };
                } catch (error) {
                    // If we can't get details/cover, return album without it
                    return {
                        ...album,
                        coverArt: null
                    };
                }
            })
        );

        return albumsWithCovers;
    } catch (error) {
        console.error('Error searching albums with covers:', error);
        throw error;
    }
};

/**
 * Get full album with tracks and cover art
 */
export const getCompleteAlbum = async (releaseGroupId) => {
    try {
        const details = await getAlbumDetails(releaseGroupId);
        const coverArt = await getCoverArt(details.mbReleaseId);

        return {
            ...details,
            coverArt: coverArt?.large || coverArt?.small || null,
            coverArtThumbnail: coverArt?.thumbnail || null
        };
    } catch (error) {
        console.error('Error getting complete album:', error);
        throw error;
    }
};
