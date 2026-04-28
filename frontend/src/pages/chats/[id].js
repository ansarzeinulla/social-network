import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { chat } from "../../services/chat";
import { apiJSON } from "../../services/api";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useUser } from "../../hooks/useUser";

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
        if (ev.type !== "chat.new" || !user) return;
        const p = ev.payload;
        const involves =
            (p.from === user.id && p.to === peerId) ||
            (p.from === peerId && p.to === user.id);
        if (!involves) return;
        setMessages((prev) => [...prev, {
            id: p.id,
            sender_id: p.from,
            receiver_id: p.to,
            body: p.body,
            created_at: new Date().toISOString(),
        }]);
    });

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const sendMsg = (e) => {
        e.preventDefault();
        const text = body.trim();
        if (!text || !peerId) return;
        send("chat.send", { to_user_id: peerId, body: text });
        setBody("");
    };

    return (
        <Layout
            title="Диалог"
            action={
                <span className={`presence ${peerOnline ? "online" : ""}`}>
                    <span className="dot" />
                    {peerOnline ? "online" : "offline"}
                    {status !== "open" && " · reconnecting"}
                </span>
            }
        >
            <div className="card thread-window">
                <div className="messages">
                    {loading ? (
                        <div className="empty-state">Loading…</div>
                    ) : messages.length === 0 ? (
                        <div className="empty-state">Сообщений пока нет</div>
                    ) : (
                        messages.map((m) => {
                            const isMine = user && m.sender_id === user.id;
                            return (
                                <div key={m.id} className={`bubble ${isMine ? "mine" : ""}`}>
                                    {m.body}
                                </div>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>
                <form onSubmit={sendMsg} className="composer">
                    <input
                        type="text"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Сообщение…"
                    />
                    <button type="submit" className="btn" disabled={status !== "open"}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                    </button>
                </form>
            </div>

            <style jsx>{`
                .presence {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .dot {
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    background: var(--text-muted);
                }
                .presence.online { color: var(--accent); }
                .presence.online .dot { background: var(--accent); }
                .thread-window {
                    display: flex;
                    flex-direction: column;
                    height: 65vh;
                    padding: 0;
                    overflow: hidden;
                }
                .messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .bubble {
                    align-self: flex-start;
                    background: var(--bg);
                    color: var(--text-main);
                    padding: 8px 14px;
                    border-radius: 18px;
                    max-width: 70%;
                    font-size: 14px;
                    word-wrap: break-word;
                }
                .bubble.mine {
                    align-self: flex-end;
                    background: var(--primary);
                    color: white;
                }
                .composer {
                    display: flex;
                    gap: 8px;
                    padding: 12px 16px;
                    border-top: 1px solid var(--border-soft);
                    background: var(--card-bg);
                }
                .composer input {
                    flex: 1;
                    background: var(--bg);
                    border: none;
                    outline: none;
                    padding: 10px 16px;
                    border-radius: 999px;
                    font-size: 14px;
                }
                .composer .btn {
                    width: 44px;
                    padding: 0;
                    display: grid;
                    place-items: center;
                }
            `}</style>
        </Layout>
    );
}
