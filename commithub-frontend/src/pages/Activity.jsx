import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import ActivityItem from "../components/activity/ActivityItem";
import { fetchActivity } from "../api/activityApi";
import {
    ACTIVITY_GROUPS,
    activityDayGroup
} from "../utils/activityUtils";
import { useRealtimeEvent } from "../hooks/useRealtimeEvent";

import "../styles/activity.css";

const PAGE_SIZE = 20;
const FILTERS = Object.keys(ACTIVITY_GROUPS);

const Activity = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("All");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const loadActivity = async () => {
            setLoading(true);
            setError("");

            const types = ACTIVITY_GROUPS[filter];
            const params = { limit: PAGE_SIZE, page };

            if (types.length > 0) {
                params.type = types.join(",");
            }

            try {
                const data = await fetchActivity(params);

                if (isMounted) {
                    setActivities(data.activities || []);
                    setTotalPages(data.pages || 1);
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        err.response?.data?.message ||
                            "Unable to load activity."
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
    }, [filter, page, reloadToken]);

    const handleFilterChange = (nextFilter) => {
        setFilter(nextFilter);
        setPage(1);
    };

    const grouped = useMemo(() => {
        const groups = [];

        for (const activity of activities) {
            const label = activityDayGroup(activity.createdAt);
            const last = groups[groups.length - 1];

            if (last && last.label === label) {
                last.items.push(activity);
            } else {
                groups.push({ label, items: [activity] });
            }
        }

        return groups;
    }, [activities]);

    useRealtimeEvent("ACTIVITY_CREATED", (event) => {
        if (page !== 1) {
            return;
        }

        const groupTypes = ACTIVITY_GROUPS[filter] || [];

        if (
            groupTypes.length > 0 &&
            !groupTypes.includes(event.activityType)
        ) {
            return;
        }

        setActivities((prev) => {
            if (prev.some((a) => a._id === event.activityId)) {
                return prev;
            }

            return [
                {
                    _id: event.activityId,
                    type: event.activityType,
                    actor: event.actor,
                    repository: event.repositoryId,
                    issue: event.issueId,
                    pullRequest: event.pullRequestId,
                    createdAt: event.createdAt
                },
                ...prev
            ].slice(0, PAGE_SIZE);
        });
    });

    return (
        <DashboardLayout>
            <div className="activity-page">
                <header className="activity-page-header">
                    <h1 className="activity-page-title">Activity</h1>
                    <p className="activity-page-subtitle">
                        Commits, issues, pull requests, releases, and branches
                        across repositories you can access.
                    </p>
                </header>

                <div
                    className="activity-filters"
                    role="tablist"
                    aria-label="Activity filters"
                >
                    {FILTERS.map((name) => (
                        <button
                            key={name}
                            type="button"
                            role="tab"
                            aria-selected={filter === name}
                            className={`activity-filter ${
                                filter === name ? "active" : ""
                            }`}
                            onClick={() => handleFilterChange(name)}
                        >
                            {name}
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="activity-loading" role="status">
                        Loading activity...
                    </div>
                )}

                {!loading && error && (
                    <div className="activity-error" role="alert">
                        <p>{error}</p>
                        <button
                            type="button"
                            className="state-btn"
                            onClick={() => setReloadToken((prev) => prev + 1)}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && activities.length === 0 && (
                    <div className="activity-empty">
                        <p>No recent activity.</p>
                    </div>
                )}

                {!loading && !error && activities.length > 0 && (
                    <div className="activity-stream">
                        {grouped.map((group) => (
                            <section
                                className="activity-group"
                                key={group.label}
                            >
                                <h2 className="activity-group-label">
                                    {group.label}
                                </h2>
                                <ul className="activity-list">
                                    {group.items.map((activity) => (
                                        <li key={activity._id}>
                                            <ActivityItem
                                                activity={activity}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <div className="activity-pagination">
                        <button
                            type="button"
                            className="btn outline small"
                            disabled={page <= 1}
                            onClick={() => setPage((prev) => prev - 1)}
                        >
                            Previous
                        </button>
                        <span className="pagination-info">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn outline small"
                            disabled={page >= totalPages}
                            onClick={() => setPage((prev) => prev + 1)}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Activity;