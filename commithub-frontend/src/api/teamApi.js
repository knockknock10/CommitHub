import api from "./axios";

const O = (e) => { if (e && e.offline) throw new Error("Server unreachable"); throw e; };

export const fetchTeams = async (orgSlug) => {
    try { const r = await api.get(`/teams/${orgSlug}`); return r.data; } catch (e) { O(e); }
};
export const createTeam = async (data) => {
    try { const r = await api.post("/teams", data); return r.data; } catch (e) { O(e); }
};
export const addTeamMember = async (data) => {
    try { const r = await api.post("/teams/members", data); return r.data; } catch (e) { O(e); }
};
export const removeTeamMember = async (data) => {
    try { const r = await api.delete("/teams/members", { data }); return r.data; } catch (e) { O(e); }
};
