import { chat } from "../chat";
import { followers } from "../followers";
import { groups } from "../groups";
import { notifications } from "../notifications";
import { profile } from "../profile";

describe("service route wrappers", () => {
    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true }),
        });
        for (const key of Object.keys(process.env)) {
            if (key.startsWith("NEXT_PUBLIC_USE_MOCK_")) {
                delete process.env[key];
            }
        }
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test("profile.setPrivacy posts expected payload", async () => {
        await profile.setPrivacy(false);
        expect(global.fetch).toHaveBeenCalledWith("/api/profile/privacy", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ is_public: false }),
        }));
    });

    test("followers actions use expected endpoints", async () => {
        await followers.follow(42);
        await followers.unfollow(42);
        await followers.accept(7);
        await followers.decline(8);
        expect(global.fetch.mock.calls.map((call) => [call[0], call[1].method])).toEqual([
            ["/api/follow/42", "POST"],
            ["/api/follow/42", "DELETE"],
            ["/api/follow-requests/7/accept", "POST"],
            ["/api/follow-requests/8/decline", "POST"],
        ]);
    });

    test("group invite sends user_id payload", async () => {
        await groups.invite(5, 9);
        expect(global.fetch).toHaveBeenCalledWith("/api/groups/5/invite", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ user_id: 9 }),
        }));
    });

    test("chat history endpoints are wired", async () => {
        await chat.listThreads();
        await chat.history(12);
        await chat.groupHistory(3);
        expect(global.fetch.mock.calls.map((call) => call[0])).toEqual([
            "/api/chats",
            "/api/chats/messages?peer_id=12",
            "/api/groups/chat/history?group_id=3",
        ]);
    });

    test("notification read endpoints are wired", async () => {
        await notifications.markRead(11);
        await notifications.markAllRead();
        expect(global.fetch.mock.calls.map((call) => [call[0], call[1].method])).toEqual([
            ["/api/notifications/11/read", "POST"],
            ["/api/notifications/read-all", "POST"],
        ]);
    });
});
