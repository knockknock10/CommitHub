import { createContext, useContext, useState, useEffect } from "react";
import { connectSocket, disconnectSocket } from "../api/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!user) {
            disconnectSocket();
            setConnected(false);
            return;
        }

        const socket = connectSocket();
        if (!socket) {
            setConnected(false);
            return;
        }

        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        const onConnectError = () => {
            console.warn("[Socket] Connection failed — server may be unreachable");
            setConnected(false);
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);

        if (socket.connected) {
            setConnected(true);
        }

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onConnectError);
            disconnectSocket();
            setConnected(false);
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ connected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};
