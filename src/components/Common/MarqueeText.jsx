import React, { useState, useEffect, useRef } from 'react';
import './MarqueeText.css';

const MarqueeText = ({ text, className = '', speed = 25, minLength = 0 }) => {
    const [isOverflowing, setIsOverflowing] = useState(false);
    const containerRef = useRef(null);
    const textRef = useRef(null);

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                const isOverflow = textRef.current.offsetWidth > containerRef.current.offsetWidth;
                const exceedsMinLength = text.length > minLength;
                setIsOverflowing(isOverflow && exceedsMinLength);
            }
        };

        checkOverflow();

        // Check on resize and text change
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [text, minLength]);

    return (
        <div
            className={`marquee-container ${className} ${isOverflowing ? 'overflowing' : ''}`}
            ref={containerRef}
            title={text}
        >
            <div
                className="marquee-content"
                ref={textRef}
                style={{
                    animationDuration: isOverflowing ? `${textRef.current?.offsetWidth / speed}s` : '0s'
                }}
            >
                {text}
                {isOverflowing && <span className="marquee-spacer"></span>}
                {isOverflowing && <span>{text}</span>}
            </div>
        </div>
    );
};

export default MarqueeText;
