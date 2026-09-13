import api from "./axios";

export const fetchNotifications = async (params = {}) => {
    try { const { data } = await api.get("/notifications", { params }); return data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const fetchUnreadCount = async () => {
    try { const { data } = await api.get("/notifications/unread-count"); return data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const markNotificationRead = async (id) => {
    try { const { data } = await api.patch(`/notifications/${id}/read`); return data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const markAllNotificationsRead = async () => {
    try { const { data } = await api.patch("/notifications/read-all"); return data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
export const deleteNotification = async (id) => {
    try { const { data } = await api.delete(`/notifications/${id}`); return data; } catch (e) { if (e && e.offline) throw new Error("Server unreachable"); throw e; }
};
