import { useEffect, useState } from "react";
import { getIssues } from "../../api/issueApi";
import IssueCard from "./IssueCard";
import CreateIssue from "./CreateIssue";

const IssueList = ({ repositoryId }) => {

    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        const loadIssues = async () => {
            try {
                const data =
                    await getIssues(
                        repositoryId
                    );

                if (isMounted) {
                    setIssues(
                        data.issues || []
                    );
                }
            } catch (err) {
                console.log(err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadIssues();

        return () => {
            isMounted = false;
        };
    }, [repositoryId, reload]);

    if (loading) {
        return (
            <p>Loading issues...</p>
        );
    }

    return (

        <div>
            <CreateIssue
                repositoryId={repositoryId}
                onIssueCreated={() =>
                    setReload(
                        prev => !prev
                    )
                }
            />

            {issues.length === 0 ? (
                <p>No issues found.</p>
            ) : (

                issues.map((issue) => (
                    <IssueCard
                        key={issue._id}
                        issue={issue}
                    />

                ))

            )}

        </div>
    );
};

export default IssueList;