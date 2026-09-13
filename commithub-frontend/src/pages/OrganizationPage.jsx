import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import StateBlock from "../components/ui/StateBlock";
import { useAuth } from "../context/AuthContext";
import {
    fetchOrganization,
    fetchOrganizationMembers,
    addOrganizationMember,
    removeOrganizationMember,
} from "../api/organizationApi";
import { fetchTeams } from "../api/teamApi";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import {
    BuildingIcon,
    UsersIcon,
    RepoIcon,
    PlusIcon,
} from "../components/ui/icons";

import "../styles/organizations.css";

const OrganizationPage = () => {
    const { slug } = useParams();
    const { user } = useAuth();

    const [organization, setOrganization] = useState(null);
    const [members, setMembers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [inviteUser, setInviteUser] = useState("");
    const [inviteRole, setInviteRole] = useState("MEMBER");
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState("");
    const [inviteSuccess, setInviteSuccess] = useState("");
    const [removingId, setRemovingId] = useState(null);

    const loadOrganization = async () => {
        setLoading(true);
        setError("");
        try {
            const [orgData, membersData, teamsData] = await Promise.all([
                fetchOrganization(slug),
                fetchOrganizationMembers(slug),
                fetchTeams(slug),
            ]);
            setOrganization(orgData.organization || orgData);
            setMembers(membersData.members || membersData || []);
            setTeams(teamsData || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load organization");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrganization();
    }, [slug]);

    const handleAddMember = async (e) => {
        e.preventDefault();
        setInviteError("");
        setInviteSuccess("");
        if (!inviteUser) return;

        setIsInviting(true);
        try {
            await addOrganizationMember(slug, {
                userName: inviteUser,
                role: inviteRole
            });
            const membersData = await fetchOrganizationMembers(slug);
            setMembers(membersData.members || membersData || []);
            setInviteUser("");
            setInviteSuccess("Member added successfully.");
        } catch (err) {
            setInviteError(err.response?.data?.message || "Failed to add member");
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;
        setInviteError("");
        setInviteSuccess("");
        setRemovingId(userId);
        try {
            await removeOrganizationMember(slug, userId);
            const membersData = await fetchOrganizationMembers(slug);
            setMembers(membersData.members || membersData || []);
        } catch (err) {
            setInviteError(err.response?.data?.message || "Failed to remove member");
        } finally {
            setRemovingId(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="shared-loading">
                    <p>Loading organization...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <StateBlock
                    variant="error"
                    message={error}
                    retry={loadOrganization}
                />
            </DashboardLayout>
        );
    }

    const currentUserMembership = members.find(
        (m) => m.user?._id === user?._id || m._id === user?._id
    );
    const userRole = currentUserMembership?.role || null;
    const canManage = ["OWNER", "ADMIN"].includes(userRole);

    return (
        <DashboardLayout>
            <div className="org-page">
                <header className="org-header">
                    <div className="org-avatar">
                        <BuildingIcon size={26} />
                    </div>
                    <div className="org-info">
                        <div
                            className="org-title-row"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-sm)"
                            }}
                        >
                            <h1 className="org-name">{organization.name}</h1>
                            {userRole && (
                                <span
                                    className="repository-item-visibility"
                                    style={{ margin: 0 }}
                                >
                                    {userRole}
                                </span>
                            )}
                        </div>
                        <p className="org-desc">
                            {organization.description ||
                                "No description provided."}
                        </p>
                        <div className="org-stats">
                            <span className="org-stat">
                                <UsersIcon size={13} />
                                <strong>{members.length}</strong>
                                member{members.length === 1 ? "" : "s"}
                            </span>
                            <span className="org-stat">
                                <RepoIcon size={13} />
<strong>
                                    {organization.repositories?.length || 0}
                                </strong>
                                repositories
                            </span>
                        </div>
                    </div>
                </header>

                <nav className="repo-tabs" role="tablist">
                    <button
                        className={`repo-tab ${
                            activeTab === "overview" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("overview")}
                    >
                        Overview
                    </button>
                    <button
                        className={`repo-tab ${
                            activeTab === "people" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("people")}
                    >
                        Members
                        <span className="repo-tab-count">{members.length}</span>
                    </button>
                    <button
                        className={`repo-tab ${
                            activeTab === "teams" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("teams")}
                    >
                        Teams
                        <span className="repo-tab-count">{teams.length}</span>
                    </button>
                </nav>

                <div className="repo-content">
                    {activeTab === "overview" && (
                        <section>
                            <div className="dashboard-header">
                                <div>
                                    <h1>Repositories</h1>
                                    <p className="dashboard-header-sub">
                                        Repositories managed by this
                                        organization.
                                    </p>
                                </div>
                            </div>
                            <div className="home-panel">
                                <div className="home-panel-header">
                                    <span className="home-panel-title">
                                        Organization repositories
                                    </span>
                                </div>
                                <div style={{ padding: "var(--space-3xl)" }}>
                                    <StateBlock
                                        variant="empty"
                                        message="Organization repositories are not yet available on this page."
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === "people" && (
                        <section>
                            {canManage && (
                                <div
                                    className="settings-form"
                                    style={{
                                        background: "var(--surface)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-lg)",
                                        padding: "var(--space-xl)",
                                        marginBottom: "var(--space-xl)"
                                    }}
                                >
                                    <div className="settings-section-header">
                                        <h3 className="settings-section-title">
                                            Invite member
                                        </h3>
                                    </div>
                                    <form
                                        className="settings-form"
                                        onSubmit={handleAddMember}
                                    >
                                        <div
                                            className="settings-form-row"
                                            style={{
                                                gridTemplateColumns:
                                                    "1fr 1fr auto"
                                            }}
                                        >
                                            <Input
                                                label="Username"
                                                type="text"
                                                value={inviteUser}
                                                onChange={(e) => {
                                                    setInviteUser(
                                                        e.target.value
                                                    );
                                                    setInviteError("");
                                                }}
                                                placeholder="e.g. sanjeevkumar"
                                            />
                                            <Select
                                                label="Role"
                                                value={inviteRole}
                                                onChange={(e) =>
                                                    setInviteRole(
                                                        e.target.value
                                                    )
                                                }
                                                options={[
                                                    {
                                                        label: "Member",
                                                        value: "MEMBER"
                                                    },
                                                    {
                                                        label: "Admin",
                                                        value: "ADMIN"
                                                    },
                                                ]}
                                            />
                                            <Button
                                                type="submit"
                                                disabled={isInviting}
                                                loading={isInviting}
                                                variant="primary"
                                                style={{
                                                    alignSelf: "end"
                                                }}
                                            >
                                                <PlusIcon size={14} />
                                                {isInviting
                                                    ? "Inviting..."
                                                    : "Invite"}
                                            </Button>
                                        </div>
                                    </form>
                                    {inviteError && (
                                        <p
                                            style={{
                                                color: "var(--danger)",
                                                fontSize: "var(--fs-xs)"
                                            }}
                                        >
                                            {inviteError}
                                        </p>
                                    )}
                                    {inviteSuccess && (
                                        <p
                                            style={{
                                                color: "var(--success)",
                                                fontSize: "var(--fs-xs)"
                                            }}
                                        >
                                            {inviteSuccess}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="collaborator-list">
                                {members.length === 0 ? (
                                    <div className="home-panel">
                                        <div
                                            style={{
                                                padding: "var(--space-3xl)"
                                            }}
                                        >
                                            <StateBlock
                                                variant="empty"
                                                message="No members yet."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    members.map((membership) => {
                                        const member =
                                            membership.user || membership;
                                        const role =
                                            membership.role || "MEMBER";
                                        const isSelf =
                                            member._id === user?._id;

                                        return (
                                            <div
                                                className="collaborator-item"
                                                key={member._id}
                                            >
                                                <span className="collaborator-avatar">
                                                    {member.userName
                                                        ?.slice(0, 2)
                                                        .toUpperCase() ||
                                                        "??"}
                                                </span>
                                                <span className="collaborator-name">
                                                    <Link
                                                        to={`/profile/${member._id}`}
                                                        style={{
                                                            color:
                                                                "var(--text-primary)"
                                                        }}
                                                    >
                                                        {member.userName ||
                                                            member.name ||
                                                            "Unknown User"}
                                                    </Link>
                                                </span>
                                                <span className="collaborator-role">
                                                    {role}
                                                </span>
                                                {canManage && !isSelf && (
                                                    <Button
                                                        onClick={() =>
                                                            handleRemoveMember(
                                                                member._id
                                                            )
                                                        }
                                                        variant="danger"
                                                        size="small"
                                                        loading={
                                                            removingId ===
                                                            member._id
                                                        }
                                                        disabled={
                                                            removingId ===
                                                            member._id
                                                        }
                                                    >
                                                        {removingId ===
                                                        member._id
                                                            ? "Removing..."
                                                            : "Remove"}
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === "teams" && (
                        <section>
                            {teams.length === 0 ? (
                                <div className="home-panel">
                                    <div className="home-panel-header">
                                        <span className="home-panel-title">
                                            No teams yet
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            padding: "var(--space-3xl)"
                                        }}
                                    >
                                        <StateBlock
                                            variant="empty"
                                            message="Teams let you organize members into focused groups."
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="home-panel">
                                    <div className="home-panel-header">
                                        <span className="home-panel-title">
                                            Teams
                                        </span>
                                    </div>
                                    <div className="home-panel-list">
                                        {teams.map((team) => (
                                            <div
                                                className="home-panel-item"
                                                key={team._id}
                                            >
                                                <span className="home-panel-item-icon">
                                                    <UsersIcon size={14} />
                                                </span>
                                                <div className="home-panel-item-body">
                                                    <span className="home-panel-item-name">
                                                        {team.name}
                                                    </span>
                                                    <span className="home-panel-item-sub">
                                                        {team.description}
                                                    </span>
                                                </div>
                                                <span className="home-panel-item-meta">
                                                    {team.memberCount}{" "}
                                                    member
                                                    {team.memberCount === 1
                                                        ? ""
                                                        : "s"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default OrganizationPage;