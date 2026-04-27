import { delay } from "./index";

const _byPost = {};

export const commentsMock = {
    list: async (postId) => {
        await delay();
        return _byPost[postId] || [];
    },
    add: async (postId, body) => {
        await delay();
        const c = {
            id: "c-" + Math.random().toString(36).slice(2, 8),
            post_id: postId,
            body,
            author: { id: "u-1", nickname: "demo" },
            created_at: new Date().toISOString(),
        };
        _byPost[postId] = [...(_byPost[postId] || []), c];
        return c;
    },
};
