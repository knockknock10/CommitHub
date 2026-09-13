import api from "./axios";

export const fetchDiscover = async () => {
    try { const r = await api.get("/discover"); return r.data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
