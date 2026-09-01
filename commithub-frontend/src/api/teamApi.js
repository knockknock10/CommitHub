import api from "./axios";

export const createTeam = async (data) => {
    const response = await api.post("/teams", data);
    return response.data;
};

export const fetchTeams = async (orgSlug) => {
    const response = await api.get(`/teams/${orgSlug}`);
    return response.data;
};

export const addTeamMember = async (data) => {
    const response = await api.post("/teams/members", data);
    return response.data;
};

export const removeTeamMember = async (data) => {
    const response = await api.delete("/teams/members", data);
    return response.data;
};
