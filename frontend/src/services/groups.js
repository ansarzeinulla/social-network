import { apiJSON, withMock } from "./api";
import { groupsMock } from "./mocks/groups";

export const groups = {
    list: () =>
        withMock("GROUPS",
            () => apiJSON(`/groups`),
            () => groupsMock.list()
        ),
    get: (id) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${id}`),
            () => groupsMock.get(id)
        ),
    members: (id) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${id}/members`),
            () => Promise.resolve([])
        ),
    create: (payload) =>
        withMock("GROUPS",
            () => apiJSON(`/groups`, { method: "POST", body: JSON.stringify(payload) }),
            () => groupsMock.create(payload)
        ),
    join: (id) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${id}/join`, { method: "POST" }),
            () => groupsMock.join(id)
        ),
    invite: (groupId, userId) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/invite`, { method: "POST", body: JSON.stringify({ user_id: userId }) }),
            () => groupsMock.invite(groupId, userId)
        ),
};
