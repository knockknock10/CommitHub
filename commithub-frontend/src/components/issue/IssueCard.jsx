import "../../styles/issue.css";
import { useNavigate } from "react-router-dom";
import { IssueIcon, CheckIcon, TagIcon, ClockIcon } from "../ui/icons";

const IssueCard = ({ issue }) => {
    const navigate = useNavigate();
    return (
        <div
            className="issue-card"
            onClick={() => navigate(`/issues/${issue._id}`)}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/issues/${issue._id}`);
                }
            }}
        >
            <div className="issue-card-header">
                <h3>{issue.title}</h3>
                <span className={`issue-card-status ${issue.status}`}>
                    {issue.status === "open" ? (
                        <IssueIcon size={12} />
                    ) : (
                        <CheckIcon size={12} />
                    )}
                    {issue.status}
                </span>
            </div>

            <p className="issue-card-desc">{issue.description}</p>

            <div className="issue-card-footer">
                <span className="issue-card-label">
                    <TagIcon size={12} />
                    {issue.label}
                </span>
                <span className="issue-card-date">
                    <ClockIcon size={12} />
                    {new Date(issue.createdAt).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};

export default IssueCard;
