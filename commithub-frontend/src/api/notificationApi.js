import api from "./axios";

export const fetchNotifications = async (params = {}) => {
    const { data } = await api.get("/notifications", { params });
    return data;
};

export const fetchUnreadCount = async () => {
    const { data } = await api.get("/notifications/unread-count");
    return data;
};

export const markNotificationRead = async (id) => {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
};

export const markAllNotificationsRead = async () => {
    const { data } = await api.patch("/notifications/read-all");
    return data;
};

export const deleteNotification = async (id) => {
    const { data } = await api.delete(`/notifications/${id}`);
    return data;
};
