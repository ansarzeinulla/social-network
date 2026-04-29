import { useRouter } from 'next/router';
import { assetURL } from '../services/api';
import Avatar from './Avatar';

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

            <div className="post-actions">
                <button
                    className="action"
                    onClick={(e) => { e.stopPropagation(); router.push(`/post/${post.id}`); }}
                >
                    <span className="material-symbols-outlined">chat_bubble</span>
                    <span>Комментарии</span>
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
                .post-actions {
                    border-top: 1px solid var(--border-soft);
                    padding: 4px 8px;
                }
                .action {
                    width: 100%;
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
                    transition: background 0.15s;
                }
                .action:hover { background: var(--bg-hover); }
            `}</style>
        </article>
    );
}
