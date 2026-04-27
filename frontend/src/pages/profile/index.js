import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { profile } from "../../services/profile";
import { followers } from "../../services/followers";
import { isMocked } from "../../services/api";

export default function MyProfile() {
    const router = useRouter();
    const [me, setMe] = useState(null);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [pendingList, setPendingList] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadAll = async () => {
        const data = await profile.get("me");
        setMe(data);
        if (data?.id) {
            const [fl, fg, pen] = await Promise.all([
                followers.listFollowers(data.id),
                followers.listFollowing(data.id),
                followers.listIncomingRequests().catch(() => []),
            ]);
            setFollowersList(fl || []);
            setFollowingList(fg || []);
            setPendingList(pen || []);
        }
    };

    useEffect(() => {
        (async () => {
            try { await loadAll(); } finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <Layout title="Мой профиль">…</Layout>;
    if (!me) return <Layout title="Мой профиль">Не авторизованы</Layout>;

    const togglePrivacy = async () => {
        const updated = await profile.setPrivacy(!me.is_public);
        setMe({ ...me, is_public: updated.is_public });
    };

    const unfollow = async (uid) => {
        await followers.unfollow(uid);
        await loadAll();
    };

    const accept = async (uid) => {
        await followers.accept(uid);
        await loadAll();
    };

    const decline = async (uid) => {
        await followers.decline(uid);
        await loadAll();
    };

    const handle = (u) => u.nickname || `id${u.id}`;

    const renderUserCard = (u, action) => (
        <div key={u.id} className="card card-row">
            <div
                className="avatar"
                onClick={() => router.push(`/profile/${u.id}`)}
                style={{ cursor: "pointer" }}
            >
                {(u.first_name || u.nickname || "?").slice(0, 1).toUpperCase()}
            </div>
            <div
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => router.push(`/profile/${u.id}`)}
            >
                <div className="card-title">{u.first_name} {u.last_name}</div>
                <div className="card-meta">@{handle(u)}</div>
            </div>
            {action}
        </div>
    );

    return (
        <Layout
            title="Мой профиль"
            mock={isMocked("PROFILE")}
            action={
                <button className="btn btn-ghost" onClick={togglePrivacy}>
                    {me.is_public ? "🌐 Публичный" : "🔒 Приватный"}
                </button>
            }
        >
            <div className="card">
                <div className="card-row">
                    <div className="avatar" style={{ width: 72, height: 72, fontSize: "1.4rem" }}>
                        {(me.first_name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div className="card-title" style={{ fontSize: "1.4rem" }}>
                            {me.first_name} {me.last_name}
                        </div>
                        <div className="card-meta">@{me.nickname || me.email} · {me.email}</div>
                    </div>
                </div>
                {me.about_me && <div className="card-body" style={{ marginTop: "1rem" }}>{me.about_me}</div>}
                <div style={{ display: "flex", gap: "2rem", marginTop: "1.25rem", color: "var(--text-muted)" }}>
                    <span><strong style={{ color: "var(--text-main)" }}>{followersList.length}</strong> подписчиков</span>
                    <span><strong style={{ color: "var(--text-main)" }}>{followingList.length}</strong> подписок</span>
                </div>
            </div>

            {pendingList.length > 0 && (
                <>
                    <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>
                        Запросы на подписку
                    </h2>
                    {pendingList.map((u) => renderUserCard(u,
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn" onClick={() => accept(u.id)}>Принять</button>
                            <button className="btn btn-danger" onClick={() => decline(u.id)}>Отклонить</button>
                        </div>
                    ))}
                </>
            )}

            <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Подписчики ({followersList.length})</h2>
            {followersList.length === 0 ? (
                <div className="empty-state">Пока никого</div>
            ) : (
                followersList.map((u) => renderUserCard(u, null))
            )}

            <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Подписки ({followingList.length})</h2>
            {followingList.length === 0 ? (
                <div className="empty-state">Вы ни на кого не подписаны</div>
            ) : (
                followingList.map((u) => renderUserCard(u,
                    <button className="btn btn-ghost" onClick={() => unfollow(u.id)}>
                        Отписаться
                    </button>
                ))
            )}
        </Layout>
    );
}
