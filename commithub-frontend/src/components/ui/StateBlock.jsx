import { RefreshIcon, InfoIcon, AlertIcon } from "./icons";

const StateBlock = ({ variant, message, retry = null, action = null }) => {
    if (variant === "loading") {
        return (
            <div className="shared-loading">
                <p>{message || "Loading..."}</p>
            </div>
        );
    }

    if (variant === "error") {
        return (
            <div className="shared-error">
                <AlertIcon size={20} />
                <p>{message}</p>
                {retry && (
                    <button
                        type="button"
                        className="state-btn"
                        onClick={retry}
                    >
                        <RefreshIcon size={14} />
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="shared-empty-state">
            <InfoIcon size={20} />
            {message && <p>{message}</p>}
            {action && (
                <button
                    type="button"
                    className="state-btn state-btn-primary"
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default StateBlock;