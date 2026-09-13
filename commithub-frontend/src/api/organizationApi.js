import api from "./axios";

const O = (e) => { if (e && e.offline) throw new Error("Server unreachable"); throw e; };

export const fetchOrganizations = async () => {
    try { const r = await api.get("/organizations"); return r.data; } catch (e) { O(e); }
};
export const fetchOrganization = async (slug) => {
    try { const r = await api.get(`/organizations/${slug}`); return r.data; } catch (e) { O(e); }
};
export const fetchOrganizationMembers = async (slug) => {
    try { const r = await api.get(`/organizations/${slug}/members`); return r.data; } catch (e) { O(e); }
};
export const createOrganization = async (data) => {
    try { const r = await api.post("/organizations", data); return r.data; } catch (e) { O(e); }
};
export const addOrganizationMember = async (slug, data) => {
    try { const r = await api.post(`/organizations/${slug}/members`, data); return r.data; } catch (e) { O(e); }
};
export const removeOrganizationMember = async (slug, userId) => {
    try { const r = await api.delete(`/organizations/${slug}/members/${userId}`); return r.data; } catch (e) { O(e); }
};
