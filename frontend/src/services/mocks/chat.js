import { delay } from "./index";

const _threads = {
    "t-1": [
        { id: "m-1", from: "alice", body: "hey!",         created_at: new Date(Date.now() - 60000).toISOString() },
        { id: "m-2", from: "me",    body: "hi alice",     created_at: new Date().toISOString() },
    ],
};

export const chatMock = {
    listThreads: async () => {
        await delay();
        return [{ id: "t-1", with: "alice", last: "hi alice" }];
    },
    history: async (threadId) => {
        await delay();
        return _threads[threadId] || [];
    },
    send: async (threadId, body) => {
        await delay(50);
        const m = { id: "m-" + Date.now(), from: "me", body, created_at: new Date().toISOString() };
        _threads[threadId] = [...(_threads[threadId] || []), m];
        return m;
    },
};
