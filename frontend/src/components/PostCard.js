export default function PostCard({ post }) {
  return (
    <div className="post-card fade-in">
      <div className="post-header">
        <div className="user-info">
          <span className="user-name">{post.first_name} {post.last_name}</span>
          <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
          <h3 className="post-title">{post.title}</h3>
        </div>
      </div>




      <style jsx>{`
        .post-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .post-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
          color: white;
        }
        .user-details {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: 600;
          font-size: 0.95rem;
        }
        .post-date {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .post-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: var(--text-main);
        }
        .post-content {
          color: var(--text-muted);
          font-size: 0.95rem;
          margin-bottom: 1rem;
          white-space: pre-wrap;
        }
        .post-image {
          width: 100%;
          border-radius: 12px;
          margin-top: 0.5rem;
          object-fit: cover;
          max-height: 400px;
        }
      `}</style>
    </div>
  );
}
