import { useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import "../styles/settings.css";

const Settings = () => {
    const [profileData, setProfileData] = useState({
        name: "Sanjeev Kumar",
        username: "knockknock10",
        email: "sanjeev@example.com",
        bio: "building CommitHub - a Git-inspired collaboration platform."
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setProfileData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(profileData);
    };

    return (
        <DashboardLayout>
            <div className="settings-page">
                <div className="settings-header">
                    <h1>
                        Settings
                    </h1>
                    <p>
                        Manage your account, profile, security, and platform preferences.
                    </p>
                </div>
                <div className="settings-layout">
                    <aside className="settings-sidebar">
                        <button className="active-settings-tab">
                            Profile
                        </button>
                        <button>
                            Account
                        </button>
                        <button>
                            Security
                        </button>
                        <button>
                            Appearance
                        </button>
                        <button>
                            Notifications
                        </button>
                    </aside>
                    <div className="settings-content">
                        <section className="settings-section">
                            <div className="settings-section-header">
                                <h2>
                                    Public profile
                                </h2>
                                <p>
                                    Update your profile details and personal information.
                                </p>
                            </div>
                            <form
                                className="settings-form"
                                onSubmit={handleSubmit}
                            >
                                <div className="settings-input-group">
                                    <label>
                                        Full name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profileData.name}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="settings-input-group">
                                    <label>
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={profileData.username}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="settings-input-group">
                                    <label>
                                        Email address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="settings-input-group">
                                    <label>
                                        Bio
                                    </label>
                                    <textarea
                                        name="bio"
                                        value={profileData.bio}
                                        onChange={handleChange}
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="save-profile-btn"
                                >
                                    Save changes
                                </button>
                            </form>
                        </section>
                        <section className="settings-section">
                            <div className="settings-section-header">
                                <h2>
                                    Security
                                </h2>
                                <p>
                                    Manage password, authentication, and account protection.
                                </p>
                            </div>
                            <div className="security-options">
                                <div className="security-card">
                                    <div>
                                        <h3>
                                            Change password
                                        </h3>
                                        <p>
                                            Update your account password regularly.
                                        </p>
                                    </div>
                                    <button>
                                        Update
                                    </button>
                                </div>
                                <div className="security-card">
                                    <div>
                                        <h3>
                                            Two-factor authentication
                                        </h3>
                                        <p>
                                            Add additional account protection with 2FA.
                                        </p>
                                    </div>
                                    <button>
                                        Enable
                                    </button>
                                </div>
                            </div>
                        </section>
                        <section className="settings-section">
                            <div className="settings-section-header">
                                <h2>
                                    Appearance
                                </h2>
                                <p>
                                    Customize dashboard and repository interface preferences.
                                </p>
                            </div>
                            <div className="appearance-options">
                                <button className="theme-card active-theme">
                                    Dark mode
                                </button>
                                <button className="theme-card">
                                    Light mode
                                </button>
                                <button className="theme-card">
                                    System
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Settings;