import { useRouter } from 'next/router';
import { assetURL } from '../services/api';

export default function PostCard({ post }) {
  const router = useRouter();

  return (
    <div className="post-card fade-in" onClick={() => router.push(`/post/${post.id}`)}>
      <div className="post-header">
        <div className="user-info">
          <div className="user-avatar">{post.first_name[0]}{post.last_name[0]}</div>
          <div className="user-details">
            <span className="user-name">{post.first_name} {post.last_name}</span>
            <span className="post-date">{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="privacy-indicator">{post.privacy.replace('_', ' ')}</div>
      </div>

      <div className="post-body">
        <p className="post-content">{post.content}</p>
        {post.image_url && <img src={assetURL(post.image_url)} alt="" className="post-image" />}
      </div>

      <style jsx>{`
        .post-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          transition: all 0.2s;
          cursor: pointer;
        }
        .post-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: var(--primary);
        }
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
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
          font-weight: 800;
          font-size: 0.9rem;
          color: white;
        }
        .user-details {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-main);
        }
        .post-date {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .privacy-indicator {
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--text-muted);
          background: var(--bg-hover);
          padding: 0.25rem 0.6rem;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .post-content {
          font-size: 1rem;
          line-height: 1.5;
          color: var(--text-main);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .post-image {
          margin-top: 1rem;
          width: 100%;
          max-height: 400px;
          object-fit: cover;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
