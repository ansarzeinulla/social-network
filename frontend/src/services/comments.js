import { apiJSON, withMock } from "./api";
import { commentsMock } from "./mocks/comments";

export const comments = {
    list: (postId) =>
        withMock("COMMENTS",
            () => apiJSON(`/posts/${postId}/comments`),
            () => commentsMock.list(postId)
        ),
    add: (postId, body, image) =>
        withMock("COMMENTS",
            () => {
                if (image) {
                    const fd = new FormData();
                    fd.append("content", body);
                    fd.append("image", image);
                    return apiJSON(`/posts/${postId}/comments`, { method: "POST", body: fd });
                }
                return apiJSON(`/posts/${postId}/comments`, {
                    method: "POST",
                    body: JSON.stringify({ content: body }),
                });
            },
            () => commentsMock.add(postId, body)
        ),
};
