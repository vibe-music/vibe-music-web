import React from 'react';
import './InstallPrompt.css';

const InstallPrompt = ({ isIOS, handleInstall, handleDismiss, canInstall }) => {
    return (
        <div className="install-prompt-overlay">
            <div className="install-prompt glass animate-slide-up">
                <div className="install-prompt__header">
                    <div className="install-prompt__icon">
                        <img src="/icon-192.png" alt="App Icon" />
                    </div>
                    <div className="install-prompt__text">
                        <h3>Install Vibe Music</h3>
                        <p>Add to your home screen for the best experience and offline playback.</p>
                    </div>
                    <button className="btn-close" onClick={handleDismiss} aria-label="Dismiss">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="install-prompt__content">
                    {isIOS ? (
                        <div className="ios-instructions">
                            <div className="instruction-step">
                                <span className="step-number">1</span>
                                <p>Tap the <strong>Share</strong> button <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ verticalAlign: 'middle' }}><path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12M16 6L12 2M12 2L8 6M12 2V15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> at the bottom of your browser.</p>
                            </div>
                            <div className="instruction-step">
                                <span className="step-number">2</span>
                                <p>Scroll down and select <strong>"Add to Home Screen"</strong> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ verticalAlign: 'middle' }}><path d="M12 5V19M5 12H19" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></p>
                            </div>
                        </div>
                    ) : (
                        <button className="btn btn-primary btn-install-prompt" onClick={handleInstall} disabled={!canInstall}>
                            Install Now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
