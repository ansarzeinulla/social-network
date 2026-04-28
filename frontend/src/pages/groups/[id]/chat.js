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
            } finally { setLoading(false); }
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

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const sendMsg = (e) => {
        e.preventDefault();
        const text = body.trim();
        if (!text || !groupID) return;
        send("group_chat.send", { group_id: groupID, body: text });
        setBody("");
    };

    return (
        <Layout title={`Чат группы #${groupID || ""}`}>
            <div className="card thread-window">
                <div className="messages">
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
                                <div key={m.id} className={`bubble ${isMine ? "mine" : ""}`}>
                                    {!isMine && <div className="bubble-author">{author}</div>}
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
                .bubble-author {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    margin-bottom: 2px;
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
                .composer .btn { width: 44px; padding: 0; display: grid; place-items: center; }
            `}</style>
        </Layout>
    );
}
