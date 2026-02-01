// AI Configuration Storage

export const saveAIConfig = async (config) => {
    const { saveSetting } = await import('./storage');
    await saveSetting('ai_config', config);
};

export const getAIConfig = async () => {
    const { getSetting } = await import('./storage');
    return await getSetting('ai_config', null);
};

export const validateAIConfig = (config) => {
    if (!config) return { valid: false, error: 'No configuration provided' };

    if (!config.provider || !['openai', 'gemini'].includes(config.provider)) {
        return { valid: false, error: 'Invalid provider' };
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
        return { valid: false, error: 'API key is required' };
    }

    if (!config.model || config.model.trim() === '') {
        return { valid: false, error: 'Model is required' };
    }

    return { valid: true };
};

export const testAIConnection = async (config) => {
    const validation = validateAIConfig(config);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    try {
        if (config.provider === 'openai') {
            const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
            const response = await fetch(`${baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return { success: true, message: 'Connection successful' };
        } else if (config.provider === 'gemini') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`);

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            return { success: true, message: 'Gemini connection successful' };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
};
