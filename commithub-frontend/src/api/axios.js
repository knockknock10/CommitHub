import axios from "axios";

const api = axios.create({

    baseURL: import.meta.env.VITE_API_BASE_URL,

    headers: {

        "Content-Type": "application/json"
    }
});

/* attach token automatically */

api.interceptors.request.use(

    (config) => {

        const storedUser =
        localStorage.getItem("commithub-user");

        if(storedUser){

            const user =
            JSON.parse(storedUser);

            if(user.token){

                config.headers.Authorization =
                `Bearer ${user.token}`;
            }
        }

        return config;
    },

    (error) => {

        return Promise.reject(error);
    }
);

export default api;