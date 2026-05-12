import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { fetchApi } from "../services/api";
import { useUser, clearUserCache } from "../hooks/useUser";
import { useWebSocket } from "../hooks/useWebSocket";
import { notifications } from "../services/notifications";

const NAV = [
    { href: "/", icon: "home", title: "Лента" },
    { href: "/groups", icon: "groups", title: "Группы" },
    { href: "/chats", icon: "chat_bubble", title: "Чаты" },
    { href: "/notifications", icon: "notifications", title: "Уведомления" },
];

export default function Navbar() {
    const router = useRouter();
    const { user } = useUser();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!user) {
            setUnread(0);
            return;
        }
        const refreshUnread = () => {
            notifications.list()
                .then((items) => setUnread((items || []).filter((n) => !n.is_read && !n.read).length))
                .catch(() => setUnread(0));
        };
        refreshUnread();
        window.addEventListener("notifications:changed", refreshUnread);
        return () => window.removeEventListener("notifications:changed", refreshUnread);
    }, [user]);

    useWebSocket((ev) => {
        if (ev.type === "notification.new") {
            setUnread((n) => n + 1);
        }
    }, { enabled: !!user });

    const handleLogout = async () => {
        try { await fetchApi("/logout", { method: "POST" }); } catch (_) {}
        clearUserCache();
        router.push("/login");
    };

    return (
        <header className="topnav">
            <div className="topnav-inner">
                <Link href="/" className="brand">Connect</Link>

                <nav className="topnav-center">
                    {NAV.map((item) => {
                        const active = router.pathname === item.href ||
                            (item.href !== "/" && router.pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-tab ${active ? "active" : ""}`}
                                title={item.title}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {item.href === "/notifications" && unread > 0 && (
                                    <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="topnav-right">
                    <Link href="/profile" className="profile-btn" title="Мой профиль">
                        <Avatar url={user?.avatar} name={user?.first_name} size={36} />
                    </Link>
                    <button onClick={handleLogout} className="icon-btn" title="Выход">
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </div>

            <style jsx>{`
                .topnav {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 56px;
                    background: var(--card-bg);
                    border-bottom: 1px solid var(--border);
                    z-index: 100;
                    box-shadow: var(--shadow-sm);
                }
                .topnav-inner {
                    max-width: 1320px;
                    margin: 0 auto;
                    height: 100%;
                    display: grid;
                    grid-template-columns: 1fr auto 1fr;
                    align-items: center;
                    padding: 0 1rem;
                }
                .brand {
                    color: var(--primary);
                    font-size: 1.75rem;
                    font-weight: 800;
                    letter-spacing: -0.04em;
                    justify-self: start;
                }
                .topnav-center {
                    display: flex;
                    gap: 0.25rem;
                    justify-self: center;
                }
                .nav-tab {
                    position: relative;
                    display: grid;
                    place-items: center;
                    width: 80px;
                    height: 56px;
                    color: var(--text-secondary);
                    border-bottom: 3px solid transparent;
                    transition: background 0.15s, color 0.15s;
                }
                .nav-tab:hover { background: var(--bg); color: var(--text-main); }
                .nav-tab.active {
                    color: var(--primary);
                    border-bottom-color: var(--primary);
                }
                .nav-tab :global(.material-symbols-outlined) { font-size: 26px; }
                .notif-badge {
                    position: absolute;
                    top: 8px;
                    right: 18px;
                    min-width: 18px;
                    height: 18px;
                    padding: 0 5px;
                    border-radius: 999px;
                    background: var(--error);
                    color: #fff;
                    font-size: 11px;
                    font-weight: 800;
                    line-height: 18px;
                    text-align: center;
                    box-shadow: 0 0 0 2px var(--card-bg);
                }
                .topnav-right {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    justify-self: end;
                }
                .icon-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: var(--bg);
                    display: grid;
                    place-items: center;
                    color: var(--text-main);
                    transition: background 0.15s;
                }
                .icon-btn:hover { background: var(--bg-hover); }
                .profile-btn {
                    display: grid;
                    place-items: center;
                    border-radius: 50%;
                    transition: box-shadow 0.15s;
                }
                .profile-btn:hover { box-shadow: 0 0 0 2px var(--primary); }
                @media (max-width: 1099px) {
                    .nav-tab { width: 60px; }
                }
                @media (max-width: 768px) {
                    .nav-tab { width: 48px; }
                    .nav-tab :global(.material-symbols-outlined) { font-size: 22px; }
                    .notif-badge { right: 6px; }
                }
            `}</style>
        </header>
    );
}
