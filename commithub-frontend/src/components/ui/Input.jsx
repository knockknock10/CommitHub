import "./Input.css";

const Input = ({
    label,
    hint,
    error,
    id,
    type = "text",
    className = "",
    ...props
}) => {
    const inputClasses = `ui-input ${error ? "input-error" : ""} ${className}`;
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
            <input
                id={id || undefined}
                type={type}
                className={inputClasses}
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

export default Input;