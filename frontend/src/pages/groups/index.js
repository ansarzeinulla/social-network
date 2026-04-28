import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { groups } from "../../services/groups";

export default function GroupsSearch() {
    const router = useRouter();
    const [list, setList] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);

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

    const join = async (id) => { await groups.join(id); await load(); };

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
                                <button className="btn btn-ghost" disabled>Запрос отправлен</button>
                            ) : (
                                <button className="btn" onClick={() => join(g.id)}>Вступить</button>
                            )}
                        </div>
                        {g.description && <div className="group-desc">{g.description}</div>}
                    </div>
                ))
            )}

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
            `}</style>
        </Layout>
    );
}
