import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import ConfirmModal from "../../components/ConfirmModal";
import { groups } from "../../services/groups";
import { useUser } from "../../hooks/useUser";
import { useWebSocket } from "../../hooks/useWebSocket";

export default function GroupsSearch() {
    const router = useRouter();
    const { user } = useUser();
    const [list, setList] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    // Group id pending confirmation for cancellation (null = modal closed).
    const [pendingCancelId, setPendingCancelId] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await groups.list();
            setList(data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Refresh the list when the user's relationship to ANY group changes:
    //  - group_accepted: my pending request was approved → "Запрос отправлен" → "Открыть"
    //  - group_invite:   someone invited me → show as joinable/pending
    // Without this, the list stays stale until manual reload.
    useWebSocket((ev) => {
        if (ev.type !== "notification.new") return;
        const p = ev.payload || {};
        if (p.type === "group_accepted" || p.type === "group_invite") {
            load();
        }
    }, { enabled: !!user });

    // Fallback for missed WS events (frequent in dev — socket churns on
    // every page transition): reload the list whenever the WS reconnects.
    useEffect(() => {
        const onOpen = () => load();
        window.addEventListener("ws:open", onOpen);
        return () => window.removeEventListener("ws:open", onOpen);
    }, []);

    const join = async (id) => { await groups.join(id); await load(); };
    const confirmCancel = async () => {
        const id = pendingCancelId;
        setPendingCancelId(null);
        if (!id) return;
        try {
            await groups.cancelRequest(id);
            await load();
        } catch (e) {
            alert(e?.message || "Не удалось отменить запрос");
        }
    };

    const filtered = list.filter((g) =>
        g.title.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <Layout
            title="Поиск групп"
            action={
                <button className="btn" onClick={() => router.push("/groups/new")}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    Создать группу
                </button>
            }
        >
            <div className="card search-card">
                <span className="material-symbols-outlined">search</span>
                <input
                    type="text"
                    placeholder="Поиск группы по названию…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="empty-state">Loading…</div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">Группы не найдены</div>
            ) : (
                filtered.map((g) => (
                    <div key={g.id} className="card group-card">
                        <div className="group-header">
                            <div className="avatar group-avatar">{g.title.slice(0, 1).toUpperCase()}</div>
                            <div className="group-info" onClick={() => router.push(`/groups/${g.id}`)} style={{ cursor: "pointer" }}>
                                <div className="group-title">{g.title}</div>
                                <div className="group-meta">{g.members_count} участников</div>
                            </div>
                            {g.joined ? (
                                <button className="btn btn-ghost" onClick={() => router.push(`/groups/${g.id}`)}>Открыть</button>
                            ) : g.pending ? (
                                <button
                                    className="btn btn-ghost cancel-req-btn"
                                    onClick={() => setPendingCancelId(g.id)}
                                    title="Кликните, чтобы отменить запрос"
                                >
                                    <span className="default-label">Запрос отправлен</span>
                                    <span className="hover-label">Отменить</span>
                                </button>
                            ) : (
                                <button className="btn" onClick={() => join(g.id)}>Вступить</button>
                            )}
                        </div>
                        {g.description && <div className="group-desc">{g.description}</div>}
                    </div>
                ))
            )}

            <ConfirmModal
                open={pendingCancelId !== null}
                title="Отменить запрос на вступление?"
                message="Заявку можно будет отправить снова позже."
                confirmLabel="Отменить запрос"
                cancelLabel="Не отменять"
                danger
                onConfirm={confirmCancel}
                onClose={() => setPendingCancelId(null)}
            />

            <style jsx>{`
                .search-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                }
                .search-card :global(.material-symbols-outlined) { color: var(--text-secondary); }
                .search-card input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 15px;
                }
                .group-card { padding: 16px; }
                .group-header { display: flex; align-items: center; gap: 12px; }
                .group-avatar {
                    width: 56px;
                    height: 56px;
                    border-radius: var(--radius-lg);
                    font-size: 22px;
                }
                .group-info { flex: 1; min-width: 0; }
                .group-title { font-weight: 700; font-size: 16px; }
                .group-meta { color: var(--text-secondary); font-size: 13px; margin-top: 2px; }
                .group-desc {
                    margin-top: 12px;
                    color: var(--text-main);
                    font-size: 14px;
                    line-height: 1.5;
                }
                .cancel-req-btn .hover-label { display: none; }
                .cancel-req-btn:hover { background: rgba(240, 40, 73, 0.12); color: var(--error); }
                .cancel-req-btn:hover .default-label { display: none; }
                .cancel-req-btn:hover .hover-label { display: inline; }
            `}</style>
        </Layout>
    );
}
