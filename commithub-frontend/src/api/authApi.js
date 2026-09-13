import api from "./axios";

/* signup */
export const signupUser = async (userData) => {
    try {
        const response = await api.post(
            "/auth/signup",
            userData
        );
        return response.data;
    } catch (err) {
        if (err.offline) throw new Error("Server unreachable — please try again later");
        throw err;
    }
};

/* login */
export const loginUser = async (userData) => {
    try {
        const response = await api.post(
            "/auth/login",
            userData
        );
        return response.data;
    } catch (err) {
        if (err.offline) throw new Error("Server unreachable — please try again later");
        throw err;
    }
};