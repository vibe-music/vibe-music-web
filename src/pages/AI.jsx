import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { streamChatCompletion } from '../utils/aiClient';
import { getAIConfig, testAIConnection, saveAIConfig } from '../utils/aiConfig';
import { usePlayer } from '../context/AudioPlayerContext';
import './AI.css';

// Configure marked for better code rendering
marked.setOptions({
    breaks: true,
    gfm: true
});

const AI = () => {
    const [config, setConfig] = useState(null);
    const [showConfig, setShowConfig] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const { currentSong } = usePlayer();
    const hasMiniPlayer = currentSong !== null;

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadConfig = async () => {
        const savedConfig = await getAIConfig();
        setConfig(savedConfig);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const suggestedPrompts = [
        "Suggest music based on my taste",
        "What are my top artists?",
        "Recommend something new to listen to",
        "Analyze my listening patterns"
    ];

    const handleSendMessage = async (message) => {
        if (!message.trim() || isStreaming) return;

        const userMessage = { role: 'user', content: message };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setError(null);
        setIsStreaming(true);

        // Create assistant message placeholder
        const assistantMessage = { role: 'assistant', content: '' };
        setMessages(prev => [...prev, assistantMessage]);

        const allMessages = [...messages, userMessage];

        await streamChatCompletion(
            allMessages,
            (chunk) => {
                // Update the last message with streaming content
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1].content += chunk;
                    return updated;
                });
            },
            (fullResponse) => {
                setIsStreaming(false);
            },
            (err) => {
                setError(err.message);
                setIsStreaming(false);
                // Remove the failed assistant message
                setMessages(prev => prev.slice(0, -1));
            }
        );
    };

    const handlePromptClick = (prompt) => {
        handleSendMessage(prompt);
    };

    if (!config) {
        return (
            <div className="ai-page safe-bottom">
                <div className="ai-empty safe-top">
                    <div className="ai-empty__icon">
                        <img src="/vibe-ai.png" alt="Vibe AI" style={{ width: '100px', height: '100px', borderRadius: '50%', boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' }} />
                    </div>
                    <h2>Vibe AI</h2>
                    <p>Your intelligent music companion is standing by.</p>

                    <div className="ai-superpowers">
                        <div className="superpower">
                            <span className="superpower__icon">📊</span>
                            <div className="superpower__text">
                                <strong>Discover Your Taste</strong>
                                <p>Get deep analysis and personalized recommendations based on your listening history.</p>
                            </div>
                        </div>
                        <div className="superpower">
                            <span className="superpower__icon">✨</span>
                            <div className="superpower__text">
                                <strong>Mood Magic</strong>
                                <p>Describe your vibe or mood to create the perfect instant playback queue.</p>
                            </div>
                        </div>
                        <div className="superpower">
                            <span className="superpower__icon">🔍</span>
                            <div className="superpower__text">
                                <strong>Smart Search</strong>
                                <p>Find songs using natural questions like "What was that upbeat jazz track I liked?"</p>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary ai-config-btn" onClick={() => setShowConfig(true)}>
                        Unlock Superpowers
                    </button>
                </div>

                {showConfig && <ConfigModal onClose={() => setShowConfig(false)} onSave={() => { setShowConfig(false); loadConfig(); }} />}
            </div>
        );
    }

    return (
        <div className="ai-page safe-bottom">
            <header className="ai-header safe-top">
                <h1>Vibe AI</h1>
                <button className="btn-icon" onClick={() => setShowConfig(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" strokeWidth="2" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="2" />
                    </svg>
                </button>
            </header>

            <div className="ai-content">
                {messages.length === 0 ? (
                    <div className="ai-welcome">
                        <h2>Ask me anything about your music!</h2>
                        <div className="suggested-prompts">
                            {suggestedPrompts.map((prompt, index) => (
                                <button
                                    key={index}
                                    className="prompt-chip"
                                    onClick={() => handlePromptClick(prompt)}
                                    disabled={isStreaming}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="ai-messages">
                        {messages.map((message, index) => (
                            <div key={index} className={`message message--${message.role}`}>
                                <div className="message__avatar">
                                    {message.role === 'user' ? '👤' : <img src="/vibe-ai.png" alt="AI" className="avatar-img" />}
                                </div>
                                <div
                                    className="message__content"
                                    dangerouslySetInnerHTML={{
                                        __html: marked.parse(message.content || '')
                                    }}
                                />
                                {index === messages.length - 1 && isStreaming && (
                                    <span className="message__cursor">▊</span>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {error && (
                    <div className="ai-error">
                        <span>⚠️ {error}</span>
                    </div>
                )}
            </div>

            <div className={`ai-input-container ${hasMiniPlayer ? 'has-mini-player' : ''}`}>
                <div className="ai-input">
                    <input
                        type="text"
                        placeholder="Ask about your music..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(input)}
                        disabled={isStreaming}
                    />
                    <button
                        className="send-btn"
                        onClick={() => handleSendMessage(input)}
                        disabled={!input.trim() || isStreaming}
                    >
                        {isStreaming ? (
                            <div className="spinner-sm"></div>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {showConfig && <ConfigModal onClose={() => setShowConfig(false)} onSave={() => { setShowConfig(false); loadConfig(); }} />}
        </div>
    );
};

const ConfigModal = ({ onClose, onSave }) => {
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gpt-4o-mini');
    const [baseUrl, setBaseUrl] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        loadExisting();
    }, []);

    const loadExisting = async () => {
        const config = await getAIConfig();
        if (config) {
            setProvider(config.provider);
            setApiKey(config.apiKey);
            setModel(config.model);
            setBaseUrl(config.baseUrl || '');
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);

        const result = await testAIConnection({ provider, apiKey, model, baseUrl });
        setTestResult(result);
        setIsTesting(false);
    };

    const handleSave = async () => {
        await saveAIConfig({ provider, apiKey, model, baseUrl: baseUrl || undefined });
        onSave();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Vibe AI Settings</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label>Provider</label>
                        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                            <option value="openai">OpenAI</option>
                            <option value="gemini">Google Gemini</option>
                        </select>
                    </div>

                    {provider === 'openai' && (
                        <div className="form-group">
                            <label>Base URL (Optional)</label>
                            <input
                                type="text"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="Leave empty for OpenAI, or e.g. https://api.deepseek.com/v1"
                            />
                            <small style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: '4px', display: 'block' }}>
                                For DeepSeek, Groq, or other OpenAI-compatible APIs
                            </small>
                        </div>
                    )}

                    <div className="form-group">
                        <label>API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={provider === 'openai' ? 'sk-...' : 'AIza...'}
                        />
                    </div>

                    <div className="form-group">
                        <label>Model</label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'gemini-pro'}
                        />
                    </div>

                    {testResult && (
                        <div className={`test-result test-result--${testResult.success ? 'success' : 'error'}`}>
                            {testResult.message}
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleTest} disabled={isTesting || !apiKey}>
                        {isTesting ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!apiKey}>Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default AI;
