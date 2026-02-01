import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../context/AudioPlayerContext';
import MarqueeText from '../Common/MarqueeText';
import './VibeModeOverlay.css';

const VibeModeOverlay = ({ onClose, characterIndex, onNextCharacter }) => {
    const { currentSong, isPlaying, togglePlayPause } = usePlayer();
    const [mood, setMood] = useState('normal');
    const [blobTransform, setBlobTransform] = useState({ x: 0, y: 0, scale: 1, rotate: 0 });

    // Random Mood & Movement Logic for Char 1 (Blob)
    useEffect(() => {
        if (characterIndex !== 0) {
            setBlobTransform({ x: 0, y: 0, scale: 1, rotate: 0 });
            return;
        }

        const moods = ['normal', 'wink', 'surprised', 'cool', 'happy', 'silly'];
        let timeoutId;

        const moveBlob = () => {
            // Random Mood (occassional)
            const nextMood = Math.random() > 0.6 ? moods[Math.floor(Math.random() * moods.length)] : 'normal';
            setMood(nextMood);

            // Mood duration varies
            const moodDuration = nextMood === 'normal' ? 0 : (1000 + Math.random() * 2000);
            if (nextMood !== 'normal') {
                setTimeout(() => setMood('normal'), moodDuration);
            }

            // Biological Movement
            // Large deliberate shifts (drift) + Rotation based on direction
            const nextX = Math.random() * 140 - 70;
            const nextY = Math.random() * 70 - 45;
            const nextScale = 0.85 + Math.random() * 0.45;
            const nextRotate = nextX * 0.15; // Lean into the move

            setBlobTransform({ x: nextX, y: nextY, scale: nextScale, rotate: nextRotate });

            // Variable delay for "Human" feel (1.5s to 4s)
            const delay = 1500 + Math.random() * 2500;
            timeoutId = setTimeout(moveBlob, delay);
        };

        moveBlob();
        return () => clearTimeout(timeoutId);
    }, [characterIndex]);

    const characters = [
        // 1. Groovy Blob - Now with more "soul"
        (
            <svg className="character-svg char-blob" viewBox="0 0 200 200">
                <defs>
                    <radialGradient id="blobGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--color-primary-light)" />
                        <stop offset="100%" stopColor="var(--color-primary)" />
                    </radialGradient>
                </defs>
                <path
                    className="dancing-part char-blob-body"
                    d="M50,150 Q20,150 20,100 Q20,20 100,20 Q180,20 180,100 Q180,150 150,150 Z"
                    fill="url(#blobGrad)"
                />
                <g className={`char-face mood-${mood}`}>
                    <g className="char-eyes">
                        <circle className="eye eye-l" cx="70" cy="80" r="12" fill="white" />
                        <circle className="eye eye-r" cx="130" cy="80" r="12" fill="white" />
                        <circle className="pupil pupil-l" cx="70" cy="80" r="5" fill="#000" />
                        <circle className="pupil pupil-r" cx="130" cy="80" r="5" fill="#000" />
                        <path className="wink-eye" d="M120,80 Q130,75 140,80" stroke="#000" strokeWidth="3" fill="none" />
                    </g>
                    <path className="char-mouth" d="M80,115 Q100,140 120,115" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
                </g>
                <path className="dancing-part char-blob-arm arm-left" d="M30,110 Q0,90 15,60" stroke="var(--color-primary-light)" strokeWidth="12" fill="none" strokeLinecap="round" />
                <path className="dancing-part char-blob-arm arm-right" d="M170,110 Q200,90 185,60" stroke="var(--color-primary-light)" strokeWidth="12" fill="none" strokeLinecap="round" />
            </svg>
        ),
        // 2. Chill Robot - Now with glowing panels
        (
            <svg className="character-svg char-robot" viewBox="0 0 200 200">
                <rect className="dancing-part robot-body" x="60" y="60" width="80" height="90" rx="15" fill="#334155" stroke="#475569" strokeWidth="4" />
                <rect className="robot-screen" x="70" y="75" width="60" height="40" rx="8" fill="#0f172a" />
                <g className="robot-eyes">
                    <rect className="eye-glow" x="78" y="85" width="12" height="12" rx="2" fill="#10B981" />
                    <rect className="eye-glow" x="110" y="85" width="12" height="12" rx="2" fill="#10B981" />
                </g>
                <rect className="robot-mouth-panel" x="85" y="125" width="30" height="6" rx="3" fill="#1e293b" />
                <path className="robot-antenna" d="M100,60 L100,35" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
                <circle className="antenna-light" cx="100" cy="30" r="6" fill="#ef4444" />
                <path className="dancing-part robot-arm arm-left" d="M60,100 L30,130" stroke="#64748b" strokeWidth="10" strokeLinecap="round" />
                <path className="dancing-part robot-arm arm-right" d="M140,100 L170,130" stroke="#64748b" strokeWidth="10" strokeLinecap="round" />
            </svg>
        ),
        // 3. PacMan (NEW) - "It should be the third one"
        (
            <svg className="character-svg char-pacman" viewBox="0 0 240 200">
                <g className="pacman-game">
                    <g className="pacman-body-group">
                        <circle className="dancing-part pacman-body" cx="60" cy="100" r="45" fill="#FFFF00" />
                        <path className="pacman-mouth" d="M60,100 L105,75 A45,45 0 0,1 105,125 Z" fill="#000" />
                    </g>
                    <g className="pacman-ghost">
                        <path className="ghost-body" d="M180,120 L180,80 A25,25 0 0,1 230,80 L230,120 L222,112 L214,120 L206,112 L198,120 L190,112 L182,120 Z" fill="#2196F3" />
                        <circle cx="195" cy="85" r="4" fill="#FFF" />
                        <circle cx="215" cy="85" r="4" fill="#FFF" />
                    </g>
                    <g className="pacman-pellets">
                        <circle className="pellet" cx="110" cy="100" r="5" fill="#FFD700" />
                        <circle className="pellet" cx="140" cy="100" r="5" fill="#FFD700" />
                    </g>
                </g>
            </svg>
        ),
        // 4. Dancing Duo - Improved Fighting/Dancing interactions
        (
            <svg className="character-svg char-duo" viewBox="0 0 240 200">
                <g className="duo-left">
                    <circle className="dancing-part duo-body" cx="60" cy="100" r="45" fill="#FFD93D" />
                    <g className="duo-face">
                        <circle cx="45" cy="90" r="4" fill="#000" />
                        <circle cx="75" cy="90" r="4" fill="#000" />
                        <path className="duo-mouth" d="M50,115 Q60,125 70,115" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                </g>
                <g className="duo-right">
                    <circle className="dancing-part duo-body" cx="180" cy="100" r="45" fill="#FF6B6B" />
                    <g className="duo-face">
                        <circle cx="165" cy="90" r="4" fill="#000" />
                        <circle cx="195" cy="90" r="4" fill="#000" />
                        <path className="duo-mouth" d="M170,115 Q180,125 190,115" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                </g>
                <path className="duo-spark" d="M120,80 L120,60 M140,90 L160,80 M100,90 L80,80" stroke="#FFF" strokeWidth="4" strokeLinecap="round" opacity="0" />
            </svg>
        ),
        // 5. Rocket Ship - Multi-layer fire
        (
            <svg className="character-svg char-rocket" viewBox="0 0 200 240">
                <g className="dancing-part rocket-group">
                    <path d="M100,20 Q130,60 130,120 L70,120 Q70,60 100,20" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="3" />
                    <rect x="75" y="120" width="50" height="20" fill="#EF4444" rx="5" />
                    <circle cx="100" cy="70" r="15" fill="#38B2AC" stroke="#2C7A7B" strokeWidth="4" />

                    {/* Move wings inside the group so they drift together */}
                    <rect className="rocket-wing" x="50" y="90" width="25" height="40" rx="5" fill="#EF4444" />
                    <rect className="rocket-wing" x="125" y="90" width="25" height="40" rx="5" fill="#EF4444" />

                    <g className="rocket-fire-group">
                        <path className="rocket-fire fire-outer" d="M80,140 Q100,220 120,140" fill="#FF4D00" />
                        <path className="rocket-fire fire-mid" d="M85,140 Q100,200 115,140" fill="#FF9900" />
                        <path className="rocket-fire fire-inner" d="M92,140 Q100,180 108,140" fill="#FFEA00" />
                    </g>
                </g>
            </svg>
        ),
        // 6. Dancing Star - Now with motion blur trails
        (
            <svg className="character-svg char-star" viewBox="0 0 200 200">
                <path
                    className="dancing-part star-body"
                    d="M100,10 L125,75 L190,75 L140,115 L160,185 L100,145 L40,185 L60,115 L10,75 L75,75 Z"
                    fill="#fbbf24"
                    stroke="#f59e0b"
                    strokeWidth="4"
                />
                <g className="star-face">
                    <circle cx="80" cy="100" r="6" fill="#000" />
                    <circle cx="120" cy="100" r="6" fill="#000" />
                    <path d="M85,125 Q100,145 115,125" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round" />
                </g>
                <circle className="star-glow" cx="100" cy="100" r="80" fill="url(#starGrad)" opacity="0.4" />
                <defs>
                    <radialGradient id="starGrad">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </radialGradient>
                </defs>
            </svg>
        )
    ];

    return (
        <div className={`vibe-mode-overlay animate-fade-in ${isPlaying ? 'is-playing' : 'is-paused'}`}>
            <div className="vibe-bg-glow"></div>
            <div className="vibe-particles">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="vibe-particle"></div>
                ))}
            </div>

            <div className="vibe-character-stage">
                <div
                    className={`character-motion-wrapper ${characterIndex === 0 ? 'is-blob' : ''}`}
                    style={characterIndex === 0 ? {
                        transform: `translate(${blobTransform.x}px, ${blobTransform.y}px) scale(${blobTransform.scale}) rotate(${blobTransform.rotate}deg)`
                    } : {}}
                >
                    {characters[characterIndex]}
                </div>
            </div>

            <div className="vibe-ui">
                <div className="vibe-song-info">
                    <MarqueeText text={currentSong.title} className="vibe-title-marquee" />
                    <p>{currentSong?.artist}</p>
                </div>

                <div className="vibe-controls">
                    <button className="vibe-btn vibe-btn--play" onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}>
                        {isPlaying ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            <div className="vibe-footer">
                <div className="char-switcher" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={onNextCharacter} aria-label="Next Character">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <div className="char-dots">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                            <span key={i} className={`char-dot ${i === characterIndex ? 'active' : ''}`}></span>
                        ))}
                    </div>
                </div>

                <button className="exit-vibe-btn" onClick={onClose}>
                    Exit Vibe Mode
                </button>
            </div>
        </div>
    );
};

export default VibeModeOverlay;
