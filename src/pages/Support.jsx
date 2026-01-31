import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initCrisp, openCrispChat, closeCrispChat, setCrispUser } from '../utils/crisp';
import { useUser } from '../context/UserContext';
import './Support.css';

const Support = () => {
    const navigate = useNavigate();
    const { user, isPro } = useUser();

    useEffect(() => {
        if (isPro) {
            // Initialize on-demand
            initCrisp();
            setCrispUser(user);

            // Automatically open chat when entering the support page
            openCrispChat();
        }

        return () => {
            // Close chat when leaving the page to keep the main UI clean
            closeCrispChat();
        };
    }, [isPro, user]);

    const handleBack = () => {
        navigate('/settings');
    };

    if (!isPro) {
        return (
            <div className="support-page safe-area animate-fade-in">
                <div className="support-page__header">
                    <button className="btn-icon" onClick={handleBack}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <h1>Priority Support</h1>
                </div>

                <div className="support-page__locked-content">
                    <div className="locked-icon">💎</div>
                    <h2>Pro Feature</h2>
                    <p>Priority chat support is exclusive to VibeSync Pro users.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/settings')}>
                        Upgrade to Pro
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="support-page safe-area animate-fade-in">
            <div className="support-page__header">
                <button className="btn-icon" onClick={handleBack}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1>Contact Support</h1>
            </div>

            <div className="support-page__content">
                <div className="support-hero">
                    <div className="support-icon">💬</div>
                    <h2>How can we help?</h2>
                    <p>Our priority chat is now open in the bottom right corner.</p>
                </div>

                <div className="support-cards">
                    <div className="support-card glass" onClick={openCrispChat}>
                        <div className="s-card-icon">⚡</div>
                        <div className="s-card-text">
                            <h3>Live Chat</h3>
                            <p>Instant support from our core team.</p>
                        </div>
                    </div>
                </div>

                <div className="support-footer">
                    <p>Alternatively, email us at <a href="mailto:support@vibemusic.fm">support@vibemusic.fm</a></p>
                </div>
            </div>
        </div>
    );
};

export default Support;
