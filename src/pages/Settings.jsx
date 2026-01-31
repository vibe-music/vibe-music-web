import { safeStorage } from '../utils/safeStorage';
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import TopRightProfile from '../components/Layout/TopRightProfile';
import { downloadBackup, importFromFile } from '../utils/backup';
import { scanLibraryHealth } from '../utils/urlHealth';
import { getCacheSize, clearAudioCache, getCachedSongs } from '../utils/audioCache';
import { getAIConfig } from '../utils/aiConfig';
import { getSetting, saveSetting } from '../utils/storage';
import { performSync, getPayloadSize } from '../utils/cloudSync';
import { vibeSyncService } from '../utils/vibeSyncService';
import { showToast } from '../utils/toast';
import { useOnboarding } from '../context/OnboardingContext';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useNavigate } from 'react-router-dom';
import LogoutConfirmationModal from '../components/Modals/LogoutConfirmationModal';
import './Settings.css';

const PayPalButtonWrapper = ({ plan, onSuccess }) => {
    return (
        <PayPalButtons
            createOrder={async () => {
                try {
                    const data = await vibeSyncService.createPaymentOrder(plan);
                    return data.id;
                } catch (error) {
                    showToast.error(`Failed to start payment: ${error.message}`);
                    throw error;
                }
            }}
            onApprove={async (data) => {
                try {
                    const result = await vibeSyncService.capturePaymentOrder(data.orderID, plan);
                    if (result.message === 'Subscription activated') {
                        onSuccess(result.user);
                    } else {
                        showToast.error(`Payment failed: ${result.message}`);
                    }
                } catch (error) {
                    showToast.error(`Capture failed: ${error.message}`);
                }
            }}
            style={{ layout: "horizontal", height: 35 }}
        />
    );
};

const Settings = () => {
    const navigate = useNavigate();
    const { user, isPro, refreshUser } = useUser();
    const { startTour } = useOnboarding();
    const [cacheSize, setCacheSize] = useState(0);
    const [cachedCount, setCachedCount] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [isClearing, setIsClearing] = useState(false);
    const [hasAI, setHasAI] = useState(true);

    // VibeSync State
    const { isAuthModalOpen, setIsAuthModalOpen, authMode, setAuthMode, isAuthenticated } = useUser();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');
    const [lastSyncDate, setLastSyncDate] = useState(null);
    const [payloadSize, setPayloadSize] = useState('0');
    const [localStats, setLocalStats] = useState({ albums: 0, songs: 0, playlists: 0 });
    const [syncHistory, setSyncHistory] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('yearly');
    const [showPayPal, setShowPayPal] = useState(false);
    const [storageLimit, setStorageLimit] = useState(parseInt(safeStorage.getItem('vibe_storage_limit', '200')));

    useEffect(() => {
        loadCacheInfo();
        checkAIConfig();
        loadVibeSyncStatus();

        const handleSyncUpdate = () => {
            console.log('[Settings] Sync event detected, refreshing status...');
            loadVibeSyncStatus();
        };

        window.addEventListener('vibesync-completed', handleSyncUpdate);
        return () => window.removeEventListener('vibesync-completed', handleSyncUpdate);
    }, [isAuthenticated]);

    const loadVibeSyncStatus = async () => {
        const lastSync = await getSetting('lastSyncDate', null);
        setLastSyncDate(lastSync);
        const bytes = await getPayloadSize();
        setPayloadSize((bytes / 1024).toFixed(1)); // Convert to KB

        // Fetch local library elaborate stats
        const [albums, songs, playlists] = await Promise.all([
            import('../utils/storage').then(m => m.getAllAlbums()),
            import('../utils/storage').then(m => m.getAllSongs()),
            import('../utils/storage').then(m => m.getAllPlaylists())
        ]);
        setLocalStats({
            albums: albums.length,
            songs: songs.length,
            playlists: playlists.length
        });


        if (isAuthenticated) {
            fetchSyncHistory();
        }
    };

    const fetchSyncHistory = async () => {
        if (!isAuthenticated) return;
        setIsHistoryLoading(true);
        try {
            const history = await vibeSyncService.getSyncHistory();
            if (Array.isArray(history)) {
                setSyncHistory(history);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        vibeSyncService.logout();
        setSyncHistory([]);
        setShowLogoutConfirm(false);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncProgress('Starting VibeSync...');

        try {
            const result = await performSync((msg) => {
                setSyncProgress(msg);
            });

            setLastSyncDate(result.timestamp);
            const bytes = await getPayloadSize();
            setPayloadSize((bytes / 1024).toFixed(1));

            // Update local stats after sync
            setLocalStats({
                albums: result.albumsCount || 0,
                songs: result.songsCount || 0,
                playlists: result.playlistsCount || 0
            });

            fetchSyncHistory();

            showToast.success('Sync successful! VibeSync updated.');
        } catch (error) {
            showToast.error(`VibeSync failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
            setSyncProgress('');
        }
    };

    const handleRestore = async (versionId) => {
        if (!confirm('Are you sure you want to restore this version? Your current local data will be updated.')) {
            return;
        }

        setIsRestoring(versionId);
        try {
            const result = await vibeSyncService.restoreVersion(versionId);
            if (result.data) {
                // Here you would trigger a full app reload or re-save all items
                // For now, let's just alert success
                showToast.success('Version restored! Refreshing...');
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            showToast.error(`Restore failed: ${error.message}`);
        } finally {
            setIsRestoring(null);
        }
    };

    const checkAIConfig = async () => {
        const config = await getAIConfig();
        setHasAI(!!config?.apiKey);
    };

    const loadCacheInfo = async () => {
        try {
            const size = await getCacheSize();
            const cached = await getCachedSongs();
            setCacheSize(size);
            setCachedCount(cached.length);
        } catch (error) {
            console.error('Error loading cache info:', error);
        }
    };

    const handleExport = async () => {
        try {
            await downloadBackup();
            showToast.success('Backup downloaded');
        } catch (error) {
            showToast.error(`Export failed: ${error.message}`);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const loadingToast = showToast.loading('Importing library...');
            const result = await importFromFile(file);
            showToast.dismiss(loadingToast);
            showToast.success(`Imported ${result.albumsImported} albums and ${result.songsImported} songs`);
        } catch (error) {
            showToast.error(`Import failed: ${error.message}`);
        }

        // Reset file input
        e.target.value = '';
    };

    const handleScanUrls = async () => {
        setIsScanning(true);
        setScanResults(null);
        setScanProgress(0);

        try {
            const results = await scanLibraryHealth((progress) => {
                setScanProgress(progress.progress);
            });
            setScanResults(results);
            if (results.unhealthy > 0) {
                showToast.warning(`Scan complete: ${results.unhealthy} issues found`);
            } else {
                showToast.success('Scan complete: Library is healthy!');
            }
        } catch (error) {
            showToast.error(`Scan failed: ${error.message}`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleClearCache = async () => {
        if (!confirm('Clear all cached audio? This will remove offline downloads.')) {
            return;
        }

        setIsClearing(true);
        try {
            await clearAudioCache();
            await loadCacheInfo();
            showToast.success('Cache cleared successfully');
        } catch (error) {
            showToast.error(`Failed to clear cache: ${error.message}`);
        } finally {
            setIsClearing(false);
        }
    };

    const handleStorageLimitChange = (e) => {
        const value = parseInt(e.target.value);
        setStorageLimit(value);
        safeStorage.setItem('vibe_storage_limit', value.toString());
    };

    const formatSize = (kb) => {
        const val = parseFloat(kb);
        if (isNaN(val)) return '0 KB';
        if (val > 1024) return (val / 1024).toFixed(1) + ' MB';
        return val.toFixed(1) + ' KB';
    };

    const showTutorialLink = () => {
        const firstVisit = safeStorage.getItem('vibe_first_visit');
        if (!firstVisit) return false;
        const diff = Date.now() - parseInt(firstVisit);
        const days = diff / (1000 * 60 * 60 * 24);
        return days <= 7;
    };

    return (
        <div className="settings safe-bottom">
            <header className="settings-header safe-top">
                <div className="settings-header__title-row">
                    <h1>Settings</h1>
                    <TopRightProfile />
                </div>
                <p>Personalize your vibe and manage your data</p>
            </header>

            <PayPalScriptProvider options={{
                "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
                currency: "USD",
                intent: "capture"
            }}>
                <div className="settings-content">
                    {/* Onboarding / Tutorial (Only for first 7 days) */}
                    {showTutorialLink() && (
                        <div className="settings-section animate-slide-up">
                            <div className="section-header">
                                <h2 className="section-title">Tutorial</h2>
                            </div>
                            <div className="settings-card tutorial-card">
                                <div className="settings-item">
                                    <div className="settings-item-info">
                                        <div className="settings-item-label">Interactive Onboarding</div>
                                        <div className="settings-item-description">
                                            Restart the guided tour to learn the basics.
                                        </div>
                                        <div className="tutorial-expiry-banner">
                                            <div className="expiry-banner-icon">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <polyline points="12 6 12 12 16 14" />
                                                </svg>
                                            </div>
                                            <span>Available for your first 7 days</span>
                                            <div className="expiry-badge">Temporary</div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            navigate('/');
                                            setTimeout(() => startTour(false), 500);
                                        }}
                                    >
                                        Start
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* 1. VibeSync (Moved to Top) */}
                    <div className="settings-card vibesync-card animate-slide-up">
                        <div className="card-header">
                            <div className="card-title-group">
                                <div className="card-icon">🔐</div>
                                <div>
                                    <h2>VibeSync</h2>
                                    <p className="card-subtitle">Secure cloud sync & version control</p>
                                </div>
                            </div>
                            {isAuthenticated && (
                                <div className="payload-indicator">
                                    {formatSize(payloadSize)}
                                </div>
                            )}
                        </div>

                        {!isAuthenticated ? (
                            <div className="vibesync-promo">
                                <div className="vibesync-promo__main">
                                    <div className="vibesync-promo__text">
                                        <h3>Sync Across All Devices</h3>
                                        <p>Never lose your library again. Access your vibes on any device, anywhere.</p>
                                    </div>
                                    <div className="vibesync-promo__pricing-minimal">
                                        <div
                                            className={`price-item ${selectedPlan === 'monthly' ? 'selected' : ''}`}
                                            onClick={() => setSelectedPlan('monthly')}
                                        >
                                            <span className="p-label">Monthly</span>
                                            <span className="p-val">$1.99</span>
                                        </div>
                                        <div
                                            className={`price-item featured ${selectedPlan === 'yearly' ? 'selected' : ''}`}
                                            onClick={() => setSelectedPlan('yearly')}
                                        >
                                            <span className="p-label">Yearly</span>
                                            <span className="p-val">$19.99</span>
                                            <span className="p-tag">BEST VALUE</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Pro Features List - Pre-Login */}
                                <div className="pro-features-list">
                                    <ul>
                                        <li><span className="chk">✓</span> Cross-device syncing & Unlimited devices</li>
                                        <li><span className="chk">✓</span> 3-version rollback history</li>
                                        <li><span className="chk">✓</span> Exclusive Vibe Mode functionality</li>
                                        <li><span className="chk">✓</span> Unlimited Radio Stations</li>
                                        <li><span className="chk">✓</span> Early access to mobile applications</li>
                                        <li><span className="chk">✓</span> Priority support & hidden features</li>
                                    </ul>
                                </div>

                                <div className="vibesync-promo__actions">
                                    <button className="btn btn-primary" onClick={() => { setAuthMode('register'); setIsAuthModalOpen(true); }}>
                                        Get VibeSync Pro
                                    </button>
                                    <button className="btn btn-ghost" onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}>
                                        Sign In
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="vibesync-dashboard">
                                <div className="vibesync-user-brief">
                                    <div className="user-meta-premium no-avatar">
                                        <div className="name-row">
                                            <h3>{user?.name || 'VibeSync User'}</h3>
                                            <span className={`plan-pill ${isPro ? 'pro' : 'free'}`}>
                                                {isPro ? 'PRO' : 'FREE'}
                                            </span>
                                        </div>
                                        <p className="email-sub">{user?.email}</p>
                                    </div>
                                </div>

                                {!isPro ? (
                                    <div className="upgrade-teaser">
                                        <div className="teaser-content">
                                            <div className="teaser-icon">💎</div>
                                            <div className="teaser-text">
                                                <h3>Upgrade to Pro</h3>
                                                <p>Unlock 3-version rollback & priority sync</p>
                                            </div>
                                        </div>

                                        {!showPayPal ? (
                                            <div className="selection-stage animate-fade-in">

                                                {/* Pro Features List - Post-Login Inline */}
                                                <div className="pro-features-list compact">
                                                    <ul>
                                                        <li><span className="chk">✓</span> Cross-device syncing & Unlimited devices</li>
                                                        <li><span className="chk">✓</span> 3-version rollback history</li>
                                                        <li><span className="chk">✓</span> Vibe Mode & Unlimited Radio</li>
                                                        <li><span className="chk">✓</span> Early access to mobile applications</li>
                                                    </ul>
                                                </div>

                                                <div className="plan-selection-grid">
                                                    <div
                                                        className={`plan-card-premium ${selectedPlan === 'monthly' ? 'is-selected' : ''}`}
                                                        onClick={() => setSelectedPlan('monthly')}
                                                    >
                                                        <div className="plan-card-header">
                                                            <span className="p-title">Monthly</span>
                                                            <span className="p-price">$1.99</span>
                                                        </div>
                                                        <p className="p-desc">Perfect for trying out VibeSync</p>
                                                    </div>
                                                    <div
                                                        className={`plan-card-premium featured ${selectedPlan === 'yearly' ? 'is-selected' : ''}`}
                                                        onClick={() => setSelectedPlan('yearly')}
                                                    >
                                                        <div className="plan-card-tag">Great Choice</div>
                                                        <div className="plan-card-header">
                                                            <span className="p-title">Yearly</span>
                                                            <span className="p-price">$19.99</span>
                                                        </div>
                                                        <p className="p-desc">Save 15% with annual billing</p>
                                                        <div className="plan-card-badge">BEST VALUE</div>
                                                    </div>
                                                </div>

                                                <button
                                                    className="btn btn-primary btn-full checkout-cta-btn"
                                                    onClick={() => setShowPayPal(true)}
                                                >
                                                    {selectedPlan === 'yearly' ? 'Great Choice! Get Yearly Pro • $19.99' : 'Upgrade Monthly • $1.99'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="checkout-stage animate-slide-up">
                                                <div className="checkout-header">
                                                    <button className="btn-back-selection" onClick={() => setShowPayPal(false)}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <path d="M19 12H5M12 19l-7-7 7-7" />
                                                        </svg>
                                                        Change Plan
                                                    </button>
                                                    <div className="selected-plan-pill">
                                                        {selectedPlan === 'yearly' ? 'VibeSync Yearly ($19.99)' : 'VibeSync Monthly ($1.99)'}
                                                    </div>
                                                </div>
                                                <div className="paypal-container-premium">
                                                    <PayPalButtonWrapper plan={selectedPlan} onSuccess={() => {
                                                        refreshUser();
                                                        loadVibeSyncStatus();
                                                        showToast.success('VibeSync Pro Activated! Great choice.');
                                                    }} />
                                                </div>
                                                <p className="checkout-footer-text">Secure transaction via PayPal</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="pro-status-banner">
                                        <div className="pro-glow"></div>
                                        <div className="pro-content">
                                            <div className="pro-icon">🏆</div>
                                            <div className="pro-text">
                                                <strong>Pro Subscription Active</strong>
                                                <span>Renews on {new Date(user.subscription.expiresAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="sync-controls-premium">
                                    <div className="sync-stats-row">
                                        <div className="s-stat">
                                            <span className="l">Last Sync</span>
                                            <span className="v">{lastSyncDate ? new Date(lastSyncDate).toLocaleDateString() : 'Never'}</span>
                                        </div>
                                        <div className="s-stat">
                                            <span className="l">Size</span>
                                            <span className="v">{formatSize(payloadSize)}</span>
                                        </div>
                                    </div>
                                    <button
                                        className={`btn btn-primary btn-full sync-btn ${isSyncing ? 'is-loading' : ''}`}
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                    >
                                        {isSyncing ? (
                                            <div className="sync-spinner-row">
                                                <div className="spinner-sm"></div>
                                                <span>{syncProgress || 'Syncing...'}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Sync Now
                                            </>
                                        )}
                                    </button>

                                    <button
                                        className="btn btn-ghost btn-full support-btn"
                                        onClick={() => navigate('/support')}
                                        style={{ marginTop: '12px', opacity: 0.8 }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        Contact Priority Support
                                    </button>
                                </div>

                                {/* Elaborate Current Stats */}
                                <div className="current-library-stats">
                                    <div className="l-stat">
                                        <span className="v">{localStats.albums}</span>
                                        <span className="l">Albums</span>
                                    </div>
                                    <div className="l-stat">
                                        <span className="v">{localStats.songs}</span>
                                        <span className="l">Songs</span>
                                    </div>
                                    <div className="l-stat">
                                        <span className="v">{localStats.playlists}</span>
                                        <span className="l">Playlists</span>
                                    </div>
                                </div>

                                {isPro && (
                                    <div className="history-drawer">
                                        <div className="history-drawer-header">
                                            <h4>Version History</h4>
                                            {isHistoryLoading && <div className="spinner-xs"></div>}
                                        </div>

                                        {syncHistory.length > 0 ? (
                                            <div className={`history-list-compact ${isHistoryLoading ? 'loading-fade' : ''}`}>
                                                {syncHistory.slice(0, 3).map((version, index) => {
                                                    const isLatest = index === 0;
                                                    const isDaily = !isLatest && (new Date(syncHistory[0].timestamp) - new Date(version.timestamp)) >= 24 * 60 * 60 * 1000;
                                                    const isWeekly = !isLatest && (new Date(syncHistory[0].timestamp) - new Date(version.timestamp)) >= 7 * 24 * 60 * 60 * 1000;

                                                    let typeLabel = "Recent";
                                                    if (isLatest) typeLabel = "Current";
                                                    else if (isWeekly) typeLabel = "Weekly";
                                                    else if (isDaily) typeLabel = "Daily";

                                                    return (
                                                        <div key={version._id} className={`history-item-premium ${isLatest ? 'is-current' : ''}`}>
                                                            <div className="v-header">
                                                                <span className="v-badge">{typeLabel}</span>
                                                                <span className="v-date">{new Date(version.timestamp).toLocaleString(undefined, {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}</span>
                                                            </div>
                                                            <div className="v-stats">
                                                                <div className="v-stat-unit">
                                                                    <span className="v-val">{version.stats?.albums || 0}</span>
                                                                    <span className="v-lab">Albums</span>
                                                                </div>
                                                                <div className="v-stat-unit">
                                                                    <span className="v-val">{version.stats?.songs || 0}</span>
                                                                    <span className="v-lab">Songs</span>
                                                                </div>
                                                                <div className="v-stat-unit">
                                                                    <span className="v-val">{version.stats?.playlists || 0}</span>
                                                                    <span className="v-lab">Playlists</span>
                                                                </div>
                                                            </div>
                                                            {!isLatest && (
                                                                <button
                                                                    className="btn btn-secondary btn-sm restore-action-btn"
                                                                    onClick={() => handleRestore(version._id)}
                                                                    disabled={isRestoring === version._id}
                                                                >
                                                                    {isRestoring === version._id ? (
                                                                        <div className="spinner-xs"></div>
                                                                    ) : 'Restore Version'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="no-history-fallback">
                                                <div className="no-history-icon">🕒</div>
                                                <p>{isHistoryLoading ? 'Fetching version history...' : 'No recovery points found. Perform a sync to start versioning.'}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. Library Health */}
                    <div className="settings-card health-card">
                        <div className="card-header-simple">
                            <h2>Library Health</h2>
                            <p>Check for broken song links</p>
                        </div>

                        <button
                            className={`btn btn-secondary btn-full ${isScanning ? 'is-loading' : ''}`}
                            onClick={handleScanUrls}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <div className="sync-spinner-row">
                                    <div className="spinner-sm"></div>
                                    <span>Scanning {scanProgress.toFixed(0)}%</span>
                                </div>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Scan for Issues
                                </>
                            )}
                        </button>

                        {scanResults && (
                            <div className="health-results-preview animate-fade-in">
                                <div className="h-stat healthy">
                                    <span className="h-val">{scanResults.healthy}</span>
                                    <span className="h-lab">Good</span>
                                </div>
                                <div className={`h-stat ${scanResults.unhealthy > 0 ? 'issues' : 'healthy'}`}>
                                    <span className="h-val">{scanResults.unhealthy}</span>
                                    <span className="h-lab">Issues</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Vibe AI */}
                    <div
                        className={`settings-card ai-card-refined ${!hasAI ? 'promo-variant' : ''}`}
                        onClick={!hasAI ? () => navigate('/ai') : undefined}
                    >
                        <div className="ai-refined-content">
                            <div className="ai-refined-icon">✨</div>
                            <div className="ai-refined-text">
                                <h3>Vibe AI</h3>
                                <p>{hasAI ? 'Active' : 'Get smart recommendations'}</p>
                            </div>
                            <div className="ai-refined-arrow">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M9 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* 4. Cache Management */}
                    <div className="settings-card cache-card">
                        <div className="card-header-simple">
                            <h2>Storage & Cache</h2>
                            <p>Manage offline song storage</p>
                        </div>

                        <div className="cache-stats-grid">
                            <div className="c-stat">
                                <span className="l">Songs Cached</span>
                                <span className="v">{cachedCount}</span>
                            </div>
                            <div className="c-stat">
                                <span className="l">Storage Used</span>
                                <span className="v">{formatSize(cacheSize / 1024)}</span>
                            </div>
                        </div>

                        <div className="cache-controls">
                            <div className="control-group">
                                <div className="slider-header-row">
                                    <label>Storage Limit</label>
                                    <span className="limit-val">{storageLimit}MB</span>
                                </div>
                                <input
                                    type="range"
                                    min="50"
                                    max="1000"
                                    step="50"
                                    value={storageLimit}
                                    onChange={handleStorageLimitChange}
                                    className="modern-slider"
                                />
                            </div>
                            <button className="btn btn-ghost danger-text" onClick={handleClearCache} disabled={isClearing}>
                                {isClearing ? 'Clearing...' : 'Clear All Cache'}
                            </button>
                        </div>
                    </div>

                    {/* 5. Backup & Restore (Moved to Bottom) */}
                    <div className="settings-card backup-card">
                        <div className="card-header-simple">
                            <h2>Data Backup</h2>
                            <p>Keep a manual copy of your library</p>
                        </div>
                        <div className="backup-actions-grid">
                            <button className="btn btn-secondary" onClick={handleExport}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Export
                            </button>
                            <label className="btn btn-secondary clickable">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Import
                                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {/* 6. About */}
                    <div className="settings-footer-about">
                        <p>Vibe Music v1.3.0</p>
                        <p className="made-with">Made with 💜 for the music vibes</p>
                    </div>
                </div>

                <LogoutConfirmationModal
                    isOpen={showLogoutConfirm}
                    onClose={() => setShowLogoutConfirm(false)}
                    onConfirm={confirmLogout}
                />
            </PayPalScriptProvider>
        </div>
    );
};

export default Settings;
