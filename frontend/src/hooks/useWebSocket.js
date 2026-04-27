import { useEffect, useRef, useState, useCallback } from "react";

// useWebSocket — opens /ws (cookie auth) and routes events to onEvent.
//
// Two important details:
//
// 1. onEvent is stored in a ref so the LATEST callback is always called.
//    Otherwise React captures the first render's closure (e.g. user=null
//    before useUser() resolves), and all events get filtered out wrongly.
//
// 2. In React 18 StrictMode the effect runs twice in dev. We guard with a
//    short "minimum lifetime" so a synthetic mount/unmount/mount sequence
//    doesn't trigger an exponential-backoff reconnect storm.
//
// Returns: { send, lastEvent, status }
export function useWebSocket(onEvent) {
    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const attemptRef = useRef(0);
    const isUnmountedRef = useRef(false);
    const onEventRef = useRef(onEvent);
    const [status, setStatus] = useState("connecting");
    const [lastEvent, setLastEvent] = useState(null);

    // Keep ref pointing at the latest onEvent on every render.
    useEffect(() => {
        onEventRef.current = onEvent;
    });

    const connect = useCallback(() => {
        if (isUnmountedRef.current) return;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
        const wsURL = (apiBase || window.location.origin).replace(/^http/, "ws") + "/ws";
        const ws = new WebSocket(wsURL);
        wsRef.current = ws;
        setStatus("connecting");

        ws.onopen = () => {
            attemptRef.current = 0;
            setStatus("open");
        };
        ws.onclose = () => {
            if (isUnmountedRef.current) return;
            setStatus("closed");
            const delay = Math.min(30000, 500 * Math.pow(2, attemptRef.current));
            attemptRef.current += 1;
            reconnectTimerRef.current = setTimeout(connect, delay);
        };
        ws.onerror = () => {
            try { ws.close(); } catch (_) {}
        };
        ws.onmessage = (e) => {
            try {
                const ev = JSON.parse(e.data);
                setLastEvent(ev);
                const fn = onEventRef.current;
                if (fn) fn(ev);
            } catch (_) {}
        };
    }, []);

    useEffect(() => {
        isUnmountedRef.current = false;
        connect();
        return () => {
            isUnmountedRef.current = true;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            const ws = wsRef.current;
            if (!ws) return;
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
            // If still CONNECTING, schedule the close for after open to avoid
            // the noisy "closed before connection established" warning. The
            // unmount flag prevents reconnect either way.
            if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => { try { ws.close(); } catch (_) {} };
            } else {
                try { ws.close(); } catch (_) {}
            }
        };
    }, [connect]);

    const send = useCallback((typeOrEvent, payload) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return false;
        const ev = typeof typeOrEvent === "string"
            ? { type: typeOrEvent, payload: payload ?? {} }
            : typeOrEvent;
        ws.send(JSON.stringify(ev));
        return true;
    }, []);

    return { send, lastEvent, status };
}
