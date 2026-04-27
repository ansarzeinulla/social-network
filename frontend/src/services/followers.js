import { apiJSON, withMock } from "./api";
import { followersMock } from "./mocks/followers";

export const followers = {
    listFollowers: (userId) =>
        withMock("FOLLOWERS",
            () => apiJSON(`/users/${userId}/followers`),
            () => followersMock.listFollowers(userId)
        ),
    listFollowing: (userId) =>
        withMock("FOLLOWERS",
            () => apiJSON(`/users/${userId}/following`),
            () => followersMock.listFollowing(userId)
        ),
    listIncomingRequests: () =>
        withMock("FOLLOWERS",
            () => apiJSON(`/follow-requests`),
            () => Promise.resolve([])
        ),
    follow: (targetId) =>
        withMock("FOLLOWERS",
            () => apiJSON(`/follow/${targetId}`, { method: "POST" }),
            () => followersMock.follow(targetId)
        ),
    unfollow: (targetId) =>
        withMock("FOLLOWERS",
            () => apiJSON(`/follow/${targetId}`, { method: "DELETE" }),
            () => followersMock.unfollow(targetId)
        ),
    accept: (requesterId) =>
        withMock("FOLLOWERS",
            () => apiJSON(`/follow-requests/${requesterId}/accept`, { method: "POST" }),
            () => followersMock.accept(requesterId)
        ),
    decline: (requesterId) =>
        withMock("FOLLOWERS",
            () => apiJSON(`/follow-requests/${requesterId}/decline`, { method: "POST" }),
            () => followersMock.decline(requesterId)
        ),
};
