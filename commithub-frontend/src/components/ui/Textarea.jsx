import React from "react";
import "./Input.css";

const Textarea = ({ 
    label, 
    error, 
    className = "", 
    rows = 4,
    ...props 
}) => {
    const textareaClasses = `ui-input ui-textarea ${error ? "input-error" : ""} ${className}`;
    
    return (
        <div className="ui-input-wrapper">
            {label && <label className="ui-input-label">{label}</label>}
            <textarea 
                className={textareaClasses} 
                rows={rows}
                {...props} 
            />
            {error && <span className="ui-input-error">{error}</span>}
        </div>
    );
};

export default Textarea;
