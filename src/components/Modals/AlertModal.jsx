import React from 'react';
import './AlertModal.css';

const AlertModal = ({
    isOpen,
    onClose,
    title,
    message,
    icon = '🔔',
    primaryLabel = 'Confirm',
    onPrimaryAction,
    secondaryLabel = 'Cancel',
    onSecondaryAction,
    badgeColor // optional override for the badge gradient
}) => {
    if (!isOpen) return null;

    const handlePrimaryClick = () => {
        if (onPrimaryAction) onPrimaryAction();
        onClose();
    };

    const handleSecondaryClick = () => {
        if (onSecondaryAction) onSecondaryAction();
        onClose();
    };

    return (
        <div className="modal-overlay modal-overlay-compact modal-overlay-blur" onClick={onClose}>
            <div className="modal-content modal-content-compact glass animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="alert-modal-badge" style={badgeColor ? { background: badgeColor } : {}}>
                    <span className="alert-modal-icon">{icon}</span>
                </div>

                <div className="alert-modal-header">
                    <h2>{title}</h2>
                </div>

                <div className="alert-modal-body">
                    <p>{message}</p>
                </div>

                <div className="alert-modal-actions">
                    <button className="btn btn-alert-primary" onClick={handlePrimaryClick}>
                        {primaryLabel}
                    </button>
                    {onSecondaryAction && (
                        <button className="btn btn-alert-ghost" onClick={handleSecondaryClick}>
                            {secondaryLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
