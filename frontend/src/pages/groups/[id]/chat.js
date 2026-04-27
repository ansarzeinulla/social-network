import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import { chat } from "../../../services/chat";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useUser } from "../../../hooks/useUser";

export default function GroupChat() {
    const router = useRouter();
    const { id: gidStr } = router.query;
    const groupID = gidStr ? Number(gidStr) : null;
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(true);
    const endRef = useRef(null);

    useEffect(() => {
        if (!groupID) return;
        (async () => {
            try {
                const list = await chat.groupHistory(groupID);
                setMessages(list || []);
            } finally {
                setLoading(false);
            }
        })();
    }, [groupID]);

    const { send, status } = useWebSocket((ev) => {
        if (ev.type !== "group_chat.new") return;
        const p = ev.payload;
        if (p.group_id !== groupID) return;
        setMessages((prev) => [...prev, {
            id: p.id,
            group_id: p.group_id,
            sender_id: p.from,
            sender_first_name: "",
            sender_last_name: "",
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
        if (!text || !groupID) return;
        send("group_chat.send", { group_id: groupID, body: text });
        setBody("");
    };

    return (
        <Layout
            title={`Чат группы #${groupID || ""}`}
            action={
                <span style={{ fontSize: "0.8rem", color: status === "open" ? "var(--accent)" : "var(--text-muted)" }}>
                    {status === "open" ? "● connected" : "● connecting"}
                </span>
            }
        >
            <div className="card" style={{ display: "flex", flexDirection: "column", height: "60vh" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {loading ? (
                        <div className="empty-state">Loading…</div>
                    ) : messages.length === 0 ? (
                        <div className="empty-state">Сообщений пока нет</div>
                    ) : (
                        messages.map((m) => {
                            const isMine = user && m.sender_id === user.id;
                            const author = isMine ? "Вы" :
                                (m.sender_first_name ? `${m.sender_first_name} ${m.sender_last_name}` : `User #${m.sender_id}`);
                            return (
                                <div key={m.id} style={{
                                    alignSelf: isMine ? "flex-end" : "flex-start",
                                    background: isMine ? "var(--primary)" : "var(--bg)",
                                    color: isMine ? "white" : "var(--text-main)",
                                    padding: "0.5rem 0.85rem",
                                    borderRadius: "14px",
                                    maxWidth: "70%",
                                }}>
                                    <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.2rem" }}>{author}</div>
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
