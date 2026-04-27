import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { groups } from "../services/groups";
import { isMocked } from "../services/api";

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
            mock={isMocked("GROUPS")}
            action={
                <button className="btn" onClick={() => router.push("/groups/new")}>
                    + Создать
                </button>
            }
        >
            {loading ? (
                <div className="empty-state">Loading…</div>
            ) : list.length === 0 ? (
                <div className="empty-state">Вы не состоите ни в одной группе</div>
            ) : (
                list.map((g) => (
                    <div key={g.id} className="card" onClick={() => router.push(`/groups/${g.id}`)} style={{ cursor: "pointer" }}>
                        <div className="card-row">
                            <div className="avatar">{g.title.slice(0, 1).toUpperCase()}</div>
                            <div style={{ flex: 1 }}>
                                <div className="card-title">{g.title}</div>
                                <div className="card-meta">{g.members} участников</div>
                            </div>
                            <span className="badge">joined</span>
                        </div>
                    </div>
                ))
            )}
        </Layout>
    );
}
