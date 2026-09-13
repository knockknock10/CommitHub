import api from "./axios";

export const getIssues = async (repoId) => {
    try { const r = await api.get(`/issues/repository/${repoId}`); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const createIssue = async (repoId, issueData) => {
    try { const r = await api.post(`/issues/repository/${repoId}`, issueData); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const closeIssue = async (issueId) => {
    try { const r = await api.patch(`/issues/${issueId}/close`); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const reopenIssue = async (issueId) => {
    try { const r = await api.patch(`/issues/${issueId}/reopen`); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const getIssueById = async (issueId) => {
    try { const r = await api.get(`/issues/${issueId}`); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
