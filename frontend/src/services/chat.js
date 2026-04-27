import { apiJSON, withMock } from "./api";
import { chatMock } from "./mocks/chat";

export const chat = {
    listThreads: () =>
        withMock("CHAT",
            () => apiJSON(`/chats`),
            () => chatMock.listThreads()
        ),
    history: (peerId) =>
        withMock("CHAT",
            () => apiJSON(`/chats/messages?peer_id=${peerId}`),
            () => chatMock.history(peerId)
        ),
    groupHistory: (groupId) =>
        withMock("CHAT",
            () => apiJSON(`/groups/chat/history?group_id=${groupId}`),
            () => chatMock.history(groupId)
        ),
};
