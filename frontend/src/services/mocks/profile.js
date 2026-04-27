import { delay } from "./index";

export const profileMock = {
    getProfile: async (id) => {
        await delay();
        return {
            id: id || "u-1",
            email: "demo@example.com",
            first_name: "Demo",
            last_name: "User",
            nickname: "demo",
            avatar: "/avatars/default.png",
            about_me: "Hi! I'm a mocked profile.",
            is_public: true,
            is_following: false,
            followers_count: 2,
            following_count: 1,
        };
    },
    updateProfile: async (patch) => {
        await delay();
        return { ok: true, ...patch };
    },
    setPrivacy: async (isPublic) => {
        await delay();
        return { is_public: !!isPublic };
    },
};
