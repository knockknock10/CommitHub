import { useEffect, useRef } from "react";
import { CloseIcon } from "./icons";
import "./Modal.css";

const Modal = ({ isOpen, onClose, title, children, footer }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        // move focus into the modal on open
        const prev = document.activeElement;
        containerRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            if (prev && typeof prev.focus === "function") prev.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="ui-modal-overlay"
            onClick={handleBackdropClick}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    // keep focus inside the dialog even when clicking the backdrop
                    containerRef.current?.focus();
                }
            }}
        >
            <div
                className="ui-modal-container"
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "ui-modal-title" : undefined}
                tabIndex={-1}
                ref={containerRef}
            >
                <div className="ui-modal-header">
                    {title && (
                        <h2 className="ui-modal-title" id="ui-modal-title">
                            {title}
                        </h2>
                    )}
                    <button
                        className="ui-modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <CloseIcon size={18} />
                    </button>
                </div>
                <div className="ui-modal-body">{children}</div>
                {footer && <div className="ui-modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;