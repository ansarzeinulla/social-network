import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/router';
import PostCard from '../components/PostCard';
import { fetchApi } from '../services/api';

export default function Home() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [contentFilter, setContentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts(currentPage);
  }, [currentPage]);

  const fetchPosts = async (page, filters = {}) => {
    setLoading(true);
    try {
      const t = filters.content !== undefined ? filters.content : contentFilter;
      const sd = filters.startDate !== undefined ? filters.startDate : startDate;
      const ed = filters.endDate !== undefined ? filters.endDate : endDate;
      const p = filters.privacy !== undefined ? filters.privacy : privacy;

      let queryParams = new URLSearchParams({
        page: page.toString(),
      });

      if (t) queryParams.append('content', t);
      if (sd) queryParams.append('startDate', sd);
      if (ed) queryParams.append('endDate', ed);
      if (p) queryParams.append('privacy', p);

      const response = await fetchApi(`/posts?${queryParams.toString()}`);
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        const total = data.page_count;
        setTotalPages(total || 1);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    if (contentFilter.length > 100) {
      return;
    }
    setCurrentPage(1);
    fetchPosts(1);
  };

  const handleResetFilters = () => {
    setContentFilter('');
    setStartDate('');
    setEndDate('');
    setPrivacy('');
    setCurrentPage(1);
    fetchPosts(1, { content: '', startDate: '', endDate: '', privacy: '' });
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
          <div className="filter-group">
            <label>Content {contentFilter.length > 0 && <span className="char-count">({contentFilter.length}/100)</span>}</label>
            <input
              type="text"
              placeholder="Filter by post content..."
              value={contentFilter}
              maxLength={100}
              onChange={(e) => setContentFilter(e.target.value)}
            />
          </div>
          <div className="filter-group text-center">
            <label>Date Range</label>
            <div className="date-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="separator">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="filter-group">
            <label>Privacy</label>
            <div className="privacy-filters">
              <button 
                className={privacy === 'public' ? 'active' : ''} 
                onClick={() => setPrivacy(privacy === 'public' ? '' : 'public')}>Public</button>
              <button 
                className={privacy === 'almost_private' ? 'active' : ''} 
                onClick={() => setPrivacy(privacy === 'almost_private' ? '' : 'almost_private')}>Almost Private</button>
              <button 
                className={privacy === 'private' ? 'active' : ''} 
                onClick={() => setPrivacy(privacy === 'private' ? '' : 'private')}>Private</button>
            </div>
          </div>
          <div className="filter-actions">
            <button className="apply-btn" onClick={handleApplyFilters}>Apply</button>
            <button className="reset-btn" onClick={handleResetFilters}>Reset</button>
            <button className="new-post-btn" onClick={() => router.push('/newpost')}>+ New Post</button>
          </div>
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
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 2rem;
          background: var(--card-bg);
          padding: 1.5rem;
          border-radius: 16px;
          margin-bottom: 2.5rem;
          border: 1px solid var(--border);
          align-items: flex-end;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .filter-group label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          justify-content: space-between;
        }
        .char-count {
          font-size: 0.7rem;
          font-weight: 400;
          color: var(--text-muted);
        }
        .filter-bar input {
          background: var(--bg-main, #f8f9fa);
          border: 1px solid var(--border);
          padding: 0.6rem 1rem;
          border-radius: 10px;
          color: var(--text-main);
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .filter-bar input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
        }
        .date-inputs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .separator {
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 600;
        }
        .privacy-filters {
          display: flex;
          gap: 0.5rem;
          background: var(--bg-hover);
          padding: 0.3rem;
          border-radius: 12px;
        }
        .privacy-filters button {
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .privacy-filters button.active {
          background: var(--primary);
          color: white;
        }
        .filter-actions {
          display: flex;
          gap: 0.75rem;
        }
        .apply-btn {
          background: var(--primary);
          color: white;
          padding: 0.6rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .apply-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .new-post-btn {
          background: #4a90e2;
          color: white;
          padding: 0.6rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          white-space: nowrap;
        }
        .new-post-btn:hover {
          background: #357abd;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
        }
        .reset-btn {
          background: transparent;
          color: var(--text-muted);
          padding: 0.6rem 1rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--border);
          transition: all 0.2s;
        }
        .reset-btn:hover {
          background: var(--bg-hover);
          color: var(--text-main);
        }
        @media (max-width: 768px) {
          .filter-bar {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .date-inputs {
            flex-direction: column;
            align-items: stretch;
          }
          .separator {
            text-align: center;
          }
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
