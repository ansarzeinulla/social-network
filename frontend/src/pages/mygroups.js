import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { groups } from "../services/groups";

export default function MyGroups() {
    const router = useRouter();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const data = await groups.list();
            setList((data || []).filter((g) => g.joined));
            setLoading(false);
        })();
    }, []);

    return (
        <Layout
            title="Мои группы"
            action={
                <button className="btn" onClick={() => router.push("/groups/new")}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    Создать
                </button>
            }
        >
            {loading ? (
                <div className="empty-state">Loading…</div>
            ) : list.length === 0 ? (
                <div className="empty-state">Вы не состоите ни в одной группе</div>
            ) : (
                list.map((g) => (
                    <div
                        key={g.id}
                        className="card group-card"
                        onClick={() => router.push(`/groups/${g.id}`)}
                    >
                        <div className="avatar group-avatar">{g.title.slice(0, 1).toUpperCase()}</div>
                        <div className="group-info">
                            <div className="group-title">{g.title}</div>
                            <div className="group-meta">{g.members_count} участников</div>
                        </div>
                        <span className="badge">joined</span>
                    </div>
                ))
            )}

            <style jsx>{`
                .group-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    cursor: pointer;
                    transition: box-shadow 0.15s;
                }
                .group-card:hover { box-shadow: var(--shadow); }
                .group-avatar {
                    width: 56px;
                    height: 56px;
                    border-radius: var(--radius-lg);
                    font-size: 22px;
                }
                .group-info { flex: 1; min-width: 0; }
                .group-title { font-weight: 700; font-size: 16px; }
                .group-meta { color: var(--text-secondary); font-size: 13px; margin-top: 2px; }
            `}</style>
        </Layout>
    );
}
