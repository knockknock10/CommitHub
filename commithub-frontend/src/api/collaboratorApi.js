import api from "./axios";

export const getCollaborators = async (repoId) => {
    const response = await api.get(`/repositories/${repoId}/collaborators`);
    return response.data;
};

export const addCollaborator = async (repoId, data) => {
    const response = await api.post(`/repositories/${repoId}/collaborators`, data);
    return response.data;
};

export const updateCollaborator = async (repoId, userId, data) => {
    const response = await api.patch(`/repositories/${repoId}/collaborators/${userId}`, data);
    return response.data;
};

export const removeCollaborator = async (repoId, userId) => {
    const response = await api.delete(`/repositories/${repoId}/collaborators/${userId}`);
    return response.data;
};

export const getMyCollaboratorRole = async (repoId) => {
    const response = await api.get(`/repositories/${repoId}/collaborators/me`);
    return response.data;
};
