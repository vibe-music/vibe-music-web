import React from 'react';
import './LogoutConfirmationModal.css';

const LogoutConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="logout-modal-overlay animate-fade-in" onClick={onClose}>
            <div className="logout-modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="logout-modal-header">
                    <h3>Sign Out?</h3>
                </div>
                <div className="logout-modal-body">
                    <p>Are you sure you want to sign out of VibeSync?</p>
                    <p className="sub-text">Your local music data will remain safe.</p>
                </div>
                <div className="logout-modal-actions">
                    <button className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-danger" onClick={onConfirm}>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmationModal;
