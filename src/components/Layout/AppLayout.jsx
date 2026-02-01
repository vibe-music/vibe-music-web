import React from 'react';
import { useLocation } from 'react-router-dom';
import MiniPlayer from '../Player/MiniPlayer';
import BottomNav from './BottomNav';
import InstallPrompt from '../PWA/InstallPrompt';
import VibeSyncAuthModal from '../Modals/VibeSyncAuthModal';
import RadioExitModal from '../Modals/RadioExitModal';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnboarding } from '../../context/OnboardingContext';
import { usePlayer } from '../../context/AudioPlayerContext';
import './AppLayout.css';

const AppLayout = ({ children }) => {
    const location = useLocation();
    const isPlayerPage = location.pathname === '/player';
    const { showPrompt, isIOS, handleInstall, handleDismiss, canInstall } = usePWAInstall();
    const { run, onboardingAlreadyDone } = useOnboarding();
    const { showRadioExitPrompt, confirmRadioExit, cancelRadioExit } = usePlayer();

    // Only show PWA prompt if onboarding is NOT running and was ALREADY completed before this session
    const shouldShowPWA = showPrompt && !run && onboardingAlreadyDone;

    return (
        <div className="app-layout">
            <main className="app-content">
                {children}
            </main>

            {shouldShowPWA && (
                <InstallPrompt
                    isIOS={isIOS}
                    handleInstall={handleInstall}
                    handleDismiss={handleDismiss}
                    canInstall={canInstall}
                />
            )}

            {!isPlayerPage && (
                <>
                    <MiniPlayer />
                    <BottomNav />
                </>
            )}

            <VibeSyncAuthModal />

            {showRadioExitPrompt && (
                <RadioExitModal
                    onConfirm={confirmRadioExit}
                    onCancel={cancelRadioExit}
                />
            )}
        </div>
    );
};

export default AppLayout;
