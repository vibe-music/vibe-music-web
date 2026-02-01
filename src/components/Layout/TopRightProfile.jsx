import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { vibeSyncService } from '../../utils/vibeSyncService';
import SyncStatusIndicator from '../Sync/SyncStatusIndicator';
import MarqueeText from '../Common/MarqueeText';
import LogoutConfirmationModal from '../Modals/LogoutConfirmationModal';
import './TopRightProfile.css';

const TopRightProfile = () => {
    const { user, isAuthenticated, isPro, setIsAuthModalOpen, setAuthMode } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const toggleDropdown = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (path) => {
        setIsOpen(false);
        navigate(path);
    };

    const handleOpenAuth = (mode) => {
        setIsOpen(false);
        setAuthMode(mode);
        setIsAuthModalOpen(true);
    };

    const handleLogoutClick = () => {
        setIsOpen(false);
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        vibeSyncService.logout();
        setShowLogoutConfirm(false);
        navigate('/');
    };

    const renderAvatar = () => {
        if (!isAuthenticated) {
            return (
                <div className="profile-avatar dummy">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </div>
            );
        }

        if (user.picture) {
            return <img src={user.picture} alt={user.name} className="profile-avatar" />;
        }

        const initial = user.name ? user.name[0] : (user.email ? user.email[0] : '?');
        return (
            <div className="profile-avatar initials">
                {initial.toUpperCase()}
            </div>
        );
    };

    return (
        <div className="top-right-profile" ref={dropdownRef}>
            <div className="header-actions">
                <SyncStatusIndicator />
                <div className={`profile-trigger ${isOpen ? 'active' : ''}`} onClick={toggleDropdown}>
                    {renderAvatar()}
                </div>
            </div>

            {isOpen && (
                <div className="profile-dropdown animate-scale-in">
                    {isAuthenticated ? (
                        <div className="profile-info-section">
                            <div className="dropdown-user-header">
                                <div className="dropdown-avatar-container">
                                    {renderAvatar()}
                                    {isPro && <div className="pro-indicator-dot" title="Pro Member">💎</div>}
                                </div>
                                <div className="dropdown-user-details">
                                    <MarqueeText text={user.name || 'User'} className="user-name" />
                                    <MarqueeText text={user.email} className="user-email" />
                                    {isPro && <span className="user-plan-tag">PRO</span>}
                                </div>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item" onClick={() => handleAction('/settings')}>
                                <span className="item-icon">⚙️</span> Settings
                            </button>
                            <button className="dropdown-item logout-item" onClick={handleLogoutClick}>
                                <span className="item-icon">🚪</span> Logout
                            </button>
                        </div>
                    ) : (
                        <div className="profile-auth-section">
                            <p className="auth-teaser">Sync your music & settings across devices.</p>
                            <button className="btn-login-accent" onClick={() => handleOpenAuth('login')}>
                                Login / Sign Up
                            </button>
                        </div>
                    )}
                </div>
            )}

            <LogoutConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={confirmLogout}
            />
        </div>
    );
};

export default TopRightProfile;
