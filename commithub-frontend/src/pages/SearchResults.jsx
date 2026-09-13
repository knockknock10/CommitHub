import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import StateBlock from "../components/ui/StateBlock";
import { globalSearch } from "../api/searchApi";
import {
    RepoIcon,
    UserIcon,
    BuildingIcon,
    SearchIcon,
} from "../components/ui/icons";

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
                    setError(
                        err.response?.data?.message ||
                            "Search failed. Please try again."
                    );
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

    const runSearch = () => {
        const performSearch = async () => {
            setLoading(true);
            setError("");
            try {
                const data = await globalSearch(query, currentType);
                setResults({
                    repositories: data.repositories || [],
                    users: data.users || [],
                    organizations: data.organizations || [],
                });
                setTotalCount(data.total || 0);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                        "Search failed. Please try again."
                );
            } finally {
                setLoading(false);
            }
        };
        performSearch();
    };

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
            <div className="search-page">
                <header className="search-header">
                    <h1>Search</h1>
                    <p className="dashboard-header-sub">
                        {query
                            ? `${totalCount} result${
                                  totalCount !== 1 ? "s" : ""
                              } found for "${query}"`
                            : "Enter a search query to find content on CommitHub."}
                    </p>
                </header>

                <div className="search-type-tabs" role="tablist">
                    {filterTypes.map((type) => (
                        <button
                            key={type.id}
                            className={`search-type-tab ${
                                currentType === type.id ? "active" : ""
                            }`}
                            onClick={() => handleTypeChange(type.id)}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {loading && (
                    <StateBlock
                        variant="loading"
                        message="Searching for results..."
                    />
                )}

                {error && (
                    <StateBlock
                        variant="error"
                        message={error}
                        retry={runSearch}
                    />
                )}

                {!loading && !error && query && totalCount === 0 && (
                    <div className="search-empty">
                        <SearchIcon
                            size={22}
                            style={{ color: "var(--text-faint)" }}
                        />
                        <p>No results found</p>
                        <span>
                            Try adjusting your query or filter to find what
                            you're looking for.
                        </span>
                    </div>
                )}

                {!loading && !error && (
                    <div className="search-results">
                        {(currentType === "all" ||
                            currentType === "repositories") &&
                            results.repositories.length > 0 && (
                                <div className="search-result-group">
                                    <div className="search-result-group-label">
                                        Repositories
                                    </div>
                                    {results.repositories.map((repo) => (
                                        <Link
                                            to={`/repository/${repo.id}`}
                                            className="search-result-item"
                                            key={repo.id}
                                        >
                                            <span className="search-result-icon repo">
                                                <RepoIcon size={15} />
                                            </span>
                                            <div className="search-result-body">
                                                <span className="search-result-name mono">
                                                    {repo.name}
                                                </span>
                                                <span className="search-result-sub">
                                                    {repo.description ||
                                                        "No description provided."}
                                                </span>
                                            </div>
                                            <span className="search-result-type">
                                                repo
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                        {(currentType === "all" || currentType === "users") &&
                            results.users.length > 0 && (
                                <div className="search-result-group">
                                    <div className="search-result-group-label">
                                        Users
                                    </div>
                                    {results.users.map((user) => (
                                        <Link
                                            to={`/profile/${user.id}`}
                                            className="search-result-item"
                                            key={user.id}
                                        >
                                            <span className="search-result-icon user">
                                                <UserIcon size={15} />
                                            </span>
                                            <div className="search-result-body">
                                                <span className="search-result-name">
                                                    {user.name ||
                                                        user.userName}
                                                </span>
                                                <span className="search-result-sub">
                                                    @{user.userName}
                                                </span>
                                            </div>
                                            <span className="search-result-type">
                                                user
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                        {(currentType === "all" ||
                            currentType === "organizations") &&
                            results.organizations.length > 0 && (
                                <div className="search-result-group">
                                    <div className="search-result-group-label">
                                        Organizations
                                    </div>
                                    {results.organizations.map((org) => (
                                        <Link
                                            to={`/organization/${org.slug}`}
                                            className="search-result-item"
                                            key={org.id}
                                        >
                                            <span className="search-result-icon org">
                                                <BuildingIcon size={15} />
                                            </span>
                                            <div className="search-result-body">
                                                <span className="search-result-name">
                                                    {org.name}
                                                </span>
                                                <span className="search-result-sub">
                                                    {org.description ||
                                                        "No description provided."}
                                                </span>
                                            </div>
                                            <span className="search-result-type">
                                                org
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SearchResults;