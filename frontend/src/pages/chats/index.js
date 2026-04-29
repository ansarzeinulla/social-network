import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import Avatar from "../../components/Avatar";
import { chat } from "../../services/chat";

export default function ChatsPage() {
    const router = useRouter();
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const list = await chat.listThreads();
            setThreads(list || []);
            setLoading(false);
        })();
    }, []);

    return (
        <Layout title="Чаты">
            {loading ? (
                <div className="empty-state">Loading…</div>
            ) : threads.length === 0 ? (
                <div className="empty-state">Нет диалогов</div>
            ) : (
                threads.map((t) => {
                    const peerId = t.peer_id ?? t.id;
                    const name = t.first_name
                        ? `${t.first_name} ${t.last_name}`
                        : (t.with || "user");
                    const last = t.last_message ?? t.last ?? "";
                    return (
                        <div
                            key={peerId}
                            className="card thread"
                            onClick={() => router.push(`/chats/${peerId}`)}
                        >
                            <Avatar url={t.avatar} name={name} />
                            <div className="thread-info">
                                <div className="thread-name">{name}</div>
                                <div className="thread-last">{last}</div>
                            </div>
                        </div>
                    );
                })
            )}

            <style jsx>{`
                .thread {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    cursor: pointer;
                    transition: box-shadow 0.15s;
                }
                .thread:hover { box-shadow: var(--shadow); }
                .thread-info { flex: 1; min-width: 0; }
                .thread-name { font-weight: 700; font-size: 15px; }
                .thread-last {
                    color: var(--text-secondary);
                    font-size: 13px;
                    margin-top: 2px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            `}</style>
        </Layout>
    );
}
