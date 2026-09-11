const StateBlock = ({
    variant,
    message,
    retry = null,
    action = null
}) => {
    if (variant === "loading") {
        return (
            <div className="shared-loading">
                <p>{message}</p>
            </div>
        );
    }

    if (variant === "error") {
        return (
            <div className="shared-error">
                <p>{message}</p>
                {retry && (
                    <button
                        type="button"
                        className="state-btn"
                        onClick={retry}
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="shared-empty-state">
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