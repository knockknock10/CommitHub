import { useState, useEffect } from "react";
import { getCollaborators, addCollaborator, updateCollaborator, removeCollaborator } from "../../api/collaboratorApi";
import { globalSearch } from "../../api/searchApi";
import { useRealtimeEvent } from "../../hooks/useRealtimeEvent";

const ROLE_OPTIONS = [
    { value: "maintainer", label: "Maintainer", description: "Can manage collaborators, branch protection, and merge PRs" },
    { value: "developer", label: "Developer", description: "Can create PRs, review, comment, and push" },
    { value: "reporter", label: "Reporter", description: "Can view, comment, and review" },
    { value: "read_only", label: "Read Only", description: "Can view the repository" }
];

const Collaborators = ({ repository, userRole }) => {
    const [collaborators, setCollaborators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedRole, setSelectedRole] = useState("developer");
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingRole, setEditingRole] = useState("");

    const canManage = userRole === "owner" || userRole === "maintainer";

    const loadCollaborators = async () => {
        try {
            const data = await getCollaborators(repository._id);
            setCollaborators(data);
        } catch (err) {
            setError("Failed to load collaborators");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCollaborators();
    }, [repository._id]);

    useRealtimeEvent("COLLABORATOR_ADDED", (event) => {
        if (event.repositoryId === repository._id) {
            setCollaborators(prev => [...prev, event.collaborator]);
        }
    });

    useRealtimeEvent("COLLABORATOR_UPDATED", (event) => {
        if (event.repositoryId === repository._id) {
            setCollaborators(prev => prev.map(c =>
                c._id === event.collaborator._id ? event.collaborator : c
            ));
        }
    });

    useRealtimeEvent("COLLABORATOR_REMOVED", (event) => {
        if (event.repositoryId === repository._id) {
            setCollaborators(prev => prev.filter(c => c._id !== event.collaborator._id));
        }
    });

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }
        try {
            setSearching(true);
            const data = await globalSearch(query);
            const existingIds = collaborators.map(c => c.user?._id || c.user);
            setSearchResults((data.users || []).filter(u => !existingIds.includes(u._id)));
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleAdd = async (userId) => {
        try {
            setAdding(true);
            await addCollaborator(repository._id, { userId, role: selectedRole });
            setSearchQuery("");
            setSearchResults([]);
            await loadCollaborators();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to add collaborator");
        } finally {
            setAdding(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateCollaborator(repository._id, userId, { role: newRole });
            setEditingId(null);
            setEditingRole("");
            await loadCollaborators();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update role");
        }
    };

    const handleRemove = async (userId) => {
        try {
            await removeCollaborator(repository._id, userId);
            await loadCollaborators();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to remove collaborator");
        }
    };

    if (loading) {
        return <div className="repo-collaborators-loading">Loading collaborators...</div>;
    }

    return (
        <div className="repo-collaborators">
            {error && (
                <div className="repo-settings-message error">{error}</div>
            )}

            {canManage && (
                <div className="repo-collaborators-section">
                    <h3>Add Collaborator</h3>
                    <div className="repo-collaborators-add">
                        <div className="repo-collaborators-search">
                            <input
                                type="text"
                                placeholder="Search by username..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="repo-settings-field-input"
                            />
                            {searching && <span className="repo-collaborators-searching">Searching...</span>}
                            {searchResults.length > 0 && (
                                <div className="repo-collaborators-search-results">
                                    {searchResults.map(user => (
                                        <div key={user._id} className="repo-collaborators-search-result">
                                            <span>{user.userName}</span>
                                            <button
                                                onClick={() => handleAdd(user._id)}
                                                disabled={adding}
                                                className="repo-collaborators-add-btn"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="repo-collaborators-role-select">
                            <label>Role:</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                            >
                                {ROLE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="repo-collaborators-section">
                <h3>Collaborators ({collaborators.length})</h3>
                {collaborators.length === 0 ? (
                    <p className="repo-collaborators-empty">No collaborators yet. Add one above.</p>
                ) : (
                    <div className="repo-collaborators-list">
                        {collaborators.map(collab => (
                            <div key={collab._id} className="repo-collaborators-item">
                                <div className="repo-collaborators-info">
                                    <span className="repo-collaborators-name">{collab.user?.userName || "Unknown"}</span>
                                    <span className="repo-collaborators-email">{collab.user?.email || ""}</span>
                                </div>
                                <div className="repo-collaborators-actions">
                                    {editingId === collab._id ? (
                                        <div className="repo-collaborators-edit">
                                            <select
                                                value={editingRole}
                                                onChange={(e) => setEditingRole(e.target.value)}
                                            >
                                                {ROLE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleRoleChange(collab.user?._id || collab.user, editingRole)}
                                                className="repo-collaborators-save-btn"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(null); setEditingRole(""); }}
                                                className="repo-collaborators-cancel-btn"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="repo-collaborators-role">{collab.role}</span>
                                            {canManage && (
                                                <>
                                                    <button
                                                        onClick={() => { setEditingId(collab._id); setEditingRole(collab.role); }}
                                                        className="repo-collaborators-edit-btn"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(collab.user?._id || collab.user)}
                                                        className="repo-collaborators-remove-btn"
                                                    >
                                                        Remove
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Collaborators;
