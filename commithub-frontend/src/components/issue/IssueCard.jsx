import "../../styles/issue.css";
const IssueCard = ({ issue }) => {

    return (
        <div className="issue-card">

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