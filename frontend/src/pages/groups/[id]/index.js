import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { groups } from "../../../services/groups";
import { isMocked } from "../../../services/api";

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

    if (loading) return <Layout title="Группа">…</Layout>;
    if (!g) return <Layout title="Группа">Группа не найдена</Layout>;

    return (
        <Layout title={g.title} mock={isMocked("GROUPS")}>
            <div className="card">
                <div className="card-row">
                    <div className="avatar">{g.title.slice(0, 1).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                        <div className="card-title">{g.title}</div>
                        <div className="card-meta">{g.members} участников</div>
                    </div>
                    {g.joined && <span className="badge">joined</span>}
                </div>
                {g.description && <div className="card-body">{g.description}</div>}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <Link href={`/groups/${id}/chat`} className="btn">Чат группы</Link>
                <Link href={`/groups/${id}/events`} className="btn btn-ghost">События</Link>
            </div>

            <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Посты группы</h2>
            <div className="empty-state">Пока ничего не опубликовано</div>
        </Layout>
    );
}
