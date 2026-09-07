import { useEffect, useRef } from "react";
import { getSocket } from "../api/socket";

export const useRealtimeEvent = (event, handler) => {
    const savedHandler = useRef(handler);

    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) {
            return;
        }

        const listener = (...args) => {
            savedHandler.current(...args);
        };

        socket.on(event, listener);

        return () => {
            socket.off(event, listener);
        };
    }, [event]);
};
