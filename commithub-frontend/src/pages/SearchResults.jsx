import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { globalSearch } from "../api/searchApi";

import "../styles/search.css";

const SearchResults = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const currentType = searchParams.get("type") || "all";

    const [results, setResults] = useState({ 
        repositories: [], 
        users: [], 
        organizations: [] 
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (!query || query.length < 3) {
            setResults({ repositories: [], users: [], organizations: [] });
            setTotalCount(0);
            return;
        }

        let isMounted = true;

        const performSearch = async () => {
            setLoading(true);
            setError("");
            try {
                const data = await globalSearch(query, currentType);
                if (isMounted) {
                    setResults({
                        repositories: data.repositories || [],
                        users: data.users || [],
                        organizations: data.organizations || [],
                    });
                    setTotalCount(data.total || 0);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.response?.data?.message || "Search failed. Please try again.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        performSearch();

        return () => {
            isMounted = false;
        };
    }, [query, currentType]);

    const handleTypeChange = (type) => {
        setSearchParams({ q: query, type });
    };

    const filterTypes = [
        { id: "all", label: "All" },
        { id: "repositories", label: "Repositories" },
        { id: "users", label: "Users" },
        { id: "organizations", label: "Organizations" },
    ];

    return (
        <DashboardLayout>
            <div className="search-results-page">
                <header className="search-header">
                    <h1>Search results</h1>
                    <p>
                        {query
                            ? `${totalCount} result${totalCount !== 1 ? "s" : ""} found for "${query}"`
                            : "Enter a search query to find content on CommitHub."}
                    </p>
                </header>

                <nav className="search-filters">
                    {filterTypes.map((type) => (
                        <button 
                            key={type.id} 
                            className={`filter-tab ${currentType === type.id ? "active" : ""}`}
                            onClick={() => handleTypeChange(type.id)}
                        >
                            {type.label}
                        </button>
                    ))}
                </nav>

                {loading && <div className="search-empty"><p>Searching for results...</p></div>}

                {error && <div className="search-empty"><p>{error}</p></div>}

                {!loading && !error && query && totalCount === 0 && (
                    <div className="search-empty">
                        <h3>No results found</h3>
                        <p>Try adjusting your search query or filters to find what you are looking for.</p>
                    </div>
                )}

                {!loading && !error && (
                    <div className="result-groups">
                        {/* Repositories */}
                        {(currentType === "all" || currentType === "repositories") && results.repositories.length > 0 && (
                            <div className="result-group">
                                <h2>Repositories</h2>
                                <div className="result-list">
                                    {results.repositories.map((repo) => (
                                        <div className="result-card" key={repo.id}>
                                            <div className="result-main">
                                                <div className="result-title-row">
                                                    <Link to={`/repo/${repo.id}`} className="result-title">
                                                        {repo.name}
                                                    </Link>
                                                    <span className="result-badge">{repo.visibility}</span>
                                                </div>
                                                <p className="result-description">{repo.description || "No description provided."}</p>
                                                <div className="result-meta">
                                                    <span>&#9733; {repo.stars || 0}</span>
                                                    <span>forks {repo.forks || 0}</span>
                                                </div>
                                            </div>
                                            <Link
                                                to={`/repo/${repo.id}`}
                                                className="result-action-btn"
                                            >
                                                Open
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Users */}
                        {(currentType === "all" || currentType === "users") && results.users.length > 0 && (
                            <div className="result-group">
                                <h2>Users</h2>
                                <div className="result-list">
                                    {results.users.map((user) => (
                                        <div className="result-card" key={user.id}>
                                            <div className="result-main">
                                                <div className="result-title-row">
                                                    <Link to={`/profile/${user.id}`} className="result-title">
                                                        {user.userName}
                                                    </Link>
                                                </div>
                                                <p className="result-description">{user.email || "No email provided."}</p>
                                            </div>
                                            <Link
                                                to={`/profile/${user.id}`}
                                                className="result-action-btn"
                                            >
                                                View Profile
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Organizations */}
                        {(currentType === "all" || currentType === "organizations") && results.organizations.length > 0 && (
                            <div className="result-group">
                                <h2>Organizations</h2>
                                <div className="result-list">
                                    {results.organizations.map((org) => (
                                        <div className="result-card" key={org.id}>
                                            <div className="result-main">
                                                <div className="result-title-row">
                                                    <Link to={`/organization/${org.slug}`} className="result-title">
                                                        {org.name}
                                                    </Link>
                                                </div>
                                                <p className="result-description">{org.description || "No description provided."}</p>
                                            </div>
                                            <Link
                                                to={`/organization/${org.slug}`}
                                                className="result-action-btn"
                                            >
                                                View Organization
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SearchResults;
