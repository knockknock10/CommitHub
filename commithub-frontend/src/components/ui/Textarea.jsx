import "./Input.css";

const Textarea = ({
    label,
    hint,
    error,
    id,
    className = "",
    rows = 4,
    ...props
}) => {
    const textareaClasses = `ui-input ui-textarea ${error ? "input-error" : ""} ${className}`;
    const describedBy = [
        id ? `${id}-hint` : "",
        id ? `${id}-error` : ""
    ]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
        <div className="ui-input-wrapper">
            {label && (
                <label
                    className="ui-input-label"
                    htmlFor={id || undefined}
                >
                    {label}
                </label>
            )}
            {hint && (
                <span
                    id={id ? `${id}-hint` : undefined}
                    className="ui-input-hint"
                >
                    {hint}
                </span>
            )}
            <textarea
                id={id || undefined}
                className={textareaClasses}
                rows={rows}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...props}
            />
            {error && (
                <span
                    id={id ? `${id}-error` : undefined}
                    className="ui-input-error"
                >
                    {error}
                </span>
            )}
        </div>
    );
};

export default Textarea;