import { useNavigate, Link } from "react-router-dom";
import {
    activityTarget,
    buildActivityText,
    formatRelativeTime,
    activityTone
} from "../../utils/activityUtils";
import {
    GitCommitIcon,
    PullRequestIcon,
    GitMergeIcon,
    BranchIcon,
    IssueIcon,
    MessageIcon,
    TagIcon,
    RepoIcon,
    StarIcon,
    UsersIcon
} from "../ui/icons";

const ACTIVITY_ICONS = {
    COMMIT_CREATED: GitCommitIcon,
    PR_MERGED: GitMergeIcon,
    PR_CREATED: PullRequestIcon,
    PR_COMMENTED: PullRequestIcon,
    PR_REVIEWED: PullRequestIcon,
    PR_APPROVED: PullRequestIcon,
    PR_CHANGES_REQUESTED: PullRequestIcon,
    PR_CLOSED: PullRequestIcon,
    PR_REOPENED: PullRequestIcon,
    BRANCH_CREATED: BranchIcon,
    ISSUE_CREATED: IssueIcon,
    ISSUE_COMMENTED: MessageIcon,
    TAG_CREATED: TagIcon,
    RELEASE_PUBLISHED: TagIcon,
    REPOSITORY_STARRED: StarIcon,
    REPOSITORY_CREATED: RepoIcon,
    REPOSITORY_FORKED: RepoIcon,
    COLLABORATOR_ADDED: UsersIcon,
    COLLABORATOR_UPDATED: UsersIcon,
    COLLABORATOR_REMOVED: UsersIcon
};

const toInitials = (name) => (name ? name.slice(0, 2).toUpperCase() : "??");

const Avatar = ({ actor }) => (
    <span className="activity-avatar" aria-hidden="true">
        {toInitials(actor?.userName)}
    </span>
);

const RepoLink = ({ repository, className, onClick }) => {
    if (!repository?._id) {
        return null;
    }

    const owner = repository.owner?.userName
        ? `${repository.owner.userName}/`
        : "";

    return (
        <Link
            to={`/repository/${repository._id}`}
            className={className}
            onClick={onClick}
        >
            <RepoIcon size={12} />
            <span>
                {owner}
                {repository.name}
            </span>
        </Link>
    );
};

const ActivityItem = ({ activity }) => {
    const navigate = useNavigate();
    const target = activityTarget(activity);
    const text = buildActivityText(activity);
    const Icon = ACTIVITY_ICONS[activity.type] || RepoIcon;
    const tone = activityTone(activity.type);
    const actorId = activity.actor?._id || activity.actor;
    const actorName = activity.actor?.userName || "Someone";

    const handleClick = () => {
        if (target) {
            navigate(
                target.path,
                target.state ? { state: target.state } : undefined
            );
        }
    };

    const stop = (e) => e.stopPropagation();

    return (
        <div
            className="activity-item"
            onClick={handleClick}
            style={target ? { cursor: "pointer" } : undefined}
        >
            <span className={`activity-event-icon ${tone}`}>
                <Icon size={14} />
            </span>

            <div className="activity-body">
                <p className="activity-text">
                    <span className="activity-actor">
                        <Avatar actor={activity.actor} />
                        {actorId ? (
                            <Link
                                to={`/profile/${actorId}`}
                                className="activity-actor-name"
                                onClick={stop}
                            >
                                {actorName}
                            </Link>
                        ) : (
                            <span className="activity-actor-name">
                                {actorName}
                            </span>
                        )}
                    </span>
                    {" "}
                    {text}
                </p>

                <div className="activity-meta">
                    <RepoLink
                        repository={activity.repository}
                        className="activity-repo-link"
                        onClick={stop}
                    />
                    <span className="activity-meta-sep" aria-hidden="true">
                        ·
                    </span>
                    <time className="activity-time">
                        {formatRelativeTime(activity.createdAt)}
                    </time>
                </div>
            </div>
        </div>
    );
};

export default ActivityItem;