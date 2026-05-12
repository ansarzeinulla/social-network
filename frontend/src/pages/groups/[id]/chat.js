import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import Avatar from "../../../components/Avatar";
import { chat } from "../../../services/chat";
import { groups as groupsApi } from "../../../services/groups";
import { fetchApi } from "../../../services/api";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useUser } from "../../../hooks/useUser";

export default function GroupChat() {
    const router = useRouter();
    const { id: gidStr } = router.query;
    const groupID = gidStr ? Number(gidStr) : null;
    const { user } = useUser();
    const [g, setG] = useState(null);
    const [members, setMembers] = useState([]);
    const [onlineMap, setOnlineMap] = useState({});
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(true);
    const endRef = useRef(null);

    // Initial load: group info, members, message history, online snapshot.
    useEffect(() => {
        if (!groupID) return;
        (async () => {
            try {
                const [gData, memData, history] = await Promise.all([
                    groupsApi.get(groupID).catch(() => null),
                    groupsApi.members(groupID).catch(() => []),
                    chat.groupHistory(groupID).catch(() => []),
                ]);
                setG(gData);
                setMembers(memData || []);
                setMessages(history || []);
            } finally { setLoading(false); }
        })();
    }, [groupID]);

    // Unread state lives on the backend (group_chat_reads). The history
    // endpoint calls MarkGroupChatRead, so re-fetching /api/groups returns
    // unread_count = 0 for this group. Nothing to do client-side.

    // Online status snapshot — refreshed every 15s. Backend doesn't broadcast
    // presence changes, so we poll instead. One request per member is fine
    // for group sizes; if groups grow large, swap to a bulk endpoint.
    useEffect(() => {
        if (!members.length) return;
        let cancelled = false;
        const refresh = async () => {
            const results = await Promise.all(members.map((m) =>
                fetchApi(`/users/${m.id}/online`)
                    .then((r) => r.ok ? r.json() : { online: false })
                    .then((d) => [m.id, !!d.online])
                    .catch(() => [m.id, false])
            ));
            if (!cancelled) setOnlineMap(Object.fromEntries(results));
        };
        refresh();
        const t = setInterval(refresh, 15000);
        return () => { cancelled = true; clearInterval(t); };
    }, [members]);

    const { send, status } = useWebSocket((ev) => {
        if (ev.type !== "group_chat.new") return;
        const p = ev.payload;
        if (p.group_id !== groupID) return;
        // Anyone sending a message proves they're online — bump them up.
        if (p.from) {
            setOnlineMap((prev) => prev[p.from] ? prev : { ...prev, [p.from]: true });
        }
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

    // Per-member latest-message timestamp from current messages buffer.
    const lastMsgByMember = useMemo(() => {
        const map = {};
        for (const m of messages) {
            const t = new Date(m.created_at).getTime();
            if (!isFinite(t)) continue;
            if (!map[m.sender_id] || t > map[m.sender_id]) map[m.sender_id] = t;
        }
        return map;
    }, [messages]);

    // Sorted member list: online first, then by last message recency, then by name.
    const sortedMembers = useMemo(() => {
        const list = [...members];
        list.sort((a, b) => {
            const aOn = onlineMap[a.id] ? 1 : 0;
            const bOn = onlineMap[b.id] ? 1 : 0;
            if (aOn !== bOn) return bOn - aOn;
            const aLast = lastMsgByMember[a.id] || 0;
            const bLast = lastMsgByMember[b.id] || 0;
            if (aLast !== bLast) return bLast - aLast;
            const aName = `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.nickname || "User";
            const bName = `${b.first_name || ""} ${b.last_name || ""}`.trim() || b.nickname || "User";
            return aName.localeCompare(bName, "ru");
        });
        return list;
    }, [members, onlineMap, lastMsgByMember]);

    const onlineCount = members.filter((m) => onlineMap[m.id]).length;

    const membersRail = (
        <aside className="members-rail">
            <h3 className="rail-title">
                Участники · {onlineCount}/{members.length} онлайн
            </h3>
            <div className="rail-list">
                {sortedMembers.length === 0 ? (
                    <div className="rail-empty">Пока никого</div>
                ) : sortedMembers.map((m) => {
                    const isOnline = !!onlineMap[m.id];
                    const isMe = user && m.id === user.id;
                    const name = `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.nickname || `User #${m.id}`;
                    return (
                        <Link key={m.id} href={`/profile/${m.id}`} className="member-row">
                            <span className="avatar-wrap">
                                <Avatar url={m.avatar} name={m.first_name} size={32} />
                                <span className={`presence-dot ${isOnline ? "is-online" : ""}`} />
                            </span>
                            <span className="member-name">
                                {name}
                                {isMe && <span className="me-badge">вы</span>}
                            </span>
                        </Link>
                    );
                })}
            </div>

            <style jsx>{`
                .members-rail {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: 100%;
                }
                .rail-title {
                    font-family: var(--font-mono);
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    margin: 0 4px 6px;
                }
                .rail-list {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .rail-empty {
                    color: var(--text-muted);
                    font-size: 13px;
                    padding: 4px 8px;
                }
                /* :global() — .member-row sits on <Link>'s rendered <a>,
                   which styled-jsx doesn't tag with the scope hash. Without
                   global scope the flex layout never reaches the <a>, and the
                   avatar+name stack vertically. */
                .members-rail :global(.member-row) {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 6px 8px;
                    border-radius: var(--radius);
                    color: var(--text-main);
                    text-decoration: none;
                    transition: background 0.15s;
                }
                .members-rail :global(.member-row:hover) { background: var(--bg-hover); color: var(--text-main); }
                .avatar-wrap {
                    position: relative;
                    display: inline-block;
                    flex-shrink: 0;
                    width: 32px;
                    height: 32px;
                }
                .presence-dot {
                    position: absolute;
                    bottom: -1px;
                    right: -1px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: var(--text-muted);
                    border: 2px solid var(--card-bg);
                }
                .presence-dot.is-online { background: var(--accent); }
                .member-name {
                    font-weight: 600;
                    font-size: 13px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    flex: 1;
                    min-width: 0;
                }
                .me-badge {
                    margin-left: 6px;
                    font-family: var(--font-mono);
                    font-size: 10px;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                }
            `}</style>
        </aside>
    );

    return (
        <Layout
            title={g ? `Чат группы: ${g.title}` : "Чат группы"}
            right={membersRail}
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
