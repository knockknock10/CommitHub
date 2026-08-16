import { useEffect, useState } from "react";
import ActivityItem from "../activity/ActivityItem";
import { fetchRepositoryActivity } from "../../api/activityApi";
import { ACTIVITY_GROUPS } from "../../utils/activityUtils";

const PAGE_SIZE = 20;
const FILTERS = Object.keys(ACTIVITY_GROUPS);

const RepositoryActivity = ({ repository }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        let isMounted = true;

        const loadActivity = async () => {
            setLoading(true);
            setError("");

            const params = { limit: PAGE_SIZE, page };

            const types = ACTIVITY_GROUPS[filter];

            if (types.length > 0) {
                params.type = types.join(",");
            }

            try {
                const data = await fetchRepositoryActivity(
                    repository._id,
                    params
                );

                if (isMounted) {
                    setActivities(data.activities || []);
                    setTotalPages(data.pages || 1);
                }
            } catch (error) {
                if (isMounted) {
                    setError(
                        error.response?.data?.message ||
                        "Failed to load activity"
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadActivity();

        return () => {
            isMounted = false;
        };
    }, [repository._id, filter, page]);

    const handleFilterChange = (nextFilter) => {
        setFilter(nextFilter);
        setPage(1);
    };

    return (
        <div className="repository-section">
            <h2>Activity</h2>

            <div className="activity-filters">
                {FILTERS.map((name) => (
                    <button
                        key={name}
                        className={
                            filter === name
                                ? "activity-filter active"
                                : "activity-filter"
                        }
                        onClick={() => handleFilterChange(name)}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {loading && <p>Loading activity...</p>}

            {error && <p>{error}</p>}

            {!loading && !error && activities.length === 0 && (
                <p className="activity-empty">No activity yet.</p>
            )}

            {!loading && !error && activities.length > 0 && (
                <div className="activity-timeline">
                    {activities.map((activity) => (
                        <ActivityItem
                            key={activity._id}
                            activity={activity}
                        />
                    ))}
                </div>
            )}

            {!loading && totalPages > 1 && (
                <div className="activity-pagination">
                    <button
                        className="activity-filter"
                        disabled={page <= 1}
                        onClick={() => setPage((prev) => prev - 1)}
                    >
                        Previous
                    </button>
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="activity-filter"
                        disabled={page >= totalPages}
                        onClick={() => setPage((prev) => prev + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default RepositoryActivity;
