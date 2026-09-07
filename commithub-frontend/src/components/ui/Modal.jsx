import React from "react";
import "./Modal.css";

const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    footer 
}) => {
    if (!isOpen) return null;

    // Close on backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="ui-modal-overlay" onClick={handleBackdropClick}>
            <div className="ui-modal-container">
                <div className="ui-modal-header">
                    {title && <h2 className="ui-modal-title">{title}</h2>}
                    <button className="ui-modal-close" onClick={onClose} aria-label="Close modal">
                        &times;
                    </button>
                </div>
                <div className="ui-modal-body">
                    {children}
                </div>
                {footer && (
                    <div className="ui-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
