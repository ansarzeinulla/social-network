import { delay } from "./index";

let _items = [
    { id: "n-1", type: "follow_request",   actor: "alice", read: false, created_at: new Date().toISOString() },
    { id: "n-2", type: "group_invitation", actor: "bob",   read: false, group: "go-devs", created_at: new Date().toISOString() },
    { id: "n-3", type: "event_reminder",   actor: "carol", read: true,  event: "meetup-2026", created_at: new Date().toISOString() },
];

export const notificationsMock = {
    list: async () => {
        await delay();
        return [..._items];
    },
    markRead: async (id) => {
        await delay();
        _items = _items.map((n) => (n.id === id ? { ...n, read: true } : n));
        return { ok: true };
    },
    markAllRead: async () => {
        await delay();
        _items = _items.map((n) => ({ ...n, read: true }));
        return { ok: true };
    },
};
