import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
    fetchOrganization,
    fetchOrganizationMembers,
    addOrganizationMember,
    removeOrganizationMember,
} from "../api/organizationApi";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";

import "../styles/organizations.css";

const OrganizationPage = () => {
    const { slug } = useParams();
    const { user } = useAuth();

    const [organization, setOrganization] = useState(null);
    const [members, setMembers] = useState([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Invite state
    const [inviteUser, setInviteUser] = useState("");
    const [inviteRole, setInviteRole] = useState("MEMBER");
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadOrganization = async () => {
            try {
                const [orgData, membersData] = await Promise.all([
                    fetchOrganization(slug),
                    fetchOrganizationMembers(slug),
                ]);
                if (isMounted) {
                    setOrganization(orgData.organization || orgData);
                    setMembers(membersData.members || membersData || []);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.response?.data?.message || "Failed to load organization");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadOrganization();

        return () => {
            isMounted = false;
        };
    }, [slug]);

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!inviteUser) return;

        setIsInviting(true);
        try {
            await addOrganizationMember(slug, {
                userId: inviteUser,
                role: inviteRole
            });
            // Refresh members
            const membersData = await fetchOrganizationMembers(slug);
            setMembers(membersData.members || membersData || []);
            setInviteUser("");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add member");
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;

        try {
            await removeOrganizationMember(slug, userId);
            // Refresh members
            const membersData = await fetchOrganizationMembers(slug);
            setMembers(membersData.members || membersData || []);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to remove member");
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="empty-state">
                    <p>Loading organization...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="empty-state">
                    <p>{error}</p>
                </div>
            </DashboardLayout>
        );
    }

    // Find current user's role in this org
    const currentUserMembership = members.find(m => m.user?._id === user?._id || m._id === user?._id);
    const userRole = currentUserMembership?.role || null;
    const canManage = ["OWNER", "ADMIN"].includes(userRole);

    return (
        <DashboardLayout>
            <div className="organization-page">
                <header className="org-header">
                    <div className="org-header-main">
                        <h1>{organization.name}</h1>
                        <p>{organization.description || "No description provided."}</p>
                    </div>
                    {userRole && (
                        <span className="org-badge">{userRole}</span>
                    )}
                </header>

                <nav className="org-nav">
                    <button 
                        className={`org-tab ${activeTab === "overview" ? "active" : ""}`}
                        onClick={() => setActiveTab("overview")}
                    >
                        Overview
                    </button>
                    <button 
                        className={`org-tab ${activeTab === "people" ? "active" : ""}`}
                        onClick={() => setActiveTab("people")}
                    >
                        People ({members.length})
                    </button>
                </nav>

                <main className="org-content">
                    {activeTab === "overview" && (
                        <section>
                            <div className="empty-state">
                                <h3>Organization Repositories</h3>
                                <p>Repositories managed by this organization will appear here.</p>
                                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                                    (Organization repository listing is currently not supported by the API)
                                </p>
                            </div>
                        </section>
                    )}

                    {activeTab === "people" && (
                        <section>
                            {canManage && (
                                <div className="invite-section">
                                    <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#f0f6fc' }}>
                                        Invite Member
                                    </h3>
                                    <form className="invite-form" onSubmit={handleAddMember}>
                                        <div className="invite-field">
                                            <Input
                                                label="User ID"
                                                type="text"
                                                value={inviteUser}
                                                onChange={(e) => setInviteUser(e.target.value)}
                                                placeholder="Paste User ID..."
                                            />
                                        </div>
                                        <div className="invite-field">
                                            <Select 
                                                label="Role" 
                                                value={inviteRole} 
                                                onChange={(e) => setInviteRole(e.target.value)}
                                                options={[
                                                    { label: "Member", value: "MEMBER" },
                                                    { label: "Admin", value: "ADMIN" },
                                                ]}
                                            />
                                        </div>
                                        <Button 
                                            type="submit" 
                                            className="btn-invite" 
                                            disabled={isInviting}
                                            loading={isInviting}
                                            variant="primary"
                                        >
                                            {isInviting ? "Inviting..." : "Invite"}
                                        </Button>
                                    </form>
                                </div>
                            )}

                            <div className="member-list">
                                {members.length === 0 ? (
                                    <p className="empty-state">No members yet.</p>
                                ) : (
                                    members.map((membership) => {
                                        const member = membership.user || membership;
                                        const role = membership.role || "MEMBER";
                                        const isSelf = member._id === user?._id;

                                        return (
                                            <div className="member-card" key={member._id}>
                                                <div className="member-info">
                                                    <Link to={`/profile/${member._id}`} style={{ textDecoration: 'none' }}>
                                                        <h3>{member.userName || member.name || "Unknown User"}</h3>
                                                    </Link>
                                                    <p>{member.email}</p>
                                                    <span className="member-role">{role}</span>
                                                </div>
                                                <div className="member-actions">
                                                    {canManage && !isSelf && (
                                                        <Button
                                                            className="btn-remove"
                                                            onClick={() => handleRemoveMember(member._id)}
                                                            variant="danger"
                                                            size="small"
                                                        >
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </DashboardLayout>
    );
};

export default OrganizationPage;
