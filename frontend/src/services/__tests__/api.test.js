/**
 * Pattern test for the mock layer. Copy this template when adding tests for
 * a new service module.
 *
 * Run: npm test
 */
import { withMock } from "../api";

describe("withMock helper", () => {
    const ENV_KEY = "NEXT_PUBLIC_USE_MOCK_FOLLOWERS";

    afterEach(() => {
        delete process.env[ENV_KEY];
    });

    test("uses mock when flag is true", async () => {
        process.env[ENV_KEY] = "true";
        const real = jest.fn();
        const mock = jest.fn().mockResolvedValue("MOCK");
        const result = await withMock("FOLLOWERS", real, mock);
        expect(result).toBe("MOCK");
        expect(real).not.toHaveBeenCalled();
        expect(mock).toHaveBeenCalledTimes(1);
    });

    test("calls real when flag is false", async () => {
        process.env[ENV_KEY] = "false";
        const real = jest.fn().mockResolvedValue("REAL");
        const mock = jest.fn();
        const result = await withMock("FOLLOWERS", real, mock);
        expect(result).toBe("REAL");
        expect(mock).not.toHaveBeenCalled();
    });

    test("falls back to mock when backend is unreachable (no status)", async () => {
        process.env[ENV_KEY] = "false";
        const networkErr = new Error("fetch failed");
        const real = jest.fn().mockRejectedValue(networkErr);
        const mock = jest.fn().mockResolvedValue("FALLBACK");
        const result = await withMock("FOLLOWERS", real, mock);
        expect(result).toBe("FALLBACK");
    });

    test("rethrows when backend returns 401 (auth error must propagate)", async () => {
        process.env[ENV_KEY] = "false";
        const httpErr = Object.assign(new Error("Unauthorized"), { status: 401 });
        const real = jest.fn().mockRejectedValue(httpErr);
        const mock = jest.fn();
        await expect(withMock("FOLLOWERS", real, mock)).rejects.toThrow("Unauthorized");
        expect(mock).not.toHaveBeenCalled();
    });

    test("falls back to mock on 404 (endpoint not implemented)", async () => {
        process.env[ENV_KEY] = "false";
        const err404 = Object.assign(new Error("Not Found"), { status: 404 });
        const real = jest.fn().mockRejectedValue(err404);
        const mock = jest.fn().mockResolvedValue("FALLBACK");
        const result = await withMock("FOLLOWERS", real, mock);
        expect(result).toBe("FALLBACK");
    });

    test("falls back to mock on 503 (server unavailable)", async () => {
        process.env[ENV_KEY] = "false";
        const err503 = Object.assign(new Error("Unavailable"), { status: 503 });
        const real = jest.fn().mockRejectedValue(err503);
        const mock = jest.fn().mockResolvedValue("FALLBACK");
        const result = await withMock("FOLLOWERS", real, mock);
        expect(result).toBe("FALLBACK");
    });
});
