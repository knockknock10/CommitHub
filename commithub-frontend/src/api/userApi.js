import api from "./axios";

const O = (err) => { if (err && err.offline) throw new Error("Server unreachable"); throw err; };

export const getUserProfile = async (id) => {
    try {
        const response = await api.get(`/users/profile/${id}`);
        return response.data;
    } catch (err) {
        if (err.offline) throw new Error("Server unreachable");
        throw err;
    }
};

export const updateUserProfile = async (data) => {
    try {
        const response = await api.patch("/users/me", data);
        return response.data;
    } catch (err) {
        if (err.offline) throw new Error("Server unreachable");
        throw err;
    }
};
