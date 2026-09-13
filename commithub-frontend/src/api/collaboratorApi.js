import api from "./axios";

const O = (e) => { if (e && e.offline) throw new Error("Server unreachable"); throw e; };

export const fetchCollaborators = async (repoId) => {
    try { const r = await api.get(`/repositories/${repoId}/collaborators`); return r.data; } catch (e) { O(e); }
};
export const getCollaborators = fetchCollaborators;
export const getMyCollaboratorRole = async (repoId) => {
    try { const r = await api.get(`/repositories/${repoId}/collaborators/me`); return r.data; } catch (e) { O(e); }
};
export const addCollaborator = async (repoId, data) => {
    try { const r = await api.post(`/repositories/${repoId}/collaborators`, data); return r.data; } catch (e) { O(e); }
};
export const updateCollaborator = async (repoId, userId, data) => {
    try { const r = await api.patch(`/repositories/${repoId}/collaborators/${userId}`, data); return r.data; } catch (e) { O(e); }
};
export const removeCollaborator = async (repoId, userId) => {
    try { const r = await api.delete(`/repositories/${repoId}/collaborators/${userId}`); return r.data; } catch (e) { O(e); }
};
