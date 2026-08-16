import api from "./axios";

export const fetchActivity = async (params) => {
    const response = await api.get(
        "/activity",
        { params }
    );
    return response.data;
};

export const fetchRepositoryActivity = async (id, params) => {
    const response = await api.get(
        `/repositories/${id}/activity`,
        { params }
    );
    return response.data;
};
