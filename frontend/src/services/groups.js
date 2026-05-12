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
    // Leave the group (only for non-creators).
    leave: (id) => apiJSON(`/groups/${id}/leave`, { method: "POST" }),
    // User cancels their own pending join request before it's been processed.
    cancelRequest: (id) => apiJSON(`/groups/${id}/cancel-request`, { method: "POST" }),
    invite: (groupId, userId) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/invite`, { method: "POST", body: JSON.stringify({ user_id: userId }) }),
            () => groupsMock.invite(groupId, userId)
        ),
    acceptInvite: (groupId) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/accept`, { method: "POST" }),
            () => groupsMock.acceptInvite(groupId)
        ),
    declineInvite: (groupId) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/decline`, { method: "POST" }),
            () => groupsMock.declineInvite(groupId)
        ),
    // Group owner approves a pending join request from a user.
    acceptRequest: (groupId, userId) =>
        apiJSON(`/groups/${groupId}/requests/${userId}/accept`, { method: "POST" }),
    // Group owner declines a pending join request from a user.
    declineRequest: (groupId, userId) =>
        apiJSON(`/groups/${groupId}/requests/${userId}/decline`, { method: "POST" }),
    posts: (groupId) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/posts`),
            () => Promise.resolve([])
        ),
    createPost: (groupId, payload) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/posts`, { method: "POST", body: JSON.stringify(payload) }),
            () => Promise.resolve({ id: Date.now() })
        ),
    comments: (groupId, postId) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/posts/${postId}/comments`),
            () => Promise.resolve([])
        ),
    addComment: (groupId, postId, payload) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(payload) }),
            () => Promise.resolve({ id: Date.now() })
        ),
    events: (groupId) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/events`),
            () => Promise.resolve([])
        ),
    createEvent: (groupId, payload) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/events`, { method: "POST", body: JSON.stringify(payload) }),
            () => Promise.resolve({ id: Date.now(), options: ["going", "not_going"] })
        ),
    voteEvent: (groupId, eventId, vote) =>
        withMock("GROUPS",
            () => apiJSON(`/groups/${groupId}/events/${eventId}/vote`, { method: "POST", body: JSON.stringify({ vote }) }),
            () => Promise.resolve({ vote })
        ),
};
