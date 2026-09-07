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

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        if (socket.connected) {
            setConnected(true);
        }

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
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
