import api from "./axios";

export const fetchActivity = async (params) => {
    try {
        const response = await api.get(
            "/activity",
            { params }
        );
        return response.data;
    } catch (err) {
        if (err.offline) throw new Error("Server unreachable");
        throw err;
    }
};

export const fetchRepositoryActivity = async (id, params) => {
    try {
        const response = await api.get(
            `/repositories/${id}/activity`,
            { params }
        );
        return response.data;
    } catch (err) {
        if (err.offline) throw new Error("Server unreachable");
        throw err;
    }
};
