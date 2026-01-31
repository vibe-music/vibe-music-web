import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { vibeSyncService } from '../../utils/vibeSyncService';
import { showToast } from '../../utils/toast';

const VibeSyncAuthModal = () => {
    const { isAuthModalOpen, setIsAuthModalOpen, authMode, setAuthMode, refreshUser } = useUser();

    // Use local state for form inputs to avoid excessive context renders during typing
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthModalOpen) {
            handleGoogleLogin();
        }
    }, [isAuthModalOpen]);

    const handleGoogleLogin = () => {
        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                initiateGoogleFlow();
            };
            document.head.appendChild(script);
        } else {
            initiateGoogleFlow();
        }
    };

    const initiateGoogleFlow = () => {
        if (!window.google) return;
        try {
            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                callback: async (response) => {
                    setIsLoading(true);
                    try {
                        const result = await vibeSyncService.googleLogin(response.credential);
                        if (result.token) {
                            setIsAuthModalOpen(false);
                            refreshUser();
                        }
                    } catch (error) {
                        showToast.error(`Google Login Failed: ${error.message}`);
                    } finally {
                        setIsLoading(false);
                    }
                },
                auto_select: false,
                cancel_on_tap_outside: true
            });

            const buttonElement = document.getElementById('google-login-button-global');
            if (buttonElement) {
                window.google.accounts.id.renderButton(buttonElement, {
                    theme: 'outline',
                    size: 'large',
                    width: buttonElement.offsetWidth,
                    text: 'continue_with'
                });
            }

            window.google.accounts.id.prompt();
        } catch (error) {
            console.error('GIS Error:', error);
        }
    };

    if (!isAuthModalOpen) return null;

    return (
        <div className="auth-overlay animate-fade-in" onClick={() => setIsAuthModalOpen(false)}>
            <div className="auth-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="sheet-handle"></div>
                <div className="auth-sheet-header">
                    <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                    <p>Join the VibeSync community</p>
                </div>
                <div className="auth-sheet-body">
                    <div id="google-login-button-global" className="google-btn-full"></div>

                    <div className="auth-divider-text">
                        <span>COMING SOON</span>
                    </div>

                    <div className="legacy-auth-preview">
                        <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} disabled />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} disabled />
                        <button className="btn btn-primary btn-full disabled-btn">Continue</button>
                    </div>

                    <button className="btn-text btn-full auth-toggle" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                        {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VibeSyncAuthModal;
