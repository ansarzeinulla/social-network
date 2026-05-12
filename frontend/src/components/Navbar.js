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
    const [chatUnread, setChatUnread] = useState(0);

    useEffect(() => {
        if (!user) {
            setUnread(0);
            return;
        }
        const refreshCount = () => {
            notifications.list()
                .then((items) => setUnread((items || []).filter((n) => !n.is_read && !n.read).length))
                .catch(() => setUnread(0));
        };
        refreshCount();
        window.addEventListener("notif:changed", refreshCount);
        window.addEventListener("ws:open", refreshCount);
        return () => {
            window.removeEventListener("notif:changed", refreshCount);
            window.removeEventListener("ws:open", refreshCount);
        };
    }, [user]);

    // Reset chat badge when the user navigates anywhere chat-related — the
    // list at /chats, a private thread at /chats/X, or a group chat at
    // /groups/X/chat. They're "looking at chats", we don't need to nag them.
    const onChatRoute = (path) => path.startsWith("/chats") || /^\/groups\/[^/]+\/chat$/.test(path);
    useEffect(() => {
        if (onChatRoute(router.pathname)) setChatUnread(0);
    }, [router.pathname]);

    useWebSocket((ev) => {
        if (ev.type === "notification.new") {
            setUnread((n) => n + 1);
            return;
        }
        if (ev.type === "chat.new" || ev.type === "group_chat.new") {
            // Backend echoes chat.new back to sender's other tabs — skip echo.
            const fromMe = user && ev.payload && ev.payload.from === user.id;
            if (fromMe) return;
            // Skip badging if the user is currently viewing the exact chat
            // this message belongs to (live render handles it).
            const path = router.asPath || router.pathname;
            const inThisPrivate = ev.type === "chat.new"
                && ev.payload && path === `/chats/${ev.payload.from}`;
            const inThisGroup = ev.type === "group_chat.new"
                && ev.payload && path === `/groups/${ev.payload.group_id}/chat`;
            if (inThisPrivate || inThisGroup) return;
            setChatUnread((n) => n + 1);
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
                <div className="topnav-left">
                    <Link href="/" className="brand brand-wordmark">Connect</Link>
                    <div className="nav-search">
                        <span className="material-symbols-outlined nav-search-icon">search</span>
                        <input
                            className="nav-search-input"
                            placeholder="Поиск в Connect"
                            onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                const q = e.target.value.trim();
                                if (!q) return;
                                router.push({ pathname: "/search", query: { q } });
                                e.target.value = "";
                                e.target.blur();
                            }}
                        />
                    </div>
                </div>

                <nav className="topnav-center topnav-tabs">
                    {NAV.map((item) => {
                        const active = router.pathname === item.href ||
                            (item.href !== "/" && router.pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-tab topnav-tab ${active ? "active is-active" : ""}`}
                                title={item.title}
                            >
                                <span className={`material-symbols-outlined${active ? " icon-fill" : ""}`}>{item.icon}</span>
                                {item.href === "/notifications" && unread > 0 && (
                                    <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>
                                )}
                                {item.href === "/chats" && chatUnread > 0 && (
                                    <span className="notif-badge">{chatUnread > 99 ? "99+" : chatUnread}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="topnav-right">
                    <Link href="/profile" className="profile-btn" title="Мой профиль">
                        <Avatar url={user?.avatar} name={user?.first_name} size={36} />
                    </Link>
                    <button onClick={handleLogout} className="icon-btn topnav-icon-btn" title="Выход">
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
                .topnav-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    justify-self: start;
                    min-width: 0;
                }
                .brand {
                    color: var(--primary);
                    font-size: 1.75rem;
                    font-weight: 800;
                    letter-spacing: -0.04em;
                    flex-shrink: 0;
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
                    .topnav-left :global(.nav-search) { display: none; }
                }
                @media (max-width: 768px) {
                    .nav-tab { width: 48px; }
                    .nav-tab :global(.material-symbols-outlined) { font-size: 22px; }
                    .notif-badge { right: 6px; }
                    .topnav-inner { padding: 0 0.5rem; }
                    .topnav-left { gap: 8px; }
                }
                @media (max-width: 540px) {
                    .brand { font-size: 1.25rem; }
                    .nav-tab { width: 44px; }
                    .nav-tab :global(.material-symbols-outlined) { font-size: 20px; }
                    .topnav-right :global(.icon-btn),
                    .topnav-right :global(.profile-btn) { width: 36px; height: 36px; }
                }
            `}</style>
        </header>
    );
}
