import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import PostCard from "../components/PostCard";
import { fetchApi } from "../services/api";
import { useUser } from "../hooks/useUser";

export default function Home() {
    const router = useRouter();
    const { user } = useUser();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const response = await fetchApi("/posts?page=1");
            if (response.status === 401) {
                router.push("/login");
                return;
            }
            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts || []);
            }
        } catch (e) {
            console.error("Failed to fetch posts:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPosts(); }, []);

    return (
        <Layout>
            <button className="card create-post" onClick={() => router.push("/newpost")}>
                <div className="avatar">
                    {(user?.first_name || "?").slice(0, 1).toUpperCase()}
                </div>
                <span className="placeholder">
                    Что у вас нового{user?.first_name ? `, ${user.first_name}` : ""}?
                </span>
                <span className="material-symbols-outlined photo-icon">photo_library</span>
            </button>

            {loading ? (
                <div className="empty-state">Загружаем ленту…</div>
            ) : posts.length === 0 ? (
                <div className="empty-state">Постов пока нет. Будьте первым!</div>
            ) : (
                posts.map((post) => <PostCard key={post.id} post={post} />)
            )}

            <style jsx>{`
                .create-post {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 12px 16px;
                    background: var(--card-bg);
                    border: none;
                    cursor: pointer;
                    text-align: left;
                    transition: box-shadow 0.15s;
                }
                .create-post:hover { box-shadow: var(--shadow); }
                .placeholder {
                    flex: 1;
                    background: var(--bg);
                    color: var(--text-secondary);
                    padding: 10px 16px;
                    border-radius: 999px;
                    font-size: 15px;
                }
                .photo-icon {
                    color: var(--accent);
                }
            `}</style>
        </Layout>
    );
}
