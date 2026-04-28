import Link from "next/link";
import { useRouter } from "next/router";
import Navbar from "./Navbar";
import { useUser } from "../hooks/useUser";

const SIDE = [
    { href: "/", icon: "home", label: "Лента" },
    { href: "/profile", icon: "person", label: "Мой профиль" },
    { href: "/groups", icon: "groups", label: "Поиск групп" },
    { href: "/mygroups", icon: "diversity_3", label: "Мои группы" },
    { href: "/chats", icon: "chat", label: "Чаты" },
    { href: "/notifications", icon: "notifications", label: "Уведомления" },
];

export default function Layout({ children, title, action, mock, right }) {
    const router = useRouter();
    const { user } = useUser();

    return (
        <div className="page-shell">
            <Navbar />
            <div className={`page-grid ${right ? "with-right" : ""}`}>
                <aside className="side">
                    {user && (
                        <Link href="/profile" className="me-card">
                            <div className="avatar">
                                {(user.first_name || "?").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="me-info">
                                <div className="me-name">{user.first_name} {user.last_name}</div>
                                <div className="me-handle">@{user.nickname || user.email}</div>
                            </div>
                        </Link>
                    )}
                    {SIDE.map((item) => {
                        const active = router.pathname === item.href ||
                            (item.href !== "/" && router.pathname.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href} className={`side-link ${active ? "active" : ""}`}>
                                <span className="material-symbols-outlined">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </aside>

                <main className="page-content fade-in">
                    {title && (
                        <div className="page-title">
                            <span>{title}</span>
                            {action}
                        </div>
                    )}
                    {mock && <div className="mock-banner">⚡ Demo mode (mock data) — backend not yet implemented</div>}
                    {children}
                </main>

                {right && <aside className="side-right">{right}</aside>}
            </div>

            <style jsx>{`
                .side {
                    display: none;
                    flex-direction: column;
                    gap: clamp(4px, 0.6vh, 8px);
                    padding: clamp(12px, 1.6vh, 20px) 8px;
                    position: sticky;
                    top: 56px;
                    height: calc(100vh - 56px);
                    overflow-y: auto;
                }
                .side-right {
                    display: none;
                    flex-direction: column;
                    gap: 12px;
                    padding: 16px;
                    position: sticky;
                    top: 56px;
                    height: calc(100vh - 56px);
                    overflow-y: auto;
                }
                @media (min-width: 1100px) {
                    .side { display: flex; }
                    .side-right { display: flex; }
                }
                .me-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: clamp(8px, 1.2vh, 12px);
                    border-radius: var(--radius);
                    color: var(--text-main);
                    transition: background 0.15s;
                    margin-bottom: clamp(6px, 1vh, 12px);
                }
                .me-card:hover { background: var(--bg-hover); color: var(--text-main); }
                .me-info { min-width: 0; flex: 1; }
                .me-name {
                    font-weight: 700;
                    font-size: 14px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .me-handle {
                    font-size: 12px;
                    color: var(--text-secondary);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .side-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: clamp(10px, 1.4vh, 14px) 12px;
                    border-radius: var(--radius);
                    font-weight: 600;
                    font-size: 14px;
                    color: var(--text-main);
                    transition: background 0.15s;
                }
                .side-link:hover { background: var(--bg-hover); color: var(--text-main); }
                .side-link.active {
                    background: rgba(var(--primary-rgb), 0.12);
                    color: var(--primary);
                }
                .side-link :global(.material-symbols-outlined) {
                    color: var(--primary);
                    font-size: 22px;
                }
            `}</style>
        </div>
    );
}
