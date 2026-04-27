import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { chat } from "../../services/chat";
import { apiJSON, isMocked } from "../../services/api";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useUser } from "../../hooks/useUser";

// /chats/{peerId} — 1:1 conversation, history via REST, live via WS.
export default function ThreadPage() {
    const router = useRouter();
    const { id: peerIdStr } = router.query;
    const peerId = peerIdStr ? Number(peerIdStr) : null;
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(true);
    const [peerOnline, setPeerOnline] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        if (!peerId) return;
        (async () => {
            const list = await chat.history(peerId);
            setMessages(list || []);
            setLoading(false);
        })();
    }, [peerId]);

    // Poll peer presence every 10s. Cheap; could be replaced with a WS
    // presence broadcast later.
    useEffect(() => {
        if (!peerId) return;
        let stop = false;
        const tick = async () => {
            try {
                const r = await apiJSON(`/users/${peerId}/online`);
                if (!stop) setPeerOnline(!!r.online);
            } catch (_) {}
        };
        tick();
        const t = setInterval(tick, 10000);
        return () => { stop = true; clearInterval(t); };
    }, [peerId]);

    const { send, status } = useWebSocket((ev) => {
        if (ev.type !== "chat.new") return;
        const p = ev.payload;
        // Only accept events relevant to this thread.
        if (!user) return;
        const involvesUs =
            (p.from === user.id && p.to === peerId) ||
            (p.from === peerId && p.to === user.id);
        if (!involvesUs) return;
        setMessages((prev) => [...prev, {
            id: p.id,
            sender_id: p.from,
            receiver_id: p.to,
            body: p.body,
            created_at: new Date().toISOString(),
        }]);
    });

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMsg = (e) => {
        e.preventDefault();
        const text = body.trim();
        if (!text || !peerId) return;
        send("chat.send", { to_user_id: peerId, body: text });
        setBody("");
    };

    return (
        <Layout title={`Диалог`} mock={isMocked("CHAT")} action={
            <span style={{ fontSize: "0.8rem", color: peerOnline ? "var(--accent)" : "var(--text-muted)" }}>
                {peerOnline ? "● online" : "● offline"}
                {status !== "open" && " · reconnecting"}
            </span>
        }>
            <div className="card" style={{ display: "flex", flexDirection: "column", height: "60vh" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {loading ? (
                        <div className="empty-state">Loading…</div>
                    ) : messages.length === 0 ? (
                        <div className="empty-state">Сообщений пока нет</div>
                    ) : (
                        messages.map((m) => {
                            const isMine = user && m.sender_id === user.id;
                            return (
                                <div
                                    key={m.id}
                                    style={{
                                        alignSelf: isMine ? "flex-end" : "flex-start",
                                        background: isMine ? "var(--primary)" : "var(--bg)",
                                        color: isMine ? "white" : "var(--text-main)",
                                        padding: "0.5rem 0.85rem",
                                        borderRadius: "14px",
                                        maxWidth: "70%",
                                    }}
                                >
                                    {m.body}
                                </div>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>
                <form onSubmit={sendMsg} style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <input
                        type="text"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Сообщение…"
                        style={{
                            flex: 1,
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            color: "var(--text-main)",
                            padding: "0.7rem 0.9rem",
                            borderRadius: "10px",
                        }}
                    />
                    <button type="submit" className="btn" disabled={status !== "open"}>
                        Отправить
                    </button>
                </form>
            </div>
        </Layout>
    );
}
