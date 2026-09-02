import { useState, useEffect } from "react";
import { fetchBranchProtection, updateBranchProtection } from "../../api/repositoryApi";

const BranchProtection = ({ repositoryId, branch }) => {

    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [enabled, setEnabled] = useState(false);
    const [requiredApprovals, setRequiredApprovals] = useState(1);
    const [dismissStaleReviews, setDismissStaleReviews] = useState(true);

    useEffect(() => {
        if (!showForm) return;

        const loadProtection = async () => {
            setLoading(true);
            try {
                const data = await fetchBranchProtection(repositoryId, branch);
                setEnabled(data.enabled || false);
                setRequiredApprovals(data.requiredApprovals || 1);
                setDismissStaleReviews(data.dismissStaleReviews !== false);
            } catch {
                setEnabled(false);
                setRequiredApprovals(1);
                setDismissStaleReviews(true);
            } finally {
                setLoading(false);
            }
        };
        loadProtection();
    }, [repositoryId, branch, showForm]);

    const handleSave = async () => {
        setSaving(true);
        setMessage("");
        try {
            await updateBranchProtection(repositoryId, branch, {
                enabled,
                requiredApprovals,
                dismissStaleReviews
            });
            setMessage("Protection rules saved.");
        } catch (error) {
            setMessage(error.response?.data?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    if (!showForm) {
        return (
            <button
                className="branch-protection-toggle"
                onClick={() => setShowForm(true)}
            >
                Protect
            </button>
        );
    }

    return (
        <div className="branch-protection-form">
            {loading && <p>Loading protection rules...</p>}

            {!loading && (
                <>
                    <label className="bp-field">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />
                        Enable branch protection
                    </label>

                    {enabled && (
                        <>
                            <label className="bp-field">
                                Required approvals
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={requiredApprovals}
                                    onChange={(e) =>
                                        setRequiredApprovals(
                                            Math.max(1, Math.min(10, Number(e.target.value) || 1))
                                        )
                                    }
                                />
                            </label>

                            <label className="bp-field">
                                <input
                                    type="checkbox"
                                    checked={dismissStaleReviews}
                                    onChange={(e) =>
                                        setDismissStaleReviews(e.target.checked)
                                    }
                                />
                                Dismiss stale reviews
                            </label>
                        </>
                    )}

                    {message && <p className="bp-message">{message}</p>}

                    <div className="bp-actions">
                        <button
                            className="bp-save"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                            className="bp-cancel"
                            onClick={() => {
                                setShowForm(false);
                                setMessage("");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default BranchProtection;
