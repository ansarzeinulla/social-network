import { useState } from 'react';
import { useRouter } from 'next/router';
import { assetURL, fetchApi } from '../services/api';
import Avatar from './Avatar';
import LikersModal from './LikersModal';
import { useUser } from '../hooks/useUser';

const PRIVACY_ICON = {
    public: "public",
    almost_private: "group",
    private: "lock",
};

const PRIVACY_LABEL = {
    public: "Public",
    almost_private: "Followers",
    private: "Private",
};

export default function PostCard({ post }) {
    const router = useRouter();
    const { user } = useUser();
    const [liked, setLiked] = useState(Boolean(post.is_liked));
    const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
    const [pending, setPending] = useState(false);
    const [likersOpen, setLikersOpen] = useState(false);
    const apiComments = post.comments_count ?? 0;
    const showSummary = likesCount > 0 || apiComments > 0;
    const isMyPost = user && user.id === post.user_id;

    const toggleLike = async (e) => {
        e.stopPropagation();
        if (pending) return;
        // Optimistic update so the button feels instant; rollback on failure.
        const prevLiked = liked;
        const prevCount = likesCount;
        setLiked(!prevLiked);
        setLikesCount(prevCount + (prevLiked ? -1 : 1));
        setPending(true);
        try {
            const res = await fetchApi(`/posts/${post.id}/like`, { method: "POST" });
            if (!res.ok) throw new Error("like failed");
            const data = await res.json();
            setLiked(Boolean(data.liked));
            setLikesCount(data.likes_count ?? 0);
        } catch (_) {
            setLiked(prevLiked);
            setLikesCount(prevCount);
        } finally {
            setPending(false);
        }
    };

    const sharePost = async (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/post/${post.id}`;
        try {
            await navigator.clipboard.writeText(url);
            window.alert("Ссылка скопирована");
        } catch (_) {
            window.prompt("Скопируйте ссылку:", url);
        }
    };

    return (
        <article className="post-card" onClick={() => router.push(`/post/${post.id}`)}>
            <div className="post-header">
                <div className="post-author">
                    <Avatar url={post.avatar} name={post.first_name} />
                    <div>
                        <div className="author-name">{post.first_name} {post.last_name}</div>
                        <div className="author-meta">
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            <span>·</span>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                {PRIVACY_ICON[post.privacy] || "public"}
                            </span>
                            <span>{PRIVACY_LABEL[post.privacy]}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="post-content">{post.content}</div>

            {post.image_url && (
                <img className="post-image" src={assetURL(post.image_url)} alt="" />
            )}

            {showSummary && (
                <div className="post-summary">
                    {likesCount > 0 ? (
                        <button
                            type="button"
                            className="post-summary-likes"
                            onClick={(e) => { e.stopPropagation(); setLikersOpen(true); }}
                            title="Посмотреть кто лайкнул"
                        >
                            <span className="post-like-icon">
                                <span className="material-symbols-outlined icon-fill">thumb_up</span>
                            </span>
                            <span>{likesCount}</span>
                        </button>
                    ) : <span />}
                    {apiComments > 0 && (
                        <span className="post-summary-comments">{apiComments} комментариев</span>
                    )}
                </div>
            )}

            <LikersModal
                postId={post.id}
                open={likersOpen}
                onClose={() => setLikersOpen(false)}
            />

            <div className="post-actions">
                {!isMyPost && (
                    <button
                        className={`action ${liked ? "is-active" : ""}`}
                        onClick={toggleLike}
                    >
                        <span className={`material-symbols-outlined${liked ? " icon-fill" : ""}`}>thumb_up</span>
                        <span>Нравится</span>
                    </button>
                )}
                <button
                    className="action"
                    onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`); }}
                >
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span>Комментарии</span>
                </button>
                <button
                    className="action"
                    onClick={sharePost}
                >
                    <span className="material-symbols-outlined">share</span>
                    <span>Поделиться</span>
                </button>
            </div>

            <style jsx>{`
                .post-card {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                    cursor: pointer;
                    transition: box-shadow 0.15s;
                }
                .post-card:hover { box-shadow: var(--shadow); }
                .post-header {
                    padding: 16px 16px 8px;
                }
                .post-author { display: flex; align-items: center; gap: 12px; }
                .author-name {
                    font-weight: 700;
                    font-size: 15px;
                    color: var(--text-main);
                }
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
                    font-size: 15px;
                    line-height: 1.45;
                    color: var(--text-main);
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .post-image {
                    width: 100%;
                    max-height: 500px;
                    object-fit: cover;
                    display: block;
                }
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
                .action {
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
                .action:hover { background: var(--bg-hover); }
                .action.is-active { color: var(--primary); }
            `}</style>
        </article>
    );
}
