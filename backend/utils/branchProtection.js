import BranchProtection from "../models/branchProtectionModel.js";

export const loadBranchProtection = async (repositoryId, branch) =>
    BranchProtection.findOne({
        repository: repositoryId,
        branch
    });

/* Staleness is computed, never stored: an approval counts only while the
   source branch head is still the exact commit the review was recorded
   against. This stays correct for every path that advances the branch
   (commit API, conflict resolution, direct ref writes) without needing
   invalidation hooks. */
const isReviewStale = (review, sourceCommitId, dismissStaleReviews) => {
    if (!dismissStaleReviews) {
        return false;
    }

    return (
        !review.reviewedCommit ||
        review.reviewedCommit !== sourceCommitId
    );
};

/* Derives the current review state and approval counts from actual
   reviews. Without protection (or with dismissal off) this reproduces
   the historical aggregate behavior exactly: any active
   changes_requested blocks, any approval satisfies the state.
   Approvals toward the requirement are counted per distinct reviewer. */
export const evaluateReviewRequirements = ({
    reviews,
    sourceCommitId,
    protection
}) => {
    const enabled = protection?.enabled === true;
    const dismissStaleReviews =
        protection?.dismissStaleReviews === true;

    const allReviews = reviews || [];
    const activeReviews = allReviews.filter(
        (review) =>
            !isReviewStale(review, sourceCommitId, dismissStaleReviews)
    );

    const activeStates = activeReviews.map(
        (review) => review.state
    );

    let reviewState;

    if (activeStates.includes("changes_requested")) {
        reviewState = "changes_requested";
    } else if (activeStates.includes("approved")) {
        reviewState = "approved";
    } else if (activeStates.length > 0) {
        reviewState = "commented";
    } else {
        reviewState = "pending";
    }

    const approvalReviewerIds = new Set(
        activeReviews
            .filter((review) => review.state === "approved")
            .map((review) => review.reviewer.toString())
    );

    const requiredApprovals = enabled
        ? protection.requiredApprovals
        : 0;
    const approvalsReceived = approvalReviewerIds.size;
    const changesRequested =
        activeStates.includes("changes_requested");
    const staleReviews = allReviews.length - activeReviews.length;

    return {
        enabled,
        requiredApprovals,
        dismissStaleReviews,
        approvalsReceived,
        changesRequested,
        staleReviews,
        reviewState,
        approvalsSatisfied:
            !enabled ||
            (!changesRequested &&
                approvalsReceived >= requiredApprovals)
    };
};

const plural = (count) => (count === 1 ? "" : "s");

/* Structured merge-block reasons derived from the engine-level status
   plus the review requirements. The codes double as stable API values
   for the frontend. */
export const buildMergeBlockReasons = (baseStatus, evaluation) => {
    const reasons = [];

    if (baseStatus === "CONFLICTS") {
        reasons.push({
            code: "CONFLICTS",
            message:
                "This pull request has merge conflicts that must be resolved."
        });
    }

    if (!evaluation.enabled) {
        return reasons;
    }

    if (evaluation.changesRequested) {
        reasons.push({
            code: "CHANGES_REQUESTED",
            message:
                "Changes were requested by a reviewer and must be resolved before merging."
        });
    }

    const shortfall =
        evaluation.requiredApprovals - evaluation.approvalsReceived;

    if (shortfall > 0) {
        if (evaluation.approvalsReceived === 0) {
            reasons.push({
                code: "REVIEW_REQUIRED",
                message: `${evaluation.requiredApprovals} approval${plural(evaluation.requiredApprovals)} required; none received yet.`
            });
        } else {
            reasons.push({
                code: "INSUFFICIENT_APPROVALS",
                message: `${evaluation.requiredApprovals} approvals required; ${evaluation.approvalsReceived} approval${plural(evaluation.approvalsReceived)} received.`
            });
        }

        if (evaluation.staleReviews > 0) {
            reasons.push({
                code: "STALE_REVIEWS",
                message: `${evaluation.staleReviews} review${plural(evaluation.staleReviews)} became stale after the source branch advanced.`
            });
        }
    }

    return reasons;
};
