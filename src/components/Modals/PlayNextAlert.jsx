import React from 'react';
import AlertModal from './AlertModal';

const PlayNextAlert = ({ isOpen, onClose, onConfirm, songName }) => {
    return (
        <AlertModal
            isOpen={isOpen}
            onClose={onClose}
            title="Play This Next?"
            message={`Are you sure you want to add "${songName || 'this song'}" to the top of your queue?`}
            icon="⏭️"
            primaryLabel="Add to Front"
            onPrimaryAction={onConfirm}
            secondaryLabel="Cancel"
            onSecondaryAction={onClose}
            badgeColor="var(--gradient-accent)"
        />
    );
};

export default PlayNextAlert;
