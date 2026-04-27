import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { fetchApi, assetURL } from '../../services/api';

export default function PostDetails() {
    const router = useRouter();
    const { id } = router.query;
    const [post, setPost] = useState(null);
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                const meRes = await fetchApi('/profile');
                if (meRes.ok) setMe(await meRes.json());

                const res = await fetchApi(`/post?id=${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setPost(data.post);
                } else {
                    setError('Post not found');
                }
            } catch (err) {
                setError('Failed to fetch post');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!post) return <div className="not-found">Post not found</div>;

    const isAuthor = me && me.id === post.user_id;

    return (
        <div className="layout">
            <Navbar />
            <main className="container">
                <div className="post-full fade-in">
                    <div className="post-header">
                        <div className="author-info">
                            <div className="avatar">{post.first_name[0]}{post.last_name[0]}</div>
                            <div className="meta">
                                <span className="name">{post.first_name} {post.last_name}</span>
                                <span className="date">{new Date(post.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="privacy-badge">{post.privacy.replace('_', ' ')}</div>
                    </div>

                    {post.image_url && (
                        <div className="post-image">
                            <img src={assetURL(post.image_url)} alt="" />
                        </div>
                    )}

                    <div className="post-content">
                        {post.content.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>

                    {isAuthor && (
                        <div className="post-actions">
                            <button className="edit-btn" onClick={() => router.push(`/post/edit/${id}`)}>
                                ✏️ Edit Post
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .layout {
                    min-height: 100vh;
                    background: var(--bg-main);
                }
                .post-full {
                    max-width: 800px;
                    margin: 3rem auto;
                    background: var(--card-bg);
                    border-radius: 24px;
                    padding: 3rem;
                    border: 1px solid var(--border);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                .post-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .author-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .avatar {
                    width: 48px;
                    height: 48px;
                    background: var(--primary);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 1.2rem;
                }
                .meta {
                    display: flex;
                    flex-direction: column;
                }
                .name {
                    font-weight: 700;
                    color: var(--text-main);
                }
                .date {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .privacy-badge {
                    background: var(--bg-main);
                    padding: 0.4rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    border: 1px solid var(--border);
                }
                .post-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin-bottom: 2rem;
                    color: var(--text-main);
                }
                .post-image {
                    margin-bottom: 2rem;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }
                .post-image img {
                    width: 100%;
                    display: block;
                }
                .post-content {
                    font-size: 1.2rem;
                    line-height: 1.7;
                    color: var(--text-main);
                    margin-bottom: 3rem;
                }
                .post-actions {
                    padding-top: 2rem;
                    border-top: 1px solid var(--border);
                    display: flex;
                    justify-content: flex-end;
                }
                .edit-btn {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .edit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(var(--primary-rgb), 0.3);
                }
                .error, .loading, .not-found {
                    text-align: center;
                    padding: 5rem;
                    font-size: 1.5rem;
                }
            `}</style>
        </div>
    );
}
