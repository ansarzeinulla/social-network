import { act, renderHook } from "@testing-library/react";
import { useWebSocket } from "../useWebSocket";

class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 3;

    static instances = [];

    constructor(url) {
        this.url = url;
        this.readyState = FakeWebSocket.CONNECTING;
        this.sent = [];
        FakeWebSocket.instances.push(this);
    }

    send(data) {
        this.sent.push(data);
    }

    close() {
        this.readyState = FakeWebSocket.CLOSED;
        if (this.onclose) this.onclose();
    }

    open() {
        this.readyState = FakeWebSocket.OPEN;
        if (this.onopen) this.onopen();
    }

    message(payload) {
        if (this.onmessage) this.onmessage({ data: JSON.stringify(payload) });
    }
}

describe("useWebSocket", () => {
    beforeEach(() => {
        FakeWebSocket.instances = [];
        global.WebSocket = FakeWebSocket;
        delete process.env.NEXT_PUBLIC_API_URL;
    });

    test("opens same-origin websocket and sends only when open", () => {
        const { result, unmount } = renderHook(() => useWebSocket());
        const ws = FakeWebSocket.instances[0];

        expect(ws.url).toBe(window.location.origin.replace(/^http/, "ws") + "/ws");
        expect(result.current.send("ping")).toBe(false);

        act(() => ws.open());
        expect(result.current.status).toBe("open");
        expect(result.current.send("ping", { n: 1 })).toBe(true);
        expect(ws.sent[0]).toBe(JSON.stringify({ type: "ping", payload: { n: 1 } }));

        unmount();
    });

    test("uses the latest event callback", () => {
        const first = jest.fn();
        const second = jest.fn();
        const { rerender, unmount } = renderHook(({ onEvent }) => useWebSocket(onEvent), {
            initialProps: { onEvent: first },
        });
        const ws = FakeWebSocket.instances[0];

        rerender({ onEvent: second });
        act(() => ws.message({ type: "notification.new", payload: { id: 1 } }));

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith({ type: "notification.new", payload: { id: 1 } });

        unmount();
    });
});
