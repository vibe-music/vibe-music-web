import React, { createContext, useContext } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

const AudioPlayerContext = createContext(null);

export const usePlayer = () => {
    const context = useContext(AudioPlayerContext);
    if (!context) {
        throw new Error('usePlayer must be used within AudioPlayerProvider');
    }
    return context;
};

export const AudioPlayerProvider = ({ children }) => {
    const player = useAudioPlayer();

    return (
        <AudioPlayerContext.Provider value={player}>
            {children}
        </AudioPlayerContext.Provider>
    );
};
