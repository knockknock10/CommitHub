import "./Input.css";

const Select = ({
    id,
    label,
    hint,
    error,
    options = [],
    value,
    onChange,
    className = "",
    ...props
}) => {
    const selectClasses = `ui-input ui-select ${error ? "input-error" : ""} ${className}`;
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
            <select
                id={id || undefined}
                className={selectClasses}
                value={value}
                onChange={onChange}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
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

export default Select;