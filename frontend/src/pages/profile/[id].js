import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { profile } from "../../services/profile";
import { followers } from "../../services/followers";

export default function UserProfile() {
    const router = useRouter();
    const { id } = router.query;
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const reload = async () => {
        const data = await profile.get(id);
        setUser(data);
    };

    useEffect(() => {
        if (!id) return;
        (async () => { await reload(); setLoading(false); })();
    }, [id]);

    const handleFollow = async () => { await followers.follow(id); await reload(); };
    const handleUnfollow = async () => { await followers.unfollow(id); await reload(); };

    if (loading) return <Layout><div className="empty-state">Loading…</div></Layout>;
    if (!user) return <Layout><div className="empty-state">Пользователь не найден</div></Layout>;

    const canSee = user.is_public || user.is_following || user.is_self;

    return (
        <Layout>
            <div className="profile-cover">
                <div className="cover-photo" />
                <div className="profile-header">
                    <div className="avatar profile-avatar">
                        {(user.first_name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="profile-info">
                        <h1>{user.first_name} {user.last_name}</h1>
                        <p className="profile-meta">
                            @{user.nickname || `id${user.id}`}
                            <span> · </span>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle" }}>
                                {user.is_public ? "public" : "lock"}
                            </span>
                            {" "}{user.is_public ? "публичный" : "приватный"}
                        </p>
                        {canSee && (
                            <p className="profile-meta" style={{ marginTop: 4 }}>
                                <strong>{user.followers_count || 0}</strong> подписчиков
                                <span> · </span>
                                <strong>{user.following_count || 0}</strong> подписок
                            </p>
                        )}
                    </div>
                    {user.is_following ? (
                        <button className="btn btn-ghost" onClick={handleUnfollow}>Отписаться</button>
                    ) : user.is_pending ? (
                        <button className="btn btn-ghost" disabled>Запрос отправлен</button>
                    ) : (
                        <button className="btn" onClick={handleFollow}>Подписаться</button>
                    )}
                </div>

                {canSee ? (
                    user.about_me && <p className="about">{user.about_me}</p>
                ) : (
                    <p className="about" style={{ color: "var(--text-secondary)" }}>
                        🔒 Этот профиль приватный. Подпишитесь, чтобы увидеть подробности.
                    </p>
                )}
            </div>

            <style jsx>{`
                .profile-cover {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                .cover-photo {
                    height: 220px;
                    background: linear-gradient(135deg, var(--primary), #4A99F8);
                }
                .profile-header {
                    display: flex;
                    align-items: flex-end;
                    gap: 16px;
                    padding: 0 24px 16px;
                    margin-top: -56px;
                }
                .profile-avatar {
                    width: 144px;
                    height: 144px;
                    font-size: 48px;
                    border: 4px solid var(--card-bg);
                }
                .profile-info { flex: 1; padding-bottom: 8px; }
                .profile-info h1 { font-size: 24px; font-weight: 800; }
                .profile-meta { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
                .profile-meta strong { color: var(--text-main); }
                .about { padding: 0 24px 16px; color: var(--text-main); font-size: 15px; line-height: 1.5; }
            `}</style>
        </Layout>
    );
}
