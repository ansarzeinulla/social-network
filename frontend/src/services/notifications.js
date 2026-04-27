import { apiJSON, withMock } from "./api";
import { notificationsMock } from "./mocks/notifications";

export const notifications = {
    list: () =>
        withMock("NOTIFICATIONS",
            () => apiJSON(`/notifications`),
            () => notificationsMock.list()
        ),
    markRead: (id) =>
        withMock("NOTIFICATIONS",
            () => apiJSON(`/notifications/${id}/read`, { method: "POST" }),
            () => notificationsMock.markRead(id)
        ),
    markAllRead: () =>
        withMock("NOTIFICATIONS",
            () => apiJSON(`/notifications/read-all`, { method: "POST" }),
            () => notificationsMock.markAllRead()
        ),
};
