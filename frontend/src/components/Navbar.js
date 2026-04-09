import Link from 'next/link';
import { useRouter } from 'next/router';
import { fetchApi } from '../services/api';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetchApi('/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navItems = [
    { label: 'Main', href: '/' },
    { label: 'Chats', href: '/chats' },
    { label: 'SearchGroups', href: '/groups' },
    { label: 'MyGroups', href: '/mygroups' },
    { label: 'Profile', href: '/profile' },
    { label: 'Notifications', href: '/notifications' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-links">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={router.pathname === item.href ? 'active' : ''}>
            {item.label}
          </Link>
        ))}
        <button onClick={handleLogout} className="logout-btn">LogOut</button>
      </div>





      <style jsx>{`
        .navbar {
          background: var(--glass);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 1000;
          height: 64px;
          display: flex;
          align-items: center;
        }
        .navbar-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 0 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .navbar-logo a {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .navbar-links {
          display: flex;
          gap: 1.5rem;
          align-items: center;
        }
        .navbar-links :global(a) {
          color: var(--text-muted);
          font-weight: 500;
          transition: all 0.2s;
          font-size: 0.95rem;
        }
        .navbar-links :global(a:hover), .navbar-links :global(a.active) {
          color: var(--text-main);
        }
        .logout-btn {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: var(--error);
          color: white;
        }
      `}</style>
    </nav>
  );
}
