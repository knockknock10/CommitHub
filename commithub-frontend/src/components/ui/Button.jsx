import React from "react";
import "./Button.css";

const Button = ({ 
    children, 
    onClick, 
    type = "button", 
    variant = "primary", 
    size = "medium", 
    disabled = false, 
    loading = false,
    className = "",
    ...props 
}) => {
    const buttonClasses = `btn ${variant} ${size} ${className}`;

    return (
        <button 
            type={type} 
            className={buttonClasses} 
            onClick={onClick} 
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="btn-loading-content">
                    <span className="btn-spinner"></span>
                    {children}
                </span>
            ) : (
                children
            )}
        </button>
    );
};

export default Button;
