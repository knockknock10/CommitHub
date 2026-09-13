import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "",
    headers: {
        "Content-Type": "application/json"
    },
    timeout: 10000,
    timeoutErrorMessage: "Server unreachable — please check your connection"
});

/* attach token to all routes except the public auth endpoints (login/signup) */
api.interceptors.request.use(
    (config) => {
        const storedUser = localStorage.getItem("commithub-user");
        if(storedUser){
            const user = JSON.parse(storedUser);
            if(user.token){
                const url = config.url || "";
                const isPublicAuthRoute = url.includes("/auth/");
                if(!isPublicAuthRoute){
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/* handle responses and errors globally */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const isOffline = !error.response && (error.code === "ERR_NETWORK" || error.message.includes("unreachable"));

        if (isOffline) {
            console.warn("[Offline] Cannot reach the CommitHub server");
            return Promise.reject({ offline: true, message: "Server unreachable" });
        }

        const message = error.response?.data?.message || "An unexpected error occurred";

        switch (status) {
            case 401:
                // Authentication error - clear user and redirect to login
                localStorage.removeItem("commithub-user");
                window.location.href = "/login";
                break;
            case 403:
                console.error("[Forbidden]:", message);
                break;
            case 404:
                console.error("[Not Found]:", message);
                break;
            case 429:
                console.error("[Too Many Requests]:", message);
                break;
            case 500:
                console.error("[Server Error]:", message);
                break;
            default:
                console.error("[API Error]:", message);
        }

        return Promise.reject(error);
    }
);

export default api;
