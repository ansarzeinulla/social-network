import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import Avatar from "../../components/Avatar";
import Cover from "../../components/Cover";
import PostCard from "../../components/PostCard";
import { profile } from "../../services/profile";
import { followers } from "../../services/followers";
import { apiJSON } from "../../services/api";
import { setUser } from "../../hooks/useUser";

const TABS = ["timeline", "followers", "following", "requests"];

export default function MyProfile() {
    const router = useRouter();
    const [me, setMe] = useState(null);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [pendingList, setPendingList] = useState([]);
    const [posts, setPosts] = useState([]);
    const [tab, setTab] = useState("timeline");
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const fileRef = useRef(null);
    const coverFileRef = useRef(null);

    const loadAll = async () => {
        const data = await profile.get("me");
        setMe(data);
        if (data?.id) {
            const [fl, fg, pen, p] = await Promise.all([
                followers.listFollowers(data.id),
                followers.listFollowing(data.id),
                followers.listIncomingRequests().catch(() => []),
                apiJSON(`/users/${data.id}/posts`).catch(() => null),
            ]);
            setFollowersList(fl || []);
            setFollowingList(fg || []);
            setPendingList(pen || []);
            setPosts(p?.posts || []);
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
        setUser({ is_public: updated.is_public });
    };

    const onPickAvatar = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = ""; // reset so re-picking same file fires change
        uploadAvatar(file);
    };

    const uploadAvatar = async (file) => {
        setUploading(true);
        setUploadError("");
        try {
            const res = await profile.uploadAvatar(file);
            setMe((prev) => ({ ...prev, avatar: res.avatar }));
            setUser({ avatar: res.avatar });
        } catch (err) {
            setUploadError(err.message || "Не удалось загрузить аватар");
        } finally {
            setUploading(false);
        }
    };

    const onPickCover = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        uploadCover(file);
    };

    const uploadCover = async (file) => {
        setUploading(true);
        setUploadError("");
        try {
            const res = await profile.uploadCover(file);
            setMe((prev) => ({ ...prev, cover: res.cover }));
            setUser({ cover: res.cover });
        } catch (err) {
            setUploadError(err.message || "Не удалось загрузить обложку");
        } finally {
            setUploading(false);
        }
    };

    const userCard = (u, action) => (
        <div key={u.id} className="card user-row">
            <Avatar
                url={u.avatar}
                name={u.first_name || u.nickname}
                onClick={() => router.push(`/profile/${u.id}`)}
                style={{ cursor: "pointer" }}
            />
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
                <Cover url={me.cover} seed={me.id} height={220}>
                    <button
                        type="button"
                        className="cover-edit"
                        onClick={() => coverFileRef.current?.click()}
                        disabled={uploading}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>photo_camera</span>
                        Сменить обложку
                    </button>
                    <input
                        ref={coverFileRef}
                        type="file"
                        accept="image/*"
                        onChange={onPickCover}
                        hidden
                    />
                </Cover>
                <div className="profile-header">
                    <div className="avatar-wrap">
                        <Avatar
                            url={me.avatar}
                            name={me.first_name}
                            size={144}
                            className="profile-avatar"
                        />
                        <button
                            type="button"
                            className="avatar-edit"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            title="Сменить аватар"
                        >
                            <span className="material-symbols-outlined">photo_camera</span>
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={onPickAvatar}
                            hidden
                        />
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
                {uploading && <p className="upload-status">Загружаем аватар…</p>}
                {uploadError && <p className="upload-status error">{uploadError}</p>}
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
                posts.length === 0
                    ? <div className="empty-state">Постов пока нет</div>
                    : posts.map((p) => <PostCard key={p.id} post={p} />)
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
                .cover-edit {
                    position: absolute;
                    bottom: 12px;
                    right: 12px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(0, 0, 0, 0.5);
                    color: white;
                    padding: 6px 12px;
                    border-radius: var(--radius);
                    font-size: 13px;
                    font-weight: 600;
                    backdrop-filter: blur(4px);
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .cover-edit:hover { background: rgba(0, 0, 0, 0.7); }
                .cover-edit:disabled { opacity: 0.5; cursor: not-allowed; }
                .profile-header {
                    display: flex;
                    align-items: flex-end;
                    gap: 16px;
                    padding: 0 24px 16px;
                    margin-top: -56px;
                }
                .avatar-wrap {
                    position: relative;
                    flex-shrink: 0;
                }
                .profile-avatar {
                    border: 4px solid var(--card-bg);
                }
                .avatar-edit {
                    position: absolute;
                    bottom: 6px;
                    right: 6px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    display: grid;
                    place-items: center;
                    cursor: pointer;
                    transition: background 0.15s;
                    box-shadow: var(--shadow-sm);
                }
                .avatar-edit:hover { background: var(--bg-hover); }
                .avatar-edit:disabled { opacity: 0.5; cursor: not-allowed; }
                .avatar-edit :global(.material-symbols-outlined) { font-size: 20px; }
                .upload-status {
                    padding: 0 24px 8px;
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .upload-status.error { color: var(--error); }
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
