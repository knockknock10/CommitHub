import React from "react";
import "./Input.css";

const Input = ({ 
    label, 
    error, 
    type = "text", 
    className = "", 
    ...props 
}) => {
    const inputClasses = `ui-input ${error ? "input-error" : ""} ${className}`;
    
    return (
        <div className="ui-input-wrapper">
            {label && <label className="ui-input-label">{label}</label>}
            <input 
                type={type} 
                className={inputClasses} 
                {...props} 
            />
            {error && <span className="ui-input-error">{error}</span>}
        </div>
    );
};

export default Input;
