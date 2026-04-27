import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { chat } from "../../services/chat";
import { isMocked } from "../../services/api";

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
        <Layout title="Чаты" mock={isMocked("CHAT")}>
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
                            className="card card-row"
                            onClick={() => router.push(`/chats/${peerId}`)}
                            style={{ cursor: "pointer" }}
                        >
                            <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>
                            <div style={{ flex: 1 }}>
                                <div className="card-title">{name}</div>
                                <div className="card-meta">{last}</div>
                            </div>
                        </div>
                    );
                })
            )}
        </Layout>
    );
}
