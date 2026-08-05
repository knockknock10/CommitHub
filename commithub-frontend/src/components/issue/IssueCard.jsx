import "../../styles/issue.css";
import { useNavigate } from "react-router-dom";
const IssueCard = ({ issue }) => {
    const navigate = useNavigate();
    return (
        <div className="issue-card" onClick={()=>navigate(`/issues/${issue._id}`)}>
            <div className="issue-card-header">
                <h3>{issue.title}</h3>
                <span className={issue.status}>
                    {issue.status}
                </span>
            </div>

            <p>{issue.description}</p>
            
            <div className="issue-card-footer">
                <span>{issue.label}</span>
                <span>
                    {new Date(
                        issue.createdAt
                    ).toLocaleDateString()}
                </span>
            </div>

        </div>
    );
};

export default IssueCard;