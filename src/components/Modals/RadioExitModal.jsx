import React from 'react';
import './RadioExitModal.css';

const RadioExitModal = ({ onConfirm, onCancel }) => {
    return (
        <div className="modal-overlay modal-overlay-compact modal-overlay-blur radio-exit-overlay" onClick={onCancel}>
            <div className="modal-content modal-content-compact glass animate-scale-in radio-exit-content" onClick={(e) => e.stopPropagation()}>
                <div className="radio-exit-badge">
                    <span className="radio-exit-icon">📻</span>
                </div>

                <div className="radio-exit-header">
                    <h2>Switching Vibes?</h2>
                    <p>Playing this will end your current Radio session. Ready for something new?</p>
                </div>

                <div className="radio-exit-actions">
                    <button className="btn btn-premium-action" onClick={onConfirm}>
                        Yes, Let's Play
                    </button>
                    <button className="btn btn-ghost" onClick={onCancel}>
                        Stay in Radio
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RadioExitModal;
