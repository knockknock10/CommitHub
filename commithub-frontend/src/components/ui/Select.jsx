import React from "react";
import "./Input.css";

const Select = ({ 
    label, 
    error, 
    options = [], 
    value, 
    onChange, 
    className = "", 
    ...props 
}) => {
    const selectClasses = `ui-input ui-select ${error ? "input-error" : ""} ${className}`;
    
    return (
        <div className="ui-input-wrapper">
            {label && <label className="ui-input-label">{label}</label>}
            <select 
                className={selectClasses} 
                value={value} 
                onChange={onChange}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <span className="ui-input-error">{error}</span>}
        </div>
    );
};

export default Select;
