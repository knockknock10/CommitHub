import api from "./axios";

export const createOrganization = async (data) => {
    const response = await api.post("/organizations", data);
    return response.data;
};

export const fetchOrganization = async (slug) => {
    const response = await api.get(`/organizations/${slug}`);
    return response.data;
};

export const fetchOrganizationMembers = async (slug) => {
    const response = await api.get(`/organizations/${slug}/members`);
    return response.data;
};

export const addOrganizationMember = async (slug, data) => {
    const response = await api.post(`/organizations/${slug}/members`, data);
    return response.data;
};

export const removeOrganizationMember = async (slug, userId) => {
    const response = await api.delete(`/organizations/${slug}/members/${userId}`);
    return response.data;
};
