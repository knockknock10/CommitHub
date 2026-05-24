import api from "./axios";

/* signup */

export const signupUser = async (userData) => {

    const response = await api.post(

        "/auth/signup",

        userData
    );

    return response.data;
};

/* login */

export const loginUser = async (userData) => {

    const response = await api.post(

        "/auth/login",

        userData
    );

    return response.data;
};