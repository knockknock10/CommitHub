import { useState, useEffect } from "react";

const CommandPalette = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState("");

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    const commands = [
        { name: "Search Repositories", icon: "🔍", shortcut: "⌘K" },
        { name: "Create New Repo", icon: "📦", shortcut: "⌘N" },
        { name: "Go to Dashboard", icon: "🏠", shortcut: "⌘D" },
        { name: "Open Settings", icon: "⚙️", shortcut: "⌘S" },
        { name: "View Documentation", icon: "📚", shortcut: "⌘L" },
    ];

    return (
        <div className="cp-overlay" onClick={onClose}>
            <div className="cp-modal" onClick={e => e.stopPropagation()}>
                <div className="cp-search-container">
                    <span className="cp-search-icon">🔍</span>
                    <input 
                        type="text" 
                        className="cp-input" 
                        placeholder="Type a command or search..." 
                        autoFocus 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <span className="cp-shortcut">ESC</span>
                </div>
                <div className="cp-results">
                    <div className="cp-section-title">Actions</div>
                    {commands.map((cmd, i) => (
                        <div key={i} className="cp-item">
                            <div className="cp-item-left">
                                <span className="cp-item-icon">{cmd.icon}</span>
                                <span className="cp-item-name">{cmd.name}</span>
                            </div>
                            <span className="cp-item-shortcut">{cmd.shortcut}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
