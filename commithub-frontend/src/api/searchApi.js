import api from "./axios";

const O = (err) => { if (err && err.offline) throw new Error("Server unreachable"); throw err; };

export const searchAll = async (query, page = 1, limit = 20) => {
    try { const r = await api.get("/search", { params: { q: query, type: "all", page, limit } }); return r.data; } catch (e) { O(e); }
};
export const searchUsers = async (query, page = 1, limit = 20) => {
    try { const r = await api.get("/search", { params: { q: query, type: "users", page, limit } }); return r.data; } catch (e) { O(e); }
};
export const searchOrganizations = async (query, page = 1, limit = 20) => {
    try { const r = await api.get("/search", { params: { q: query, type: "organizations", page, limit } }); return r.data; } catch (e) { O(e); }
};
export const searchRepositories = async (query, page = 1, limit = 20) => {
    try { const r = await api.get("/search", { params: { q: query, type: "repositories", page, limit } }); return r.data; } catch (e) { O(e); }
};

// Backwards-compatible: globalSearch(query, type) calls searchAll with type filter
export const globalSearch = async (query, type = "all") => {
    try {
        const r = await api.get("/search", { params: { q: query, type, page: 1, limit: 100 } });
        return r.data;
    } catch (err) {
        if (err.offline) throw new Error("Server unreachable");
        throw err;
    }
};
