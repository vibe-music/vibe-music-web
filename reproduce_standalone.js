
const https = require('https');

const MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
const APP_NAME = 'VibeMusic';
const APP_VERSION = '1.0.0';
const CONTACT = 'user@example.com';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': `${APP_NAME}/${APP_VERSION} ( ${CONTACT} )`
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse JSON'));
                    }
                } else {
                    reject(new Error(`Status Code: ${res.statusCode}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function searchAlbums(query) {
    const encodedQuery = encodeURIComponent(query);
    const url = `${MUSICBRAINZ_API}/release-group?query=${encodedQuery}&limit=1&fmt=json`;
    const data = await fetchJson(url);
    return data['release-groups'] || [];
}

async function getAlbumDetails(releaseGroupId) {
    // Release Group Details
    const rgUrl = `${MUSICBRAINZ_API}/release-group/${releaseGroupId}?inc=artist-credits+releases&fmt=json`;
    const rgData = await fetchJson(rgUrl);

    // First Release
    const releaseId = rgData.releases?.[0]?.id;
    if (!releaseId) throw new Error('No releases found');

    // Release Details (Tracks)
    const releaseUrl = `${MUSICBRAINZ_API}/release/${releaseId}?inc=recordings+artist-credits&fmt=json`;
    const releaseData = await fetchJson(releaseUrl);

    console.log("Release Data Sample:", JSON.stringify(releaseData, null, 2));

    return {
        id: releaseGroupId,
        mbReleaseId: releaseId,
        tracks: releaseData.media?.[0]?.tracks || []
    };
}

async function run() {
    try {
        console.log("Searching 'Midnight Echoes'...");
        const albums = await searchAlbums('Midnight Echoes');
        if (albums.length === 0) {
            console.log("No albums found.");
            return;
        }

        const firstAlbum = albums[0];
        console.log("First Album:", JSON.stringify(firstAlbum, null, 2));

        console.log("Getting details...");
        const details = await getAlbumDetails(firstAlbum.id);
        console.log("Success!", details);

    } catch (error) {
        console.error("FAILED:", error.message);
        if (error.response) console.error(error.response);
    }
}

run();
