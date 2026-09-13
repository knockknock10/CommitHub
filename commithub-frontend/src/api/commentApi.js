import api from "./axios";

export const getComments = async (issueId) => {
    try { const r = await api.get(`/comments/${issueId}`); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const createComment = async (issueId, data) => {
    try { const r = await api.post(`/comments/${issueId}`, data); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const deleteComment = async (commentId) => {
    try { const r = await api.delete(`/comments/delete/${commentId}`); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
