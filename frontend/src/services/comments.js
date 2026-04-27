import { apiJSON, withMock } from "./api";
import { commentsMock } from "./mocks/comments";

export const comments = {
    list: (postId) =>
        withMock("COMMENTS",
            () => apiJSON(`/posts/${postId}/comments`),
            () => commentsMock.list(postId)
        ),
    add: (postId, body) =>
        withMock("COMMENTS",
            () => apiJSON(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ body }) }),
            () => commentsMock.add(postId, body)
        ),
};
