import { delay } from "./index";

const _groups = [
    { id: "g-1", title: "Go Developers", description: "Learning Go together", members: 12, joined: true },
    { id: "g-2", title: "TDD Practice",  description: "Test-first or die",     members: 7,  joined: false },
];

export const groupsMock = {
    list: async () => {
        await delay();
        return [..._groups];
    },
    get: async (id) => {
        await delay();
        return _groups.find((g) => g.id === id) || null;
    },
    create: async ({ title, description }) => {
        await delay();
        const g = { id: "g-" + Date.now(), title, description, members: 1, joined: true };
        _groups.push(g);
        return g;
    },
    join: async (id) => {
        await delay();
        const g = _groups.find((x) => x.id === id);
        if (g) { g.joined = true; g.members += 1; }
        return { ok: true };
    },
    invite: async (_groupId, _userId) => {
        await delay();
        return { ok: true };
    },
};
