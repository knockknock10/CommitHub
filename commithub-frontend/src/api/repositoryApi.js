import api from "./axios";

const O = (e) => { if (e && e.offline) throw new Error("Server unreachable"); throw e; };

export const fetchRepositories = async () => {
    try { const r = await api.get("/repositories"); return r.data; } catch (e) { O(e); }
};
export const fetchCollaboratingRepositories = async () => {
    try { const r = await api.get("/repositories/collaborating"); return r.data; } catch (e) { O(e); }
};
export const createRepository = async (repodata) => {
    try { const r = await api.post("/repositories", repodata); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryById = async (id) => {
    try { const r = await api.get(`/repositories/${id}`); return r.data; } catch (e) { O(e); }
};
export const starRepository = async (id) => {
    try { const r = await api.patch(`/repositories/${id}/star`); return r.data; } catch (e) { O(e); }
};
export const unstarRepository = async (id) => {
    try { const r = await api.patch(`/repositories/${id}/unstar`); return r.data; } catch (e) { O(e); }
};
export const updateRepository = async (id, data) => {
    try { const r = await api.patch(`/repositories/${id}`, data); return r.data; } catch (e) { O(e); }
};
export const deleteRepository = async (id) => {
    try { const r = await api.delete(`/repositories/${id}`); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryTree = async (id, path = "") => {
    try { const r = await api.get(`/repositories/${id}/tree`, { params: { path } }); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryBranchTree = async (id, branch, path = "") => {
    try { const r = await api.get(`/repositories/${id}/branch-tree`, { params: { branch, path } }); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryFile = async (id, filePath) => {
    try { const r = await api.get(`/repositories/${id}/file`, { params: { path: filePath } }); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryBranchBlob = async (id, branch, filePath) => {
    try { const r = await api.get(`/repositories/${id}/branch-blob`, { params: { branch, path: filePath } }); return r.data; } catch (e) { O(e); }
};
export const createRepositoryFile = async (id, path, content) => {
    try { const r = await api.post(`/repositories/${id}/file`, { path, content }); return r.data; } catch (e) { O(e); }
};
export const updateRepositoryFile = async (id, path, content, expectedHash) => {
    try { const r = await api.put(`/repositories/${id}/file`, { path, content, expectedHash }); return r.data; } catch (e) { O(e); }
};
export const deleteRepositoryFile = async (id, path) => {
    try { const r = await api.delete(`/repositories/${id}/file`, { params: { path } }); return r.data; } catch (e) { O(e); }
};
export const createRepositoryDirectory = async (id, path) => {
    try { const r = await api.post(`/repositories/${id}/directory`, { path }); return r.data; } catch (e) { O(e); }
};
export const deleteRepositoryDirectory = async (id, path) => {
    try { const r = await api.delete(`/repositories/${id}/directory`, { params: { path } }); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryBranches = async (id) => {
    try { const r = await api.get(`/repositories/${id}/branches`); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryChanges = async (id) => {
    try { const r = await api.get(`/repositories/${id}/changes`); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryCommits = async (id, limit, offset) => {
    try { const r = await api.get(`/repositories/${id}/commits`, { params: { limit, offset } }); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryCommit = async (id, commitId) => {
    try { const r = await api.get(`/repositories/${id}/commits/${commitId}`); return r.data; } catch (e) { O(e); }
};
export const createRepositoryCommit = async (id, message) => {
    try { const r = await api.post(`/repositories/${id}/commits`, { message }); return r.data; } catch (e) { O(e); }
};
export const fetchPullRequests = async (id, params) => {
    try { const r = await api.get(`/repositories/${id}/pull-requests`, { params }); return r.data; } catch (e) { O(e); }
};
export const fetchPullRequest = async (id, number) => {
    try { const r = await api.get(`/repositories/${id}/pull-requests/${number}`); return r.data; } catch (e) { O(e); }
};
export const createPullRequest = async (id, data) => {
    try { const r = await api.post(`/repositories/${id}/pull-requests`, data); return r.data; } catch (e) { O(e); }
};
export const closePullRequest = async (id, number) => {
    try { const r = await api.post(`/repositories/${id}/pull-requests/${number}/close`); return r.data; } catch (e) { O(e); }
};
export const reopenPullRequest = async (id, number) => {
    try { const r = await api.post(`/repositories/${id}/pull-requests/${number}/reopen`); return r.data; } catch (e) { O(e); }
};
export const submitPullRequestReview = async (id, number, data) => {
    try { const r = await api.post(`/repositories/${id}/pull-requests/${number}/reviews`, data); return r.data; } catch (e) { O(e); }
};
export const fetchPullRequestReviews = async (id, number) => {
    try { const r = await api.get(`/repositories/${id}/pull-requests/${number}/reviews`); return r.data; } catch (e) { O(e); }
};
export const updatePullRequestReview = async (id, number, reviewId, data) => {
    try { const r = await api.patch(`/repositories/${id}/pull-requests/${number}/reviews/${reviewId}`, data); return r.data; } catch (e) { O(e); }
};
export const addPullRequestComment = async (id, number, data) => {
    try { const r = await api.post(`/repositories/${id}/pull-requests/${number}/comments`, data); return r.data; } catch (e) { O(e); }
};
export const mergePullRequest = async (id, number) => {
    try { const r = await api.post(`/repositories/${id}/pull-requests/${number}/merge`); return r.data; } catch (e) { O(e); }
};
export const fetchPullRequestMergeStatus = async (id, number) => {
    try { const r = await api.get(`/repositories/${id}/pull-requests/${number}/merge-status`); return r.data; } catch (e) { O(e); }
};
export const fetchBranchProtection = async (id, branch) => {
    try { const r = await api.get(`/repositories/${id}/branch-protection/${encodeURIComponent(branch)}`); return r.data; } catch (e) { O(e); }
};
export const updateBranchProtection = async (id, branch, data) => {
    try { const r = await api.put(`/repositories/${id}/branch-protection/${encodeURIComponent(branch)}`, data); return r.data; } catch (e) { O(e); }
};
export const fetchPullRequestConflict = async (id, number, path) => {
    try { const r = await api.get(`/repositories/${id}/pull-requests/${number}/conflicts`, { params: { path } }); return r.data; } catch (e) { O(e); }
};
export const resolvePullRequestConflicts = async (id, number, data) => {
    try { const r = await api.post(`/repositories/${id}/pull-requests/${number}/conflicts/resolve`, data); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryTags = async (id, params) => {
    try { const r = await api.get(`/repositories/${id}/tags`, { params }); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryTag = async (id, tagName) => {
    try { const r = await api.get(`/repositories/${id}/tags/${tagName}`); return r.data; } catch (e) { O(e); }
};
export const createRepositoryTag = async (id, data) => {
    try { const r = await api.post(`/repositories/${id}/tags`, data); return r.data; } catch (e) { O(e); }
};
export const deleteRepositoryTag = async (id, tagName) => {
    try { const r = await api.delete(`/repositories/${id}/tags/${tagName}`); return r.data; } catch (e) { O(e); }
};
export const fetchReleases = async (id, params) => {
    try { const r = await api.get(`/repositories/${id}/releases`, { params }); return r.data; } catch (e) { O(e); }
};
export const fetchIssues = async () => {
    try { const r = await api.get("/issues"); return r.data; } catch (e) { O(e); }
};
export const fetchRelease = async (id, releaseId) => {
    try { const r = await api.get(`/repositories/${id}/releases/${releaseId}`); return r.data; } catch (e) { O(e); }
};
export const createRelease = async (id, data) => {
    try { const r = await api.post(`/repositories/${id}/releases`, data); return r.data; } catch (e) { O(e); }
};
export const updateRelease = async (id, releaseId, data) => {
    try { const r = await api.patch(`/repositories/${id}/releases/${releaseId}`, data); return r.data; } catch (e) { O(e); }
};
export const fetchReviewComments = async (repoId, number, params) => {
    try { const r = await api.get(`/repositories/${repoId}/pull-requests/${number}/review-comments`, { params }); return r.data; } catch (e) { O(e); }
};
export const createReviewComment = async (repoId, number, data) => {
    try { const r = await api.post(`/repositories/${repoId}/pull-requests/${number}/review-comments`, data); return r.data; } catch (e) { O(e); }
};
export const fetchReviewCommentThread = async (repoId, number, commentId) => {
    try { const r = await api.get(`/repositories/${repoId}/pull-requests/${number}/review-comments/${commentId}`); return r.data; } catch (e) { O(e); }
};
export const replyToReviewComment = async (repoId, number, commentId, data) => {
    try { const r = await api.post(`/repositories/${repoId}/pull-requests/${number}/review-comments/${commentId}/reply`, data); return r.data; } catch (e) { O(e); }
};
export const resolveReviewThread = async (repoId, number, commentId) => {
    try { const r = await api.post(`/repositories/${repoId}/pull-requests/${number}/review-comments/${commentId}/resolve`); return r.data; } catch (e) { O(e); }
};
export const unresolveReviewThread = async (repoId, number, commentId) => {
    try { const r = await api.post(`/repositories/${repoId}/pull-requests/${number}/review-comments/${commentId}/unresolve`); return r.data; } catch (e) { O(e); }
};
export const editReviewComment = async (repoId, number, commentId, data) => {
    try { const r = await api.patch(`/repositories/${repoId}/pull-requests/${number}/review-comments/${commentId}`, data); return r.data; } catch (e) { O(e); }
};
export const deleteReviewComment = async (repoId, number, commentId) => {
    try { const r = await api.delete(`/repositories/${repoId}/pull-requests/${number}/review-comments/${commentId}`); return r.data; } catch (e) { O(e); }
};
export const forkRepository = async (id, data) => {
    try { const r = await api.post(`/repositories/${id}/fork`, data); return r.data; } catch (e) { O(e); }
};
export const fetchRepositoryForks = async (id) => {
    try { const r = await api.get(`/repositories/${id}/forks`); return r.data; } catch (e) { O(e); }
};
