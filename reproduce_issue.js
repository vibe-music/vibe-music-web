
const { searchAlbumsWithCovers, getCompleteAlbum } = require('./src/utils/musicBrainzAPI');

// Polyfill fetch for Node environment
if (!global.fetch) {
    global.fetch = require('node-fetch');
}

async function debugMidnightEchoes() {
    try {
        console.log("Searching for 'Midnight Echoes'...");
        const albums = await searchAlbumsWithCovers('Midnight Echoes', 1);

        if (albums.length === 0) {
            console.log("No albums found.");
            return;
        }

        const album = albums[0];
        console.log("Found album:", JSON.stringify(album, null, 2));

        console.log("Fetching complete album details...");
        const fullAlbum = await getCompleteAlbum(album.id);
        console.log("Full album data:", JSON.stringify(fullAlbum, null, 2));

    } catch (error) {
        console.error("DEBUG ERROR:", error);
    }
}

debugMidnightEchoes();
