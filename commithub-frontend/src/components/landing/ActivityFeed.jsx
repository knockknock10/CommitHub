import { useState, useEffect } from "react";

const ActivityFeed = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const activities = [
        { user: "@dev_magic", action: "pushed to", target: "react-core", time: "2m ago" },
        { user: "@code_wizard", action: "opened PR #102 in", target: "nextjs-plugin", time: "5m ago" },
        { user: "@system_arch", action: "merged", target: "auth-service", time: "12m ago" },
        { user: "@ruby_gem", action: "created issue #5 in", target: "rails-app", time: "18m ago" },
        { user: "@frontend_pro", action: "starred", target: "vite-plugin-xyz", time: "22m ago" },
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % activities.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [activities.length]);

    return (
        <div className="landing-activity-feed">
            <div className="activity-feed-header">
                <span className="activity-pulse" />
                <span className="activity-title">Live Community Activity</span>
            </div>
            <div className="activity-feed-content">
                <div className="activity-item" key={currentIndex}>
                    <span className="activity-user">{activities[currentIndex].user}</span>
                    <span className="activity-action">{activities[currentIndex].action}</span>
                    <span className="activity-target">{activities[currentIndex].target}</span>
                    <span className="activity-time">{activities[currentIndex].time}</span>
                </div>
            </div>
        </div>
    );
};

export default ActivityFeed;
