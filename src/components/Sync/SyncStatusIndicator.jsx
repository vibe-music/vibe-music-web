import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { requestSync } from '../../utils/cloudSync';
import './SyncStatusIndicator.css';

const SyncStatusIndicator = () => {
    const { isPro, isAuthenticated } = useUser();
    const [status, setStatus] = useState('idle'); // idle, syncing, success, error
    const [details, setDetails] = useState(null);
    const [error, setError] = useState(null);
    const [showPopover, setShowPopover] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !isPro) return;

        const handleSyncStarted = () => {
            setStatus('syncing');
            setError(null);
        };

        const handleSyncCompleted = (e) => {
            setStatus('success');
            setDetails(e.detail);
            // Revert back to idle after a while
            const timer = setTimeout(() => {
                setStatus('idle');
            }, 5000);
            return () => clearTimeout(timer);
        };

        const handleSyncError = (e) => {
            setStatus('error');
            setError(e.detail);
        };

        window.addEventListener('vibesync-started', handleSyncStarted);
        window.addEventListener('vibesync-completed', handleSyncCompleted);
        window.addEventListener('vibesync-error', handleSyncError);

        return () => {
            window.removeEventListener('vibesync-started', handleSyncStarted);
            window.removeEventListener('vibesync-completed', handleSyncCompleted);
            window.removeEventListener('vibesync-error', handleSyncError);
        };
    }, [isAuthenticated, isPro]);

    if (!isPro || !isAuthenticated) return null;
    if (status === 'idle' && !showPopover) return null;

    return (
        <div
            className={`sync-status-indicator sync-status--${status}`}
            onClick={() => setShowPopover(!showPopover)}
            title={status === 'syncing' ? 'Syncing your library...' : 'Sync Status'}
        >
            <div className="sync-icon-container">
                {status === 'syncing' ? (
                    <svg className="sync-icon-spin" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M21 21v-5h-5" />
                    </svg>
                ) : status === 'success' ? (
                    <svg className="sync-icon-success" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                ) : status === 'error' ? (
                    <svg className="sync-icon-error" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                ) : (
                    // Idle but popover open
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                )}
            </div>

            {showPopover && (
                <div className="sync-popover animate-scale-in" onClick={(e) => e.stopPropagation()}>
                    <div className="sync-popover-header">
                        <h4>VibeSync Status</h4>
                        <button className="btn-close-popover" onClick={() => setShowPopover(false)}>×</button>
                    </div>

                    {error ? (
                        <div className="sync-popover-error">
                            <p className="error-msg">Failed to sync: {error}</p>
                            <button className="btn-retry-sync" onClick={() => { setError(null); requestSync(0); }}>
                                Try Again Now
                            </button>
                        </div>
                    ) : details ? (
                        <div className="sync-popover-details">
                            <div className="detail-row">
                                <span className="label">Albums</span>
                                <span className="value">{details.albums}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Songs</span>
                                <span className="value">{details.songs}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Playlists</span>
                                <span className="value">{details.playlists}</span>
                            </div>
                            <div className="detail-footer">
                                <span>Last synced: {new Date(details.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="sync-popover-loading">
                            <div className="mini-spinner"></div>
                            <p>Sync is in progress...</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SyncStatusIndicator;
