import { useState, useEffect } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { createOrganization } from "../api/organizationApi";
import { getUserProfile, updateUserProfile } from "../api/userApi";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import {
    UserIcon,
    SettingsIcon,
    ShieldIcon,
    EyeIcon,
    BellIcon,
    BuildingIcon,
    InfoIcon,
} from "../components/ui/icons";
import "../styles/settings.css";

const NAV_ITEMS = [
    { id: "profile", label: "Public profile", icon: UserIcon },
    { id: "account", label: "Account", icon: SettingsIcon },
    { id: "security", label: "Security", icon: ShieldIcon },
    { id: "appearance", label: "Appearance", icon: EyeIcon },
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "organizations", label: "Organizations", icon: BuildingIcon },
];

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const BIO_MAX_LENGTH = 160;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyProfileErrors = {
    name: "",
    userName: "",
    email: "",
    bio: ""
};

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("profile");
    const [profileData, setProfileData] = useState({
        userName: "",
        email: "",
        bio: "",
        name: "",
        createdAt: "",
        _id: ""
    });
    const [profileErrors, setProfileErrors] = useState(emptyProfileErrors);

    const [orgForm, setOrgForm] = useState({
        name: "",
        description: ""
    });
    const [orgErrors, setOrgErrors] = useState({
        name: ""
    });
    const [creatingOrg, setCreatingOrg] = useState(false);

    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState({
        type: "",
        text: ""
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileLoadError, setProfileLoadError] = useState("");
    const [orgMessage, setOrgMessage] = useState({
        type: "",
        text: ""
    });

    const fetchProfile = async () => {
        if (!user?._id) return;
        setProfileLoading(true);
        setProfileLoadError("");
        setProfileMessage({ type: "", text: "" });
        try {
            const data = await getUserProfile(user._id);
            setProfileData({
                userName: data.userName || "",
                email: data.email || "",
                bio: data.bio || "",
                name: data.name || "",
                createdAt: data.createdAt || "",
                _id: data._id || ""
            });
        } catch {
            setProfileLoadError("Failed to load profile data");
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [user]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;

        setProfileData((prev) => ({
            ...prev,
            [name]: value
        }));

        setProfileErrors((prev) => ({
            ...prev,
            [name]: ""
        }));

        if (profileMessage.text) {
            setProfileMessage({ type: "", text: "" });
        }
    };

    const validateProfile = () => {
        const errors = { ...emptyProfileErrors };
        const { name, userName, email, bio } = profileData;

        if (name && name.trim().length > 60) {
            errors.name = "Name must be 60 characters or fewer.";
        }

        if (!userName.trim()) {
            errors.userName = "Username is required.";
        } else if (userName.trim().length > 39) {
            errors.userName = "Username must be 39 characters or fewer.";
        } else if (!USERNAME_PATTERN.test(userName.trim())) {
            errors.userName =
                "Usernames can only contain letters, numbers, hyphens, and underscores.";
        }

        if (!email.trim()) {
            errors.email = "Email is required.";
        } else if (!EMAIL_PATTERN.test(email.trim())) {
            errors.email = "Enter a valid email address.";
        }

        if (bio.trim().length > BIO_MAX_LENGTH) {
            errors.bio = `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`;
        }

        return errors;
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        const errors = validateProfile();
        setProfileErrors(errors);

        if (Object.values(errors).some(Boolean)) {
            return;
        }

        setProfileSaving(true);
        setProfileMessage({ type: "", text: "" });

        try {
            await updateUserProfile({
                name: profileData.name.trim(),
                userName: profileData.userName.trim(),
                email: profileData.email.trim(),
                bio: profileData.bio.trim()
            });
            setProfileData((prev) => ({
                ...prev,
                name: profileData.name.trim(),
                userName: profileData.userName.trim(),
                email: profileData.email.trim(),
                bio: profileData.bio.trim()
            }));
            setProfileMessage({
                type: "success",
                text: "Profile updated successfully."
            });
        } catch (err) {
            const message =
                err.response?.data?.message || "Failed to update profile.";
            setProfileMessage({ type: "error", text: message });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleOrgChange = (e) => {
        const { name, value } = e.target;
        setOrgForm((prev) => ({ ...prev, [name]: value }));
        setOrgErrors((prev) => ({ ...prev, [name]: "" }));
        setOrgMessage({ type: "", text: "" });
    };

    const validateOrganization = () => {
        const errors = { name: "" };
        if (!orgForm.name.trim()) {
            errors.name = "Organization name is required.";
        }
        return errors;
    };

    const handleCreateOrganization = async (e) => {
        e.preventDefault();
        setOrgMessage({ type: "", text: "" });

        const errors = validateOrganization();
        setOrgErrors(errors);
        if (errors.name) return;

        setCreatingOrg(true);
        try {
            await createOrganization({
                name: orgForm.name.trim(),
                description: orgForm.description.trim()
            });
            setOrgMessage({
                type: "success",
                text: "Organization created successfully."
            });
            setOrgForm({ name: "", description: "" });
            setOrgErrors({ name: "" });
        } catch (err) {
            setOrgMessage({
                type: "error",
                text:
                    err.response?.data?.message ||
                    "Failed to create organization."
            });
        } finally {
            setCreatingOrg(false);
        }
    };

    const initials = (profileData.userName || profileData.name || "?")
        .slice(0, 2)
        .toUpperCase();

    const memberSince = profileData.createdAt
        ? new Date(profileData.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric"
          })
        : null;

    return (
        <DashboardLayout>
            <div className="settings-page">
                <header className="settings-header">
                    <h1 className="settings-title">Settings</h1>
                    <p className="dashboard-header-sub">
                        Manage your account, profile, and preferences.
                    </p>
                </header>

                <div className="settings-layout">
                    <nav className="settings-nav" aria-label="Account settings">
                        <ul className="settings-nav-list">
                            {NAV_ITEMS.map((item) => {
                                const NavIcon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <li
                                        className="settings-nav-item-wrap"
                                        key={item.id}
                                    >
                                        <button
                                            type="button"
                                            className={`settings-nav-item ${
                                                isActive ? "active" : ""
                                            }`}
                                            aria-current={
                                                isActive ? "page" : undefined
                                            }
                                            onClick={() =>
                                                setActiveTab(item.id)
                                            }
                                        >
                                            <NavIcon
                                                size={16}
                                                className="settings-nav-icon"
                                            />
                                            <span className="settings-nav-label">
                                                {item.label}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    <main className="settings-content">
                        {activeTab === "profile" && (
                            <section
                                className="settings-section"
                                aria-labelledby="settings-public-profile-title"
                            >
                                <header className="settings-section-header">
                                    <h2
                                        className="settings-section-title"
                                        id="settings-public-profile-title"
                                    >
                                        Public profile
                                    </h2>
                                    <p className="settings-section-desc">
                                        This information will be visible to
                                        other CommitHub users.
                                    </p>
                                </header>

                                {profileLoading ? (
                                    <div className="shared-loading">
                                        <p>Loading profile...</p>
                                    </div>
                                ) : profileLoadError ? (
                                    <div className="shared-error">
                                        <p>{profileLoadError}</p>
                                        <button
                                            type="button"
                                            className="state-btn"
                                            onClick={fetchProfile}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : (
                                    <div className="settings-box settings-profile-box">
                                        <div className="settings-identity">
                                            <div
                                                className="settings-avatar"
                                                aria-hidden="true"
                                            >
                                                {initials}
                                            </div>
                                            <div className="settings-identity-body">
                                                <span className="settings-identity-name">
                                                    {profileData.name ||
                                                        "Your profile"}
                                                </span>
                                                <span className="settings-identity-handle">
                                                    @{profileData.userName ||
                                                        "username"}
                                                </span>
                                                {profileData.email && (
                                                    <span className="settings-identity-email">
                                                        {profileData.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <form
                                            className="settings-form"
                                            onSubmit={handleProfileSubmit}
                                            noValidate
                                        >
                                            <div className="settings-form-row-wrap">
                                                <div className="settings-field">
                                                    <Input
                                                        id="profile-name"
                                                        label="Name"
                                                        hint="Your full name — shown on your public profile."
                                                        type="text"
                                                        name="name"
                                                        value={
                                                            profileData.name
                                                        }
                                                        onChange={
                                                            handleProfileChange
                                                        }
                                                        placeholder="Your full name"
                                                        autoComplete="name"
                                                        error={
                                                            profileErrors.name
                                                        }
                                                    />
                                                </div>
                                                <div className="settings-field">
                                                    <Input
                                                        id="profile-username"
                                                        label="Username"
                                                        hint="Your unique CommitHub username — used in URLs and activity."
                                                        type="text"
                                                        name="userName"
                                                        value={
                                                            profileData.userName
                                                        }
                                                        onChange={
                                                            handleProfileChange
                                                        }
                                                        placeholder="username"
                                                        autoComplete="username"
                                                        error={
                                                            profileErrors.userName
                                                        }
                                                    />
                                                </div>
                                                <div className="settings-field">
                                                    <Input
                                                        id="profile-email"
                                                        label="Email"
                                                        hint="Your primary contact email."
                                                        type="email"
                                                        name="email"
                                                        value={
                                                            profileData.email
                                                        }
                                                        onChange={
                                                            handleProfileChange
                                                        }
                                                        placeholder="you@example.com"
                                                        autoComplete="email"
                                                        error={
                                                            profileErrors.email
                                                        }
                                                    />
                                                </div>
                                                <div className="settings-field settings-field-wide">
                                                    <Textarea
                                                        id="profile-bio"
                                                        label="Bio"
                                                        hint="Tell people about yourself."
                                                        name="bio"
                                                        value={profileData.bio}
                                                        onChange={
                                                            handleProfileChange
                                                        }
                                                        placeholder="A short introduction..."
                                                        rows={4}
                                                        error={
                                                            profileErrors.bio
                                                        }
                                                    />
                                                    <span
                                                        className={`settings-field-counter ${
                                                            profileData.bio
                                                                .length >
                                                            BIO_MAX_LENGTH
                                                                ? "over"
                                                                : ""
                                                        }`}
                                                    >
                                                        {profileData.bio
                                                            .length}
                                                        /{BIO_MAX_LENGTH}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="settings-form-actions">
                                                <Button
                                                    type="submit"
                                                    variant="primary"
                                                    className="settings-save-btn"
                                                    disabled={profileSaving}
                                                    loading={profileSaving}
                                                >
                                                    Save changes
                                                </Button>
                                            </div>

                                            {profileMessage.text && (
                                                <p
                                                    className={`settings-status ${
                                                        profileMessage.type ===
                                                        "error"
                                                            ? "is-error"
                                                            : "is-success"
                                                    }`}
                                                    role={
                                                        profileMessage.type ===
                                                        "error"
                                                            ? "alert"
                                                            : "status"
                                                    }
                                                >
                                                    {profileMessage.text}
                                                </p>
                                            )}
                                        </form>
                                    </div>
                                )}
                            </section>
                        )}

                        {activeTab === "account" && (
                            <section
                                className="settings-section"
                                aria-labelledby="settings-account-title"
                            >
                                <header className="settings-section-header">
                                    <h2
                                        className="settings-section-title"
                                        id="settings-account-title"
                                    >
                                        Account
                                    </h2>
                                    <p className="settings-section-desc">
                                        Basic information about your CommitHub
                                        account.
                                    </p>
                                </header>

                                <div className="settings-box">
                                    <dl className="settings-detail-list">
                                        <div className="settings-detail-row">
                                            <dt className="settings-detail-label">
                                                Username
                                            </dt>
                                            <dd className="settings-detail-value">
                                                @
                                                {profileData.userName ||
                                                    "—"}
                                            </dd>
                                        </div>
                                        <div className="settings-detail-row">
                                            <dt className="settings-detail-label">
                                                Email
                                            </dt>
                                            <dd className="settings-detail-value">
                                                {profileData.email || "—"}
                                            </dd>
                                        </div>
                                        <div className="settings-detail-row">
                                            <dt className="settings-detail-label">
                                                Member since
                                            </dt>
                                            <dd className="settings-detail-value">
                                                {memberSince || "—"}
                                            </dd>
                                        </div>
                                        <div className="settings-detail-row">
                                            <dt className="settings-detail-label">
                                                User ID
                                            </dt>
                                            <dd className="settings-detail-value settings-detail-id">
                                                {user?._id || "—"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </section>
                        )}

                        {activeTab === "security" && (
                            <section
                                className="settings-section"
                                aria-labelledby="settings-security-title"
                            >
                                <header className="settings-section-header">
                                    <h2
                                        className="settings-section-title"
                                        id="settings-security-title"
                                    >
                                        Security
                                    </h2>
                                    <p className="settings-section-desc">
                                        Manage how you sign in and protect your
                                        account.
                                    </p>
                                </header>

                                <div className="settings-box settings-note-box">
                                    <div className="settings-note">
                                        <InfoIcon
                                            size={16}
                                            className="settings-note-icon"
                                        />
                                        <span className="settings-note-text">
                                            Password changes and two-factor
                                            authentication are not currently
                                            supported by CommitHub. Sign-in is
                                            managed with your account email and
                                            password.
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === "appearance" && (
                            <section
                                className="settings-section"
                                aria-labelledby="settings-appearance-title"
                            >
                                <header className="settings-section-header">
                                    <h2
                                        className="settings-section-title"
                                        id="settings-appearance-title"
                                    >
                                        Appearance
                                    </h2>
                                    <p className="settings-section-desc">
                                        Customize how CommitHub looks for you.
                                    </p>
                                </header>

                                <div className="settings-box settings-note-box">
                                    <div className="settings-note">
                                        <InfoIcon
                                            size={16}
                                            className="settings-note-icon"
                                        />
                                        <span className="settings-note-text">
                                            CommitHub uses a single dark theme
                                            tuned for developer workflows.
                                            Theme customization is not
                                            available yet.
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === "notifications" && (
                            <section
                                className="settings-section"
                                aria-labelledby="settings-notifications-title"
                            >
                                <header className="settings-section-header">
                                    <h2
                                        className="settings-section-title"
                                        id="settings-notifications-title"
                                    >
                                        Notifications
                                    </h2>
                                    <p className="settings-section-desc">
                                        Control how you stay up to date with
                                        activity on CommitHub.
                                    </p>
                                </header>

                                <div className="settings-box settings-note-box">
                                    <div className="settings-note">
                                        <InfoIcon
                                            size={16}
                                            className="settings-note-icon"
                                        />
                                        <span className="settings-note-text">
                                            Notifications are delivered in-app
                                            and grouped by activity. Custom
                                            notification preferences are not
                                            available yet.
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === "organizations" && (
                            <section
                                className="settings-section"
                                aria-labelledby="settings-organizations-title"
                            >
                                <header className="settings-section-header">
                                    <h2
                                        className="settings-section-title"
                                        id="settings-organizations-title"
                                    >
                                        Organizations
                                    </h2>
                                    <p className="settings-section-desc">
                                        Create and manage the organizations you
                                        belong to.
                                    </p>
                                </header>

                                <div className="settings-box">
                                    <h3 className="settings-box-heading">
                                        New organization
                                    </h3>
                                    <form
                                        className="settings-form"
                                        onSubmit={handleCreateOrganization}
                                        noValidate
                                    >
                                        <div className="settings-form-row-wrap">
                                            <div className="settings-field">
                                                <Input
                                                    id="org-name"
                                                    label="Name"
                                                    hint="Shown on your organization's public page."
                                                    type="text"
                                                    name="name"
                                                    value={orgForm.name}
                                                    onChange={handleOrgChange}
                                                    placeholder="org-name"
                                                    error={orgErrors.name}
                                                />
                                            </div>
                                            <div className="settings-field settings-field-wide">
                                                <Textarea
                                                    id="org-description"
                                                    label="Description"
                                                    hint="Tell people what this organization does."
                                                    name="description"
                                                    value={orgForm.description}
                                                    onChange={handleOrgChange}
                                                    placeholder="A short description..."
                                                    rows={3}
                                                />
                                            </div>
                                        </div>

                                        <div className="settings-form-actions">
                                            <Button
                                                type="submit"
                                                variant="primary"
                                                className="settings-save-btn"
                                                disabled={creatingOrg}
                                                loading={creatingOrg}
                                            >
                                                {creatingOrg
                                                    ? "Creating"
                                                    : "Create organization"}
                                            </Button>
                                        </div>

                                        {orgMessage.text && (
                                            <p
                                                className={`settings-status ${
                                                    orgMessage.type === "error"
                                                        ? "is-error"
                                                        : "is-success"
                                                }`}
                                                role={
                                                    orgMessage.type === "error"
                                                        ? "alert"
                                                        : "status"
                                                }
                                            >
                                                {orgMessage.text}
                                            </p>
                                        )}
                                    </form>
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Settings;