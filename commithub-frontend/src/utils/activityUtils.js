export const ACTIVITY_GROUPS = {
    All: [],
    Commits: ["COMMIT_CREATED"],
    Issues: ["ISSUE_CREATED", "ISSUE_COMMENTED"],
    "Pull Requests": [
        "PR_CREATED",
        "PR_COMMENTED",
        "PR_REVIEWED",
        "PR_APPROVED",
        "PR_CHANGES_REQUESTED",
        "PR_MERGED",
        "PR_CLOSED",
        "PR_REOPENED"
    ],
    Releases: ["TAG_CREATED", "RELEASE_PUBLISHED"],
    Branches: ["BRANCH_CREATED"]
};

const startOfDay = (timestamp) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date;
};

export const formatRelativeTime = (timestamp) => {
    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
        return "just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(seconds / 3600);

    if (hours < 24) {
        return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const dayDiff = Math.round(
        (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000
    );

    if (dayDiff === 1) {
        return "yesterday";
    }

    if (dayDiff < 7) {
        return `${dayDiff} day${dayDiff === 1 ? "" : "s"} ago`;
    }

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(date.getFullYear() !== now.getFullYear()
            ? { year: "numeric" }
            : {})
    });
};

export const activityDayGroup = (timestamp) => {
    if (!timestamp) {
        return "Earlier";
    }

    const dayDiff = Math.round(
        (startOfDay(new Date()).getTime() - startOfDay(timestamp).getTime()) /
            86400000
    );

    if (dayDiff <= 0) {
        return "Today";
    }

    if (dayDiff === 1) {
        return "Yesterday";
    }

    return "Earlier";
};

const repoName = (activity) => activity.repository?.name || "";

const withRepo = (prefix, activity) => {
    const name = repoName(activity);
    return name ? `${prefix} ${name}` : prefix;
};

const quotedTitle = (value) => (value ? `"${value}"` : "");

const pullRequestRef = (activity, metadata) => {
    const number = metadata?.pullRequestNumber ?? activity.pullRequest?.number;
    return number ? `#${number}` : "";
};

const reviewText = (type, activity, metadata) => {
    const ref = pullRequestRef(activity, metadata);
    const state = metadata?.reviewState;

    if (type === "PR_APPROVED" || state === "APPROVED") {
        return ref ? `approved pull request ${ref}` : "approved a pull request";
    }

    if (type === "PR_CHANGES_REQUESTED" || state === "CHANGES_REQUESTED") {
        return ref
            ? `requested changes on pull request ${ref}`
            : "requested changes on a pull request";
    }

    return ref ? `reviewed pull request ${ref}` : "reviewed a pull request";
};

export const buildActivityText = (activity) => {
    const { type, metadata } = activity;
    const ref = pullRequestRef(activity, metadata);
    const issueTitle = activity.issue?.title || metadata?.issueTitle || "";

    switch (type) {
        case "REPOSITORY_CREATED":
            return withRepo("created repository", activity);
        case "REPOSITORY_STARRED":
            return withRepo("starred repository", activity);
        case "REPOSITORY_FORKED":
            return withRepo("forked repository", activity);
        case "BRANCH_CREATED":
            return metadata?.branchName
                ? `created branch ${metadata.branchName}`
                : "created a branch";
        case "COMMIT_CREATED":
            return metadata?.commitMessage
                ? `pushed commit ${quotedTitle(metadata.commitMessage)}`
                : "pushed a commit";
        case "ISSUE_CREATED":
            return issueTitle
                ? `opened issue ${quotedTitle(issueTitle)}`
                : "opened an issue";
        case "ISSUE_COMMENTED":
            return issueTitle
                ? `commented on issue ${quotedTitle(issueTitle)}`
                : "commented on an issue";
        case "PR_CREATED":
            return ref ? `opened pull request ${ref}` : "opened a pull request";
        case "PR_COMMENTED":
            return ref
                ? `commented on pull request ${ref}`
                : "commented on a pull request";
        case "PR_REVIEWED":
        case "PR_APPROVED":
        case "PR_CHANGES_REQUESTED":
            return reviewText(type, activity, metadata);
        case "PR_MERGED":
            return ref ? `merged pull request ${ref}` : "merged a pull request";
        case "PR_CLOSED":
            return ref ? `closed pull request ${ref}` : "closed a pull request";
        case "PR_REOPENED":
            return ref
                ? `reopened pull request ${ref}`
                : "reopened a pull request";
        case "TAG_CREATED":
            return metadata?.tagName
                ? `created tag ${metadata.tagName}`
                : "created a tag";
        case "RELEASE_PUBLISHED": {
            const title = metadata?.releaseTitle || activity.release?.title;
            return title
                ? `published release ${quotedTitle(title)}`
                : "published a release";
        }
        case "COLLABORATOR_ADDED":
            return withRepo("added a collaborator to repository", activity);
        case "COLLABORATOR_UPDATED":
            return withRepo("updated collaborator access in repository", activity);
        case "COLLABORATOR_REMOVED":
            return withRepo("removed a collaborator from repository", activity);
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
        case "PR_APPROVED":
        case "PR_CHANGES_REQUESTED":
        case "PR_MERGED":
        case "PR_CLOSED":
        case "PR_REOPENED":
            return repositoryId
                ? {
                    path: `/repository/${repositoryId}`,
                    state: { tab: "pullrequests" }
                }
                : null;
        case "TAG_CREATED":
        case "RELEASE_PUBLISHED":
            return repositoryId
                ? {
                    path: `/repository/${repositoryId}`,
                    state: { tab: "releases" }
                }
                : null;
        case "COMMIT_CREATED":
            return repositoryId
                ? {
                    path: `/repository/${repositoryId}`,
                    state: { tab: "commits" }
                }
                : null;
        case "BRANCH_CREATED":
            return repositoryId
                ? {
                    path: `/repository/${repositoryId}`,
                    state: { tab: "branches" }
                }
                : null;
        case "REPOSITORY_CREATED":
        case "REPOSITORY_STARRED":
        case "REPOSITORY_FORKED":
        case "COLLABORATOR_ADDED":
        case "COLLABORATOR_UPDATED":
        case "COLLABORATOR_REMOVED":
            return repositoryId
                ? { path: `/repository/${repositoryId}` }
                : null;
        default:
            return null;
    }
};

export const activityTone = (type) => {
    if (type === "COMMIT_CREATED") {
        return "commit";
    }

    if (type?.startsWith("PR_")) {
        return "pr";
    }

    if (type === "ISSUE_CREATED" || type === "ISSUE_COMMENTED") {
        return "issue";
    }

    if (type === "BRANCH_CREATED") {
        return "branch";
    }

    if (type === "TAG_CREATED" || type === "RELEASE_PUBLISHED") {
        return "release";
    }

    if (type === "REPOSITORY_STARRED") {
        return "star";
    }

    if (type === "REPOSITORY_FORKED") {
        return "fork";
    }

    if (type?.startsWith("COLLABORATOR_")) {
        return "collaborator";
    }

    return "repo";
};