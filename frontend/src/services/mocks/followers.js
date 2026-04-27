import { delay } from "./index";

const FAKE = [
    { id: "u-2", nickname: "alice", avatar: "/avatars/default.png", first_name: "Alice", last_name: "K." },
    { id: "u-3", nickname: "bob",   avatar: "/avatars/default.png", first_name: "Bob",   last_name: "M." },
];

let _state = {
    followers: [...FAKE],
    following: [FAKE[0]],
    pending: [],
};

export const followersMock = {
    listFollowers: async (_userId) => {
        await delay();
        return [..._state.followers];
    },
    listFollowing: async (_userId) => {
        await delay();
        return [..._state.following];
    },
    follow: async (targetId) => {
        await delay();
        const target = FAKE.find((u) => u.id === targetId) || { id: targetId, nickname: "user", avatar: "" };
        _state.following.push(target);
        return { status: "following" };
    },
    unfollow: async (targetId) => {
        await delay();
        _state.following = _state.following.filter((u) => u.id !== targetId);
        return { status: "ok" };
    },
    accept: async (_requestId) => {
        await delay();
        return { status: "accepted" };
    },
    decline: async (_requestId) => {
        await delay();
        return { status: "declined" };
    },
};
