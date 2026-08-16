import { useNavigate } from "react-router-dom";
import {
    activityDotClass,
    activityTarget,
    buildActivityText,
    formatRelativeTime
} from "../../utils/activityUtils";

const ActivityItem = ({ activity, variant = "timeline" }) => {
    const navigate = useNavigate();
    const target = activityTarget(activity);
    const actor = activity.actor?.userName || "Someone";
    const text = buildActivityText(activity);
    const repoName = activity.repository?.name;

    const handleClick = () => {
        if (!target) {
            return;
        }

        navigate(
            target.path,
            target.state ? { state: target.state } : undefined
        );
    };

    if (variant === "panel") {
        return (
            <div
                className="activity-item"
                onClick={handleClick}
                style={target ? { cursor: "pointer" } : undefined}
            >
                <div className="activity-dot"></div>
                <div>
                    <h4>
                        {actor} {text}
                    </h4>
                    <span>{formatRelativeTime(activity.createdAt)}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="timeline-item"
            onClick={handleClick}
            style={target ? { cursor: "pointer" } : undefined}
        >
            <div
                className={`timeline-dot ${activityDotClass(activity.type)}`}
            ></div>
            <div className="timeline-content">
                <div className="timeline-top">
                    <h2>
                        {actor} {text}
                    </h2>
                    <span>{formatRelativeTime(activity.createdAt)}</span>
                </div>
                <div className="timeline-meta">
                    {repoName && <span>{repoName}</span>}
                </div>
            </div>
        </div>
    );
};

export default ActivityItem;
