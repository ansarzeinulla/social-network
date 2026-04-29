import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import Avatar from "../../components/Avatar";
import Cover from "../../components/Cover";
import PostCard from "../../components/PostCard";
import { profile } from "../../services/profile";
import { followers } from "../../services/followers";
import { apiJSON } from "../../services/api";

export default function UserProfile() {
    const router = useRouter();
    const { id } = router.query;
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = async () => {
        const data = await profile.get(id);
        setUser(data);
        // Posts only if profile is visible to caller (backend enforces too,
        // but this avoids a noisy 404/empty-state flash for private profiles).
        const canSee = data && (data.is_public || data.is_following || data.is_self);
        if (canSee) {
            const p = await apiJSON(`/users/${id}/posts`).catch(() => null);
            setPosts(p?.posts || []);
        } else {
            setPosts([]);
        }
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
                <Cover url={user.cover} seed={user.id} height={220} />
                <div className="profile-header">
                    <Avatar
                        url={user.avatar}
                        name={user.first_name || user.nickname}
                        size={144}
                        className="profile-avatar"
                    />
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
                    <div className="profile-actions">
                        {user.is_following ? (
                            <button className="btn btn-ghost" onClick={handleUnfollow}>Отписаться</button>
                        ) : user.is_pending ? (
                            <button className="btn btn-ghost" disabled>Запрос отправлен</button>
                        ) : (
                            <button className="btn" onClick={handleFollow}>Подписаться</button>
                        )}
                        <button className="btn btn-ghost" onClick={() => router.push(`/chats/${user.id}`)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                            Сообщение
                        </button>
                    </div>
                </div>

                {canSee ? (
                    user.about_me && <p className="about">{user.about_me}</p>
                ) : (
                    <p className="about" style={{ color: "var(--text-secondary)" }}>
                        🔒 Этот профиль приватный. Подпишитесь, чтобы увидеть подробности.
                    </p>
                )}
            </div>

            {canSee && (
                posts.length === 0
                    ? <div className="empty-state">Нет постов от этого пользователя</div>
                    : posts.map((p) => <PostCard key={p.id} post={p} />)
            )}

            <style jsx>{`
                .profile-cover {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                .profile-header {
                    display: flex;
                    align-items: flex-end;
                    gap: 16px;
                    padding: 0 24px 16px;
                    margin-top: -56px;
                }
                .profile-avatar {
                    border: 4px solid var(--card-bg);
                    flex-shrink: 0;
                }
                .profile-info { flex: 1; padding-bottom: 8px; }
                .profile-info h1 { font-size: 24px; font-weight: 800; }
                .profile-meta { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
                .profile-meta strong { color: var(--text-main); }
                .about { padding: 0 24px 16px; color: var(--text-main); font-size: 15px; line-height: 1.5; }
                .profile-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding-bottom: 8px;
                }
                .profile-actions :global(.btn) {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    white-space: nowrap;
                }
            `}</style>
        </Layout>
    );
}
