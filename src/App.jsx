import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { UserProvider } from './context/UserContext';
import { OnboardingProvider } from './context/OnboardingContext';
import AppLayout from './components/Layout/AppLayout';
import Home from './pages/Home';
import Library from './pages/Library';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import AI from './pages/AI';
import AlbumDetail from './components/Album/AlbumDetail';
import PlaylistDetail from './pages/PlaylistDetail';
import Support from './pages/Support';
import FullPlayer from './components/Player/FullPlayer';
import { Toaster } from 'sonner';
import OnboardingTour from './components/Onboarding/OnboardingTour';
import * as Sentry from "@sentry/react";
import './App.css';

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <AudioPlayerProvider>
        <OnboardingProvider>
          <UserProvider>
            <Router>
              <AppLayout>
                <Toaster
                  position="bottom-center"
                  expand={false}
                  richColors
                  closeButton
                  theme="dark"
                />
                <OnboardingTour />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/ai" element={<AI />} />
                  <Route path="/album/:albumId" element={<AlbumDetail />} />
                  <Route path="/playlist/:playlistId" element={<PlaylistDetail />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/player" element={<FullPlayer />} />
                </Routes>
              </AppLayout>
            </Router>
          </UserProvider>
        </OnboardingProvider>
      </AudioPlayerProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
