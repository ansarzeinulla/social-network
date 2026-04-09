import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import { fetchApi } from '../services/api';

export default function Home() {
    const [posts, setPosts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const postsPerPage = 30;

    useEffect(() => {
        fetchPosts(currentPage);
    }, [currentPage, filter]);

    const fetchPosts = async (page) => {
        setLoading(true);
        try {
            // Formula: range [(k-1)*30+1; (k*30)]
            // We send page to backend, backend handles the range.
            const response = await fetchApi(`/posts?page=${page}&limit=${postsPerPage}&filter=${filter}`);
            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts || []);
                // Calculate total pages if backend provides totalCount
                const total = Math.ceil((data.totalCount || 0) / postsPerPage);
                setTotalPages(total || 1);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPaginationTiles = () => {
        const k = currentPage;
        const last = totalPages;
        const tiles = new Set();

        tiles.add(1);
        if (k - 2 > 1) tiles.add(k - 2);
        if (k - 1 > 1) tiles.add(k - 1);
        tiles.add(k);
        if (k + 1 < last) tiles.add(k + 1);
        if (k + 2 < last) tiles.add(k + 2);
        if (last > 1) tiles.add(last);

        return Array.from(tiles).sort((a, b) => a - b);
    };

    const paginationTiles = getPaginationTiles();

    return (
        <div className="layout">
            <Navbar />

            <main className="container">
                {/* Filter Bar */}
                <div className="filter-bar fade-in">
                </div>

                {/* Post List */}
                <div className="posts-container">
                    {loading ? (
                        <div className="loading">Loading posts...</div>
                    ) : posts.length > 0 ? (
                        posts.map(post => (
                            <PostCard key={post.id} post={post} />
                        ))
                    ) : (
                        <div className="no-posts">No posts found.</div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination fade-in">
                        {paginationTiles.map((page, index) => (
                            <React.Fragment key={page}>
                                {index > 0 && paginationTiles[index] > paginationTiles[index - 1] + 1 && (
                                    <span className="ellipsis">...</span>
                                )}
                                <button
                                    className={currentPage === page ? 'active' : ''}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </main>

            <style jsx>{`
        .layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        main {
          flex: 1;
          padding-top: 2rem;
          padding-bottom: 4rem;
        }
        .filter-bar {
          display: flex;
          gap: 1rem;
          background: var(--card-bg);
          padding: 0.75rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          border: 1px solid var(--border);
        }
        .filter-bar button {
          background: transparent;
          color: var(--text-muted);
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .filter-bar button:hover, .filter-bar button.active {
          color: var(--text-main);
          background: var(--primary);
        }
        .posts-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .loading, .no-posts {
          text-align: center;
          padding: 4rem;
          color: var(--text-muted);
          font-size: 1.1rem;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin-top: 3rem;
        }
        .pagination button {
          background: var(--card-bg);
          color: var(--text-main);
          border: 1px solid var(--border);
          width: 40px;
          height: 40px;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .pagination button:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .pagination button.active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }
        .ellipsis {
          color: var(--text-muted);
          padding: 0 0.5rem;
        }
      `}</style>
        </div>
    );
}
