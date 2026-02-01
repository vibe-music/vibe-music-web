// AI LLM Client with Streaming Support

const buildMusicContext = async () => {
    const { getAllAlbums, getAllSongs, getSetting } = await import('./storage');

    const [albums, songs, stats] = await Promise.all([
        getAllAlbums(),
        getAllSongs(),
        getSetting('listening_stats')
    ]);

    // Calculate total duration
    const totalDuration = songs.reduce((sum, song) => sum + (song.duration || 0), 0);

    // Get top artists
    const artistCounts = {};
    songs.forEach(song => {
        if (song.artist) {
            artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
        }
    });

    const topArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([artist, count]) => ({ artist, songCount: count }));

    // Get top albums
    const albumPlayCounts = stats?.albumPlayCounts || {};
    const topAlbums = Object.entries(albumPlayCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([albumId, plays]) => {
            const album = albums.find(a => a.id === albumId);
            return album ? { title: album.title, artist: album.artist, plays } : null;
        })
        .filter(Boolean);

    return {
        library: {
            totalAlbums: albums.length,
            totalSongs: songs.length,
            totalDuration: Math.floor(totalDuration / 60), // in minutes
            albums: albums.map(a => ({ id: a.id, title: a.title, artist: a.artist })),
            songs: songs.map(s => ({ id: s.id, title: s.title, artist: s.artist, album: s.album }))
        },
        stats: {
            topArtists,
            topAlbums,
            totalPlays: stats?.totalPlays || 0
        }
    };
};

const buildSystemPrompt = (context) => {
    return `You are Vibe AI, the intelligent music assistant for the Vibe Music app. The user has a personal music library with ${context.library.totalSongs} songs from ${context.library.totalAlbums} albums.

Your capabilities:
- Suggest music based on their taste and listening history
- Find similar songs or artists
- Answer questions about their library
- Provide music recommendations
- Analyze their listening patterns

User's Music Library Context:
- Total Songs: ${context.library.totalSongs}
- Total Albums: ${context.library.totalAlbums}
- Total Listening Time: ${context.library.totalDuration} minutes
- Top Artists: ${context.stats.topArtists.map(a => a.artist).join(', ')}
${context.stats.topAlbums.length > 0 ? `- Top Albums: ${context.stats.topAlbums.map(a => `"${a.title}" by ${a.artist}`).join(', ')}` : ''}

Be helpful, friendly, and deeply knowledgeable about music trends and history. When suggesting songs, prioritize referencing actual songs from their library, but feel free to suggest new music they might like to add. Keep responses concise and engaging.`;
};

export const streamChatCompletion = async (messages, onChunk, onComplete, onError) => {
    try {
        const { getAIConfig } = await import('./aiConfig');
        const config = await getAIConfig();

        if (!config) {
            throw new Error('AI not configured. Please set up your API in Settings.');
        }

        const context = await buildMusicContext();
        const systemPrompt = buildSystemPrompt(context);

        const messagesWithContext = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        if (config.provider === 'openai') {
            await streamOpenAI(config, messagesWithContext, onChunk, onComplete, onError);
        } else if (config.provider === 'gemini') {
            await streamGemini(config, messagesWithContext, onChunk, onComplete, onError);
        }
    } catch (error) {
        onError(error);
    }
};

const streamOpenAI = async (config, messages, onChunk, onComplete, onError) => {
    try {
        const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model || 'gpt-4',
                messages,
                stream: true,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API error');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                        onComplete(fullResponse);
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;

                        if (content) {
                            fullResponse += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }

        onComplete(fullResponse);
    } catch (error) {
        onError(error);
    }
};

const streamGemini = async (config, messages, onChunk, onComplete, onError) => {
    try {
        // Convert OpenAI format to Gemini format
        const contents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        // Add system instruction as first user message
        const systemMsg = messages.find(m => m.role === 'system');
        if (systemMsg) {
            contents.unshift({
                role: 'user',
                parts: [{ text: `System Instructions: ${systemMsg.content}\n\nPlease follow these instructions for all responses.` }]
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-pro'}:streamGenerateContent?key=${config.apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Gemini API error');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);

            try {
                const lines = chunk.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    const parsed = JSON.parse(line);
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (text) {
                        fullResponse += text;
                        onChunk(text);
                    }
                }
            } catch (e) {
                // Skip invalid JSON
            }
        }

        onComplete(fullResponse);
    } catch (error) {
        onError(error);
    }
};
