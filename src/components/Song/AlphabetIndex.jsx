import React, { useEffect, useState, useRef } from 'react';
import './AlphabetIndex.css';

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const AlphabetIndex = ({ onLetterClick, currentLetter }) => {
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const handleLetterTouch = (e) => {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.dataset.letter) {
            onLetterClick(element.dataset.letter);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (element && element.dataset.letter) {
            onLetterClick(element.dataset.letter);
        }
    };

    return (
        <div
            className="alphabet-index"
            ref={containerRef}
            onTouchMove={handleLetterTouch}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
        >
            {ALPHABET.map((letter) => (
                <div
                    key={letter}
                    className={`alphabet-index__letter ${currentLetter === letter ? 'active' : ''}`}
                    data-letter={letter}
                    onClick={() => onLetterClick(letter)}
                >
                    {letter}
                </div>
            ))}
        </div>
    );
};

export default AlphabetIndex;
