export const ACTIVITY_GROUPS = {
    All: [],
    Commits: ["COMMIT_CREATED"],
    Issues: ["ISSUE_CREATED", "ISSUE_COMMENTED"],
    "Pull Requests": [
        "PR_CREATED",
        "PR_COMMENTED",
        "PR_REVIEWED",
        "PR_MERGED"
    ],
    Releases: ["TAG_CREATED", "RELEASE_PUBLISHED"],
    Branches: ["BRANCH_CREATED"]
};

export const formatRelativeTime = (timestamp) => {
    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
        return "just now";
    }

    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)} minutes ago`;
    }

    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)} hours ago`;
    }

    const days = Math.floor(seconds / 86400);

    if (days < 7) {
        return `${days} day${days === 1 ? "" : "s"} ago`;
    }

    return date.toLocaleDateString();
};

export const buildActivityText = (activity) => {
    const { type, metadata } = activity;

    switch (type) {
        case "REPOSITORY_CREATED":
            return `created repository ${activity.repository?.name || ""}`;
        case "BRANCH_CREATED":
            return `created branch ${metadata?.branchName || ""}`;
        case "COMMIT_CREATED":
            return metadata?.commitMessage
                ? `created commit "${metadata.commitMessage}"`
                : "created a commit";
        case "ISSUE_CREATED":
            return `opened issue ${activity.issue?.title
                ? `"${activity.issue.title}"`
                : metadata?.issueTitle
                    ? `"${metadata.issueTitle}"`
                    : ""}`;
        case "ISSUE_COMMENTED":
            return `commented on issue ${activity.issue?.title
                ? `"${activity.issue.title}"`
                : metadata?.issueTitle
                    ? `"${metadata.issueTitle}"`
                    : ""}`;
        case "PR_CREATED":
            return `opened pull request #${metadata?.pullRequestNumber ?? ""}`;
        case "PR_COMMENTED":
            return `commented on pull request #${metadata?.pullRequestNumber ?? ""}`;
        case "PR_REVIEWED":
            return `reviewed pull request #${metadata?.pullRequestNumber ?? ""}`;
        case "PR_MERGED":
            return `merged pull request #${metadata?.pullRequestNumber ?? ""}`;
        case "TAG_CREATED":
            return `created tag ${metadata?.tagName || ""}`;
        case "RELEASE_PUBLISHED":
            return `published release ${metadata?.releaseTitle
                ? `"${metadata.releaseTitle}"`
                : activity.release?.title
                    ? `"${activity.release.title}"`
                    : ""}`;
        case "REPOSITORY_STARRED":
            return `starred repository ${activity.repository?.name || ""}`;
        default:
            return "";
    }
};

const repositoryIdOf = (activity) =>
    activity.repository?._id || activity.repository || null;

export const activityTarget = (activity) => {
    const repositoryId = repositoryIdOf(activity);

    switch (activity.type) {
        case "ISSUE_CREATED":
        case "ISSUE_COMMENTED":
            return activity.issue?._id
                ? { path: `/issues/${activity.issue._id}` }
                : null;
        case "PR_CREATED":
        case "PR_COMMENTED":
        case "PR_REVIEWED":
        case "PR_MERGED":
            return repositoryId
                ? {
                    path: `/repo/${repositoryId}`,
                    state: { tab: "pull-requests" }
                }
                : null;
        case "TAG_CREATED":
        case "RELEASE_PUBLISHED":
            return repositoryId
                ? {
                    path: `/repo/${repositoryId}`,
                    state: { tab: "releases" }
                }
                : null;
        case "COMMIT_CREATED":
            return repositoryId
                ? {
                    path: `/repo/${repositoryId}`,
                    state: { tab: "commits" }
                }
                : null;
        case "BRANCH_CREATED":
            return repositoryId
                ? {
                    path: `/repo/${repositoryId}`,
                    state: { tab: "branches" }
                }
                : null;
        case "REPOSITORY_CREATED":
        case "REPOSITORY_STARRED":
            return repositoryId
                ? { path: `/repo/${repositoryId}` }
                : null;
        default:
            return null;
    }
};

export const activityDotClass = (type) => {
    if (type === "COMMIT_CREATED") {
        return "commit";
    }

    if (type.startsWith("PR_")) {
        return "merge";
    }

    if (type === "BRANCH_CREATED") {
        return "branch";
    }

    if (type === "ISSUE_CREATED" || type === "ISSUE_COMMENTED") {
        return "issue";
    }

    if (type === "TAG_CREATED" || type === "RELEASE_PUBLISHED") {
        return "release";
    }

    return "repo";
};
