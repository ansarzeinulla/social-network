import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                if (r.ok) setPost((await r.json()).post);
                else setError('Post not found');
                await loadComments();
            } catch (_) { setError('Failed to fetch post'); }
            finally { setLoading(false); }
        })();
    }, [id]);

    const submitComment = async (e) => {
        e.preventDefault();
        const text = newComment.trim();
        if (!text) return;
        try {
            await commentsSvc.add(id, text);
            setNewComment("");
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
                    <div className="avatar">{(post.first_name || "?").slice(0, 1).toUpperCase()}</div>
                    <div className="author-info">
                        <div className="author-name">{post.first_name} {post.last_name}</div>
                        <div className="author-meta">
                            <span>{new Date(post.created_at).toLocaleString()}</span>
                            <span>·</span>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                {PRIVACY_ICON[post.privacy] || "public"}
                            </span>
                            <span>{PRIVACY_LABEL[post.privacy]}</span>
                        </div>
                    </div>
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

                <div className="comments-count">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat_bubble</span>
                    {comments.length} комментариев
                </div>
            </article>

            <div className="card composer">
                <form onSubmit={submitComment}>
                    <input
                        type="text"
                        placeholder="Написать комментарий…"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                </form>
            </div>

            {comments.map((c) => (
                <div key={c.id} className="card comment">
                    <div className="avatar" style={{ width: 36, height: 36 }}>
                        {(c.first_name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="comment-body">
                        <div className="comment-author">
                            {c.first_name} {c.last_name}
                            <span className="comment-time">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <div className="comment-text">{c.content}</div>
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
                .author-info { flex: 1; }
                .author-name { font-weight: 700; font-size: 15px; }
                .author-meta {
                    color: var(--text-secondary);
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 2px;
                }
                .post-content {
                    padding: 0 16px 12px;
                    font-size: 16px;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .post-image { width: 100%; max-height: 500px; object-fit: cover; display: block; }
                .comments-count {
                    border-top: 1px solid var(--border-soft);
                    padding: 12px 16px;
                    color: var(--text-secondary);
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .composer { padding: 8px 12px; }
                .composer input {
                    width: 100%;
                    background: var(--bg);
                    border: none;
                    outline: none;
                    padding: 10px 16px;
                    border-radius: 999px;
                    font-size: 14px;
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
                .btn { display: inline-flex; align-items: center; gap: 4px; }
            `}</style>
        </Layout>
    );
}
