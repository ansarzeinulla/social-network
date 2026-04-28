import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { profile } from "../../services/profile";
import { followers } from "../../services/followers";

const TABS = ["timeline", "followers", "following", "requests"];

export default function MyProfile() {
    const router = useRouter();
    const [me, setMe] = useState(null);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [pendingList, setPendingList] = useState([]);
    const [tab, setTab] = useState("timeline");
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
        (async () => { try { await loadAll(); } finally { setLoading(false); } })();
    }, []);

    if (loading) return <Layout><div className="empty-state">Loading…</div></Layout>;
    if (!me) return <Layout><div className="empty-state">Не авторизованы</div></Layout>;

    const togglePrivacy = async () => {
        const updated = await profile.setPrivacy(!me.is_public);
        setMe({ ...me, is_public: updated.is_public });
    };

    const userCard = (u, action) => (
        <div key={u.id} className="card user-row">
            <div className="avatar" onClick={() => router.push(`/profile/${u.id}`)} style={{ cursor: "pointer" }}>
                {(u.first_name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="user-info" onClick={() => router.push(`/profile/${u.id}`)} style={{ cursor: "pointer" }}>
                <div className="user-name">{u.first_name} {u.last_name}</div>
                <div className="user-handle">@{u.nickname || `id${u.id}`}</div>
            </div>
            {action}
        </div>
    );

    return (
        <Layout>
            <div className="profile-cover">
                <div className="cover-photo" />
                <div className="profile-header">
                    <div className="avatar profile-avatar">
                        {(me.first_name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="profile-info">
                        <h1>{me.first_name} {me.last_name}</h1>
                        <p className="profile-meta">
                            @{me.nickname || me.email}
                            <span> · </span>
                            <strong>{followersList.length}</strong> подписчиков
                            <span> · </span>
                            <strong>{followingList.length}</strong> подписок
                        </p>
                    </div>
                    <button className="btn btn-ghost" onClick={togglePrivacy}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            {me.is_public ? "public" : "lock"}
                        </span>
                        {me.is_public ? "Публичный" : "Приватный"}
                    </button>
                </div>
                {me.about_me && <p className="about">{me.about_me}</p>}
            </div>

            <div className="tabs card">
                {TABS.map((t) => (
                    <button
                        key={t}
                        className={`tab ${tab === t ? "active" : ""}`}
                        onClick={() => setTab(t)}
                    >
                        {t === "timeline" && "Лента"}
                        {t === "followers" && `Подписчики (${followersList.length})`}
                        {t === "following" && `Подписки (${followingList.length})`}
                        {t === "requests" && `Запросы${pendingList.length ? ` (${pendingList.length})` : ""}`}
                    </button>
                ))}
            </div>

            {tab === "timeline" && (
                <div className="empty-state">Здесь будут ваши посты</div>
            )}
            {tab === "followers" && (followersList.length === 0
                ? <div className="empty-state">Пока никого</div>
                : followersList.map((u) => userCard(u, null))
            )}
            {tab === "following" && (followingList.length === 0
                ? <div className="empty-state">Вы ни на кого не подписаны</div>
                : followingList.map((u) => userCard(u,
                    <button className="btn btn-ghost" onClick={async () => { await followers.unfollow(u.id); await loadAll(); }}>
                        Отписаться
                    </button>
                ))
            )}
            {tab === "requests" && (pendingList.length === 0
                ? <div className="empty-state">Нет запросов</div>
                : pendingList.map((u) => userCard(u,
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn" onClick={async () => { await followers.accept(u.id); await loadAll(); }}>Принять</button>
                        <button className="btn btn-danger" onClick={async () => { await followers.decline(u.id); await loadAll(); }}>Отклонить</button>
                    </div>
                ))
            )}

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
                .about {
                    padding: 0 24px 16px;
                    color: var(--text-main);
                    font-size: 15px;
                    line-height: 1.5;
                }
                .tabs {
                    display: flex;
                    gap: 4px;
                    padding: 4px;
                }
                .tab {
                    flex: 1;
                    background: transparent;
                    color: var(--text-secondary);
                    padding: 10px 12px;
                    font-weight: 600;
                    font-size: 14px;
                    border-radius: var(--radius);
                    transition: background 0.15s;
                }
                .tab:hover { background: var(--bg-hover); color: var(--text-main); }
                .tab.active { background: rgba(var(--primary-rgb), 0.12); color: var(--primary); }
                .user-row { display: flex; align-items: center; gap: 12px; }
                .user-info { flex: 1; }
                .user-name { font-weight: 700; font-size: 15px; }
                .user-handle { color: var(--text-secondary); font-size: 13px; }
                .btn { display: inline-flex; align-items: center; gap: 6px; }
            `}</style>
        </Layout>
    );
}
