import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Avatar from '../../components/Avatar';
import LikersModal from '../../components/LikersModal';
import { fetchApi, assetURL, apiJSON } from '../../services/api';
import { comments as commentsSvc } from '../../services/comments';

const PRIVACY_ICON = { public: "public", almost_private: "group", private: "lock" };
const PRIVACY_LABEL = { public: "Public", almost_private: "Followers", private: "Private" };

export default function PostDetails() {
    const router = useRouter();
    const { id } = router.query;
    const [post, setPost] = useState(null);
    const [me, setMe] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [commentImage, setCommentImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [likePending, setLikePending] = useState(false);
    const [likersOpen, setLikersOpen] = useState(false);
    const [viewers, setViewers] = useState([]); // populated only for private post + author

    const loadComments = async () => {
        if (!id) return;
        try {
            const list = await commentsSvc.list(id);
            setComments(list || []);
        } catch (_) {}
    };

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const meRes = await fetchApi('/profile');
                if (meRes.ok) setMe(await meRes.json());
                const r = await fetchApi(`/post?id=${id}`);
                if (r.ok) {
                    const data = await r.json();
                    const p = data.post;
                    setPost(p);
                    setLiked(Boolean(p?.is_liked));
                    setLikesCount(p?.likes_count ?? 0);
                    setViewers(Array.isArray(data.viewers) ? data.viewers : []);
                }
                else setError('Post not found');
                await loadComments();
            } catch (_) { setError('Failed to fetch post'); }
            finally { setLoading(false); }
        })();
    }, [id]);

    const toggleLike = async () => {
        if (likePending || !id) return;
        const prevLiked = liked;
        const prevCount = likesCount;
        setLiked(!prevLiked);
        setLikesCount(prevCount + (prevLiked ? -1 : 1));
        setLikePending(true);
        try {
            const res = await fetchApi(`/posts/${id}/like`, { method: "POST" });
            if (!res.ok) throw new Error("like failed");
            const data = await res.json();
            setLiked(Boolean(data.liked));
            setLikesCount(data.likes_count ?? 0);
        } catch (_) {
            setLiked(prevLiked);
            setLikesCount(prevCount);
        } finally {
            setLikePending(false);
        }
    };

    const submitComment = async (e) => {
        e.preventDefault();
        const text = newComment.trim();
        if (!text && !commentImage) return;
        try {
            await commentsSvc.add(id, text, commentImage);
            setNewComment("");
            setCommentImage(null);
            await loadComments();
        } catch (_) {}
    };

    if (loading) return <Layout><div className="empty-state">Loading…</div></Layout>;
    if (error) return <Layout><div className="empty-state">{error}</div></Layout>;
    if (!post) return <Layout><div className="empty-state">Post not found</div></Layout>;

    const isAuthor = me && me.id === post.user_id;

    return (
        <Layout>
            <article className="card post">
                <div className="post-header">
                    <Link href={`/profile/${post.user_id}`} className="author-link">
                        <Avatar url={post.avatar} name={post.first_name} />
                    </Link>
                    <Link href={`/profile/${post.user_id}`} className="author-link author-info">
                        <div className="author-name">{post.first_name} {post.last_name}</div>
                        <div className="author-meta">
                            <span>{new Date(post.created_at).toLocaleString()}</span>
                            <span>·</span>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                {PRIVACY_ICON[post.privacy] || "public"}
                            </span>
                            <span>{PRIVACY_LABEL[post.privacy]}</span>
                        </div>
                    </Link>
                    {isAuthor && (
                        <button className="btn btn-ghost" onClick={() => router.push(`/post/edit/${id}`)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                            Edit
                        </button>
                    )}
                </div>

                <div className="post-content">{post.content}</div>

                {post.image_url && (
                    <img className="post-image" src={assetURL(post.image_url)} alt="" />
                )}

                {isAuthor && post.privacy === "private" && viewers.length > 0 && (
                    <div className="viewers-row">
                        <span className="viewers-label">Доступ открыт:</span>
                        <div className="viewers-chips">
                            {viewers.map((v) => (
                                <Link key={v.id} href={`/profile/${v.id}`} className="viewer-chip">
                                    <Avatar url={v.avatar} name={v.first_name} size={24} />
                                    <span>{v.first_name} {v.last_name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {(likesCount > 0 || comments.length > 0) && (
                    <div className="post-summary">
                        {likesCount > 0 ? (
                            <button
                                type="button"
                                className="post-summary-likes"
                                onClick={() => setLikersOpen(true)}
                                title="Посмотреть кто лайкнул"
                            >
                                <span className="post-like-icon">
                                    <span className="material-symbols-outlined icon-fill">thumb_up</span>
                                </span>
                                <span>{likesCount}</span>
                            </button>
                        ) : <span />}
                        {comments.length > 0 && (
                            <span className="post-summary-comments">{comments.length} комментариев</span>
                        )}
                    </div>
                )}

                <div className="post-actions">
                    {!isAuthor && (
                        <button
                            type="button"
                            className={`action ${liked ? "is-active" : ""}`}
                            onClick={toggleLike}
                        >
                            <span className={`material-symbols-outlined${liked ? " icon-fill" : ""}`}>thumb_up</span>
                            <span>Нравится</span>
                        </button>
                    )}
                    <button
                        type="button"
                        className="action"
                        onClick={async () => {
                            const url = `${window.location.origin}/post/${id}`;
                            try {
                                await navigator.clipboard.writeText(url);
                                window.alert("Ссылка скопирована");
                            } catch (_) { window.prompt("Скопируйте ссылку:", url); }
                        }}
                    >
                        <span className="material-symbols-outlined">share</span>
                        <span>Поделиться</span>
                    </button>
                </div>
            </article>

            <LikersModal
                postId={post.id}
                open={likersOpen}
                onClose={() => setLikersOpen(false)}
            />

            <div className="card composer">
                <form onSubmit={submitComment}>
                    <input
                        type="text"
                        placeholder="Написать комментарий…"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                    <label className="image-pick" title="Прикрепить изображение">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>photo_library</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setCommentImage(e.target.files?.[0] || null)}
                            hidden
                        />
                    </label>
                    <button type="submit" className="btn" disabled={!newComment.trim() && !commentImage}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                        Опубликовать
                    </button>
                </form>
                {commentImage && (
                    <div className="picked-file">
                        {commentImage.name}
                        <button type="button" onClick={() => setCommentImage(null)}>×</button>
                    </div>
                )}
            </div>

            {comments.map((c) => (
                <div key={c.id} className="card comment">
                    <Avatar url={c.avatar} name={c.first_name} size={36} />
                    <div className="comment-body">
                        <div className="comment-author">
                            {c.first_name} {c.last_name}
                            <span className="comment-time">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <div className="comment-text">{c.content}</div>
                        {c.image_url && <img className="comment-image" src={assetURL(c.image_url)} alt="" />}
                    </div>
                </div>
            ))}

            <style jsx>{`
                .post { padding: 0; overflow: hidden; }
                .post-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 16px 8px;
                }
                .author-link {
                    color: inherit;
                    text-decoration: none;
                    transition: opacity 0.15s;
                }
                .author-link:hover { opacity: 0.75; color: inherit; }
                .author-info { flex: 1; min-width: 0; }
                .author-name { font-weight: 700; font-size: 15px; }
                .author-meta {
                    color: var(--text-secondary);
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 2px;
                }
                .viewers-row {
                    padding: 8px 16px 12px;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 8px;
                    border-top: 1px solid var(--border-soft);
                }
                .viewers-label {
                    font-family: var(--font-mono);
                    font-size: 12px;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .viewers-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .viewer-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px 4px 4px;
                    background: var(--bg);
                    border-radius: 999px;
                    text-decoration: none;
                    color: var(--text-main);
                    font-size: 13px;
                    font-weight: 600;
                    transition: background 0.15s;
                }
                .viewer-chip:hover { background: var(--bg-hover); color: var(--text-main); }
                .post-content {
                    padding: 0 16px 12px;
                    font-size: 16px;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .post-image { width: 100%; max-height: 500px; object-fit: cover; display: block; }
                .post-summary {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 16px;
                    border-top: 1px solid var(--border-soft);
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-family: var(--font-mono);
                }
                .post-summary-likes {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    color: inherit;
                    font: inherit;
                    font-family: var(--font-mono);
                }
                .post-summary-likes:hover { color: var(--text-main); }
                .post-like-icon {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: var(--primary);
                    display: grid;
                    place-items: center;
                }
                .post-like-icon :global(.material-symbols-outlined) {
                    font-size: 11px;
                    color: white;
                }
                .post-actions {
                    display: flex;
                    border-top: 1px solid var(--border-soft);
                    padding: 4px 8px;
                }
                .post-actions .action {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 10px;
                    background: transparent;
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 14px;
                    border-radius: var(--radius);
                    transition: background 0.15s, color 0.15s;
                }
                .post-actions .action:hover { background: var(--bg-hover); }
                .post-actions .action.is-active { color: var(--primary); }
                .composer { padding: 8px 12px; }
                .composer form {
                    display: flex;
                    gap: 8px;
                }
                .composer input {
                    flex: 1;
                    background: var(--bg);
                    border: none;
                    outline: none;
                    padding: 10px 16px;
                    border-radius: 999px;
                    font-size: 14px;
                }
                .composer .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 0 16px;
                    border-radius: 999px;
                }
                .image-pick {
                    width: 42px;
                    height: 42px;
                    border-radius: 999px;
                    background: var(--bg);
                    color: var(--accent);
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;
                    cursor: pointer;
                }
                .image-pick:hover { background: var(--bg-hover); }
                .picked-file {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-top: 8px;
                    color: var(--text-secondary);
                    font-size: 12px;
                }
                .picked-file button {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--bg-hover);
                    color: var(--text-main);
                }
                .comment {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 12px 14px;
                }
                .comment-body { flex: 1; min-width: 0; }
                .comment-author {
                    font-weight: 700;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .comment-time {
                    color: var(--text-muted);
                    font-size: 11px;
                    font-weight: 400;
                }
                .comment-text {
                    font-size: 14px;
                    margin-top: 2px;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .comment-image {
                    display: block;
                    max-width: min(100%, 360px);
                    max-height: 260px;
                    object-fit: cover;
                    border-radius: var(--radius);
                    margin-top: 8px;
                }
                .btn { display: inline-flex; align-items: center; gap: 4px; }
            `}</style>
        </Layout>
    );
}
