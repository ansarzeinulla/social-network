import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import Avatar from "../../components/Avatar";
import { chat } from "../../services/chat";
import { groups as groupsApi } from "../../services/groups";
import { useUser } from "../../hooks/useUser";
import { useWebSocket } from "../../hooks/useWebSocket";

export default function ChatsPage() {
    const router = useRouter();
    const { user } = useUser();
    const [threads, setThreads] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [tlist, glist] = await Promise.all([
                chat.listThreads().catch(() => []),
                groupsApi.list().catch(() => []),
            ]);
            setThreads(tlist || []);
            setMyGroups((glist || []).filter((g) => g.joined));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Real-time bumps: when a chat.new event arrives for a thread we already
    // know about, increment its unread_count locally so the badge reacts
    // immediately. Backend is still the source of truth — on the next /chats
    // visit/refresh the count comes straight from chat_reads.
    //
    // If the event is from a peer we DON'T have a thread for yet (someone
    // messaging us for the first time), the local optimistic update would be
    // a no-op, so we full-reload to pull the freshly-created thread row.
    useWebSocket((ev) => {
        if (!user?.id) return;
        if (ev.type === "chat.new") {
            const p = ev.payload || {};
            if (p.from === user.id) return; // skip echo of my own message
            const known = threads.some((t) => (t.peer_id ?? t.id) === p.from);
            if (!known) {
                load();
                return;
            }
            setThreads((prev) => prev.map((t) => {
                const tid = t.peer_id ?? t.id;
                if (tid !== p.from) return t;
                return { ...t, unread_count: (t.unread_count || 0) + 1, last_message: p.body || t.last_message };
            }));
        } else if (ev.type === "group_chat.new") {
            const p = ev.payload || {};
            if (p.from === user.id) return;
            setMyGroups((prev) => prev.map((g) => (
                g.id === p.group_id
                    ? { ...g, unread_count: (g.unread_count || 0) + 1 }
                    : g
            )));
        }
    }, { enabled: !!user });

    const openPrivate = (peerId) => {
        // Optimistically zero out — backend will MarkChatRead when the thread
        // page fetches history; on next /chats visit it'll already be 0.
        setThreads((prev) => prev.map((t) => (
            (t.peer_id ?? t.id) === peerId ? { ...t, unread_count: 0 } : t
        )));
        router.push(`/chats/${peerId}`);
    };
    const openGroup = (gid) => {
        setMyGroups((prev) => prev.map((g) => (
            g.id === gid ? { ...g, unread_count: 0 } : g
        )));
        router.push(`/groups/${gid}/chat`);
    };

    return (
        <Layout title="Чаты">
            {loading ? (
                <div className="empty-state">Loading…</div>
            ) : (
                <>
                    <h2 className="section-title">Личные сообщения</h2>
                    {threads.length === 0 ? (
                        <div className="empty-state">Нет диалогов</div>
                    ) : (
                        threads.map((t) => {
                            const peerId = t.peer_id ?? t.id;
                            const name = t.first_name
                                ? `${t.first_name} ${t.last_name}`
                                : (t.with || "user");
                            const last = t.last_message ?? t.last ?? "";
                            const count = t.unread_count || 0;
                            return (
                                <div
                                    key={`peer-${peerId}`}
                                    className={`card thread ${count ? "thread-unread" : ""}`}
                                    onClick={() => openPrivate(peerId)}
                                >
                                    <Avatar url={t.avatar} name={name} />
                                    <div className="thread-info">
                                        <div className="thread-name">{name}</div>
                                        <div className="thread-last">{last}</div>
                                    </div>
                                    {count > 0 && (
                                        <span className="unread-pill" aria-label={`${count} новых`}>
                                            {count > 9 ? "9+" : count}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {myGroups.length > 0 && (
                        <>
                            <h2 className="section-title section-title-group">Чаты групп</h2>
                            {myGroups.map((g) => {
                                const count = g.unread_count || 0;
                                return (
                                    <div
                                        key={`group-${g.id}`}
                                        className={`card thread ${count ? "thread-unread" : ""}`}
                                        onClick={() => openGroup(g.id)}
                                    >
                                        <div className="avatar group-tile">{g.title.slice(0, 1).toUpperCase()}</div>
                                        <div className="thread-info">
                                            <div className="thread-name">{g.title}</div>
                                            <div className="thread-last">{g.members_count} участников</div>
                                        </div>
                                        {count > 0 && (
                                            <span className="unread-pill" aria-label={`${count} новых`}>
                                                {count > 9 ? "9+" : count}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </>
            )}

            <style jsx>{`
                .section-title {
                    font-size: 20px;
                    font-weight: 700;
                    margin: 4px 4px;
                    color: var(--text-main);
                }
                .section-title-group { margin-top: 12px; }
                .thread {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    cursor: pointer;
                    transition: box-shadow 0.15s;
                }
                .thread:hover { box-shadow: var(--shadow); }
                .thread-unread { background: rgba(24, 119, 242, 0.06); }
                .thread-unread::before {
                    content: "";
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    width: 4px;
                    background: var(--primary);
                    border-top-left-radius: var(--radius-lg);
                    border-bottom-left-radius: var(--radius-lg);
                }
                .thread-info { flex: 1; min-width: 0; }
                .thread-name { font-weight: 700; font-size: 15px; }
                .thread-unread .thread-name { color: var(--primary); font-weight: 800; }
                .thread-last {
                    color: var(--text-secondary);
                    font-size: 13px;
                    margin-top: 2px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .thread-unread .thread-last { color: var(--text-main); font-weight: 600; }
                .unread-pill {
                    min-width: 22px;
                    height: 22px;
                    padding: 0 7px;
                    border-radius: 999px;
                    background: var(--error);
                    color: white;
                    font-family: var(--font-mono);
                    font-weight: 800;
                    font-size: 12px;
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;
                }
                .group-tile {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius);
                    font-size: 17px;
                    background: var(--primary);
                }
            `}</style>
        </Layout>
    );
}
