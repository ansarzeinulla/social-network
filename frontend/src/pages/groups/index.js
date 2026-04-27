import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { groups } from "../../services/groups";
import { isMocked } from "../../services/api";

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

    const join = async (id) => {
        await groups.join(id);
        await load();
    };

    const filtered = list.filter((g) =>
        g.title.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <Layout
            title="Поиск групп"
            mock={isMocked("GROUPS")}
            action={
                <button className="btn" onClick={() => router.push("/groups/new")}>
                    + Создать группу
                </button>
            }
        >
            <input
                type="text"
                placeholder="Поиск группы по названию…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                    width: "100%",
                    padding: "0.7rem 0.9rem",
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    color: "var(--text-main)",
                    marginBottom: "1.5rem",
                }}
            />

            {loading ? (
                <div className="empty-state">Loading…</div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">Группы не найдены</div>
            ) : (
                filtered.map((g) => (
                    <div key={g.id} className="card">
                        <div className="card-row">
                            <div className="avatar">{g.title.slice(0, 1).toUpperCase()}</div>
                            <div style={{ flex: 1 }}>
                                <div className="card-title">{g.title}</div>
                                <div className="card-meta">{g.members} участников</div>
                            </div>
                            {g.joined ? (
                                <button className="btn btn-ghost" onClick={() => router.push(`/groups/${g.id}`)}>
                                    Открыть
                                </button>
                            ) : g.pending ? (
                                <button className="btn btn-ghost" disabled>
                                    Запрос отправлен
                                </button>
                            ) : (
                                <button className="btn" onClick={() => join(g.id)}>
                                    Вступить
                                </button>
                            )}
                        </div>
                        {g.description && <div className="card-body">{g.description}</div>}
                    </div>
                ))
            )}
        </Layout>
    );
}
