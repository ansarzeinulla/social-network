import { apiJSON, assetURL, fetchApi } from "../api";

describe("api client", () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test("assetURL keeps empty and absolute paths stable", () => {
        expect(assetURL("")).toBe("");
        expect(assetURL("https://cdn.example/a.png")).toBe("https://cdn.example/a.png");
    });

    test("assetURL preserves server-relative upload paths", () => {
        expect(assetURL("/uploads/avatar.gif")).toBe("/uploads/avatar.gif");
    });

    test("fetchApi prefixes /api and sends credentials", async () => {
        global.fetch.mockResolvedValue({ ok: true });
        await fetchApi("/profile");
        expect(global.fetch).toHaveBeenCalledWith("/api/profile", expect.objectContaining({
            credentials: "include",
            headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }));
    });

    test("fetchApi does not force JSON content-type for FormData", async () => {
        global.fetch.mockResolvedValue({ ok: true });
        const fd = new FormData();
        fd.append("avatar", new Blob(["gif"], { type: "image/gif" }), "avatar.gif");
        await fetchApi("/profile/avatar", { method: "POST", body: fd });
        expect(global.fetch.mock.calls[0][1].headers["Content-Type"]).toBeUndefined();
    });

    test("apiJSON throws status and body on failed JSON response", async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 403,
            json: async () => ({ error: "Forbidden" }),
        });
        await expect(apiJSON("/private")).rejects.toMatchObject({
            message: "Forbidden",
            status: 403,
            body: { error: "Forbidden" },
        });
    });
});
