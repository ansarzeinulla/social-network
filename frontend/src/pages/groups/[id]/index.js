import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { groups } from "../../../services/groups";

export default function GroupPage() {
    const router = useRouter();
    const { id } = router.query;
    const [g, setG] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            const data = await groups.get(id);
            setG(data);
            setLoading(false);
        })();
    }, [id]);

    if (loading) return <Layout><div className="empty-state">Loading…</div></Layout>;
    if (!g) return <Layout><div className="empty-state">Группа не найдена</div></Layout>;

    return (
        <Layout>
            <div className="group-cover">
                <div className="cover-photo" />
                <div className="group-header">
                    <div className="avatar group-avatar">{g.title.slice(0, 1).toUpperCase()}</div>
                    <div className="group-info">
                        <h1>{g.title}</h1>
                        <p className="group-meta">
                            <strong>{g.members_count}</strong> участников
                            {g.joined && <> · <span className="badge">joined</span></>}
                            {g.pending && <> · <span className="badge" style={{ color: "var(--warning)" }}>pending</span></>}
                        </p>
                    </div>
                </div>
                {g.description && <p className="about">{g.description}</p>}
            </div>

            <div className="card actions-card">
                <Link href={`/groups/${id}/chat`} className="action-btn">
                    <span className="material-symbols-outlined">chat</span>
                    <span>Чат группы</span>
                </Link>
                <Link href={`/groups/${id}/events`} className="action-btn">
                    <span className="material-symbols-outlined">event</span>
                    <span>События</span>
                </Link>
            </div>

            <div className="empty-state">Посты группы появятся здесь</div>

            <style jsx>{`
                .group-cover {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                .cover-photo {
                    height: 180px;
                    background: linear-gradient(135deg, var(--primary), #4A99F8);
                }
                .group-header {
                    display: flex;
                    align-items: flex-end;
                    gap: 16px;
                    padding: 0 24px 16px;
                    margin-top: -40px;
                }
                .group-avatar {
                    width: 96px;
                    height: 96px;
                    font-size: 36px;
                    border-radius: var(--radius-lg);
                    border: 4px solid var(--card-bg);
                }
                .group-info { flex: 1; padding-bottom: 8px; }
                .group-info h1 { font-size: 22px; font-weight: 800; }
                .group-meta { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
                .group-meta strong { color: var(--text-main); }
                .about { padding: 0 24px 16px; font-size: 14px; line-height: 1.5; }
                .actions-card {
                    display: flex;
                    gap: 8px;
                    padding: 8px;
                }
                .action-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px;
                    border-radius: var(--radius);
                    color: var(--text-main);
                    font-weight: 600;
                    font-size: 14px;
                    transition: background 0.15s;
                }
                .action-btn:hover { background: var(--bg-hover); color: var(--text-main); }
                .action-btn :global(.material-symbols-outlined) { color: var(--primary); font-size: 22px; }
            `}</style>
        </Layout>
    );
}
