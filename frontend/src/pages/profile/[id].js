import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { profile } from "../../services/profile";
import { followers } from "../../services/followers";
import { isMocked } from "../../services/api";

export default function UserProfile() {
    const router = useRouter();
    const { id } = router.query;
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            const data = await profile.get(id);
            setUser(data);
            setLoading(false);
        })();
    }, [id]);

    const reload = async () => {
        const data = await profile.get(id);
        setUser(data);
    };

    const handleFollow = async () => {
        await followers.follow(id);
        await reload();
    };

    const handleUnfollow = async () => {
        await followers.unfollow(id);
        await reload();
    };

    if (loading) return <Layout title="Профиль">…</Layout>;
    if (!user) return <Layout title="Профиль">Пользователь не найден</Layout>;

    const canSeeDetails = user.is_public || user.is_following;

    return (
        <Layout title="Профиль" mock={isMocked("PROFILE")}>
            <div className="card">
                <div className="card-row">
                    <div className="avatar" style={{ width: 72, height: 72, fontSize: "1.4rem" }}>
                        {(user.first_name || user.nickname || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div className="card-title" style={{ fontSize: "1.4rem" }}>
                            {user.first_name} {user.last_name}
                        </div>
                        <div className="card-meta">
                            @{user.nickname || "user"} · {user.is_public ? "🌐 публичный" : "🔒 приватный"}
                        </div>
                    </div>
                    {user.is_following ? (
                        <button className="btn btn-ghost" onClick={handleUnfollow}>Отписаться</button>
                    ) : user.is_pending ? (
                        <button className="btn btn-ghost" disabled>Запрос отправлен</button>
                    ) : (
                        <button className="btn" onClick={handleFollow}>Подписаться</button>
                    )}
                </div>

                {canSeeDetails ? (
                    <>
                        {user.about_me && <div className="card-body" style={{ marginTop: "1rem" }}>{user.about_me}</div>}
                        <div style={{ display: "flex", gap: "2rem", marginTop: "1.25rem", color: "var(--text-muted)" }}>
                            <span><strong style={{ color: "var(--text-main)" }}>{user.followers_count || 0}</strong> подписчиков</span>
                            <span><strong style={{ color: "var(--text-main)" }}>{user.following_count || 0}</strong> подписок</span>
                        </div>
                    </>
                ) : (
                    <div className="empty-state" style={{ marginTop: "1rem" }}>
                        🔒 Этот профиль приватный. Подпишитесь, чтобы увидеть подробности.
                    </div>
                )}
            </div>
        </Layout>
    );
}
