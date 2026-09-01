import { io } from "socket.io-client";

let socket = null;

const getBaseUrl = () => {
    const base = import.meta.env.VITE_API_BASE_URL || "";

    return base.replace(/\/api\/?$/, "") || "http://localhost:3000";
};

export const connectSocket = () => {
    if (socket && socket.connected) {
        return socket;
    }

    const stored = localStorage.getItem("commithub-user");
    const user = stored ? JSON.parse(stored) : null;
    const token = user?.token;

    if (!token) {
        return null;
    }

    socket = io(getBaseUrl(), {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
    });

    socket.on("connect", () => {});

    socket.on("disconnect", () => {});

    socket.on("connect_error", () => {});

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => socket;

export const joinRepository = (repoId) => {
    if (socket && socket.connected && repoId) {
        socket.emit("join:repository", repoId);
    }
};

export const leaveRepository = (repoId) => {
    if (socket && repoId) {
        socket.emit("leave:repository", repoId);
    }
};

export const joinPullRequest = (prId) => {
    if (socket && socket.connected && prId) {
        socket.emit("join:pull-request", prId);
    }
};

export const leavePullRequest = (prId) => {
    if (socket && prId) {
        socket.emit("leave:pull-request", prId);
    }
};
