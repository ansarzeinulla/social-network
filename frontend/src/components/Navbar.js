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
    { href: "/profile", icon: "person", title: "Мой профиль" },
    { href: "/groups", icon: "groups", title: "Поиск групп" },
    { href: "/mygroups", icon: "diversity_3", title: "Мои группы" },
    { href: "/chats", icon: "chat_bubble", title: "Чаты" },
    { href: "/notifications", icon: "notifications", title: "Уведомления" },
];

// Subset shown inline as icon tabs at desktop widths. The drawer always
// shows the full NAV list so mobile users don't lose access to /profile
// or /mygroups (which are normally reached via the side rail).
const TOP_TABS = ["/", "/groups", "/chats", "/notifications"];

export default function Navbar() {
    const router = useRouter();
    const { user } = useUser();
    const [unread, setUnread] = useState(0);
    const [chatUnread, setChatUnread] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);

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

    // Close the drawer on any route change so it doesn't stay open after
    // a link click (the link triggers navigation but doesn't unmount Navbar).
    useEffect(() => {
        const close = () => setMenuOpen(false);
        router.events.on("routeChangeStart", close);
        return () => router.events.off("routeChangeStart", close);
    }, [router.events]);

    // Lock body scroll while the drawer is open.
    useEffect(() => {
        if (typeof document === "undefined") return;
        const prev = document.body.style.overflow;
        if (menuOpen) document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [menuOpen]);

    const tabs = NAV.filter((n) => TOP_TABS.includes(n.href));
    const totalBadge = unread + chatUnread;

    return (
        <header className="topnav">
            <div className="topnav-inner">
                <div className="topnav-left">
                    <button
                        type="button"
                        className="icon-btn topnav-icon-btn menu-toggle"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label="Меню"
                        aria-expanded={menuOpen}
                    >
                        <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
                        {!menuOpen && totalBadge > 0 && (
                            <span className="notif-badge menu-badge">{totalBadge > 99 ? "99+" : totalBadge}</span>
                        )}
                    </button>
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
                    {tabs.map((item) => {
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
                    <Link href="/profile" className="profile-btn profile-btn-desktop" title="Мой профиль">
                        <Avatar url={user?.avatar} name={user?.first_name} size={36} />
                    </Link>
                    <button onClick={handleLogout} className="icon-btn topnav-icon-btn logout-desktop" title="Выход">
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </div>

            {menuOpen && (
                <>
                    <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div className="drawer" role="dialog" aria-label="Меню">
                        {user && (
                            <Link href="/profile" className="drawer-me" onClick={() => setMenuOpen(false)}>
                                <Avatar url={user.avatar} name={user.first_name} size={44} />
                                <div className="drawer-me-info">
                                    <div className="drawer-me-name">{user.first_name} {user.last_name}</div>
                                    <div className="drawer-me-handle">@{user.nickname || user.email}</div>
                                </div>
                            </Link>
                        )}
                        <div className="drawer-search">
                            <span className="material-symbols-outlined">search</span>
                            <input
                                placeholder="Поиск в Connect"
                                onKeyDown={(e) => {
                                    if (e.key !== "Enter") return;
                                    e.preventDefault();
                                    const q = e.target.value.trim();
                                    if (!q) return;
                                    setMenuOpen(false);
                                    router.push({ pathname: "/search", query: { q } });
                                }}
                            />
                        </div>
                        <nav className="drawer-nav">
                            {NAV.map((item) => {
                                const active = router.pathname === item.href ||
                                    (item.href !== "/" && router.pathname.startsWith(item.href));
                                const badge = item.href === "/notifications" ? unread
                                    : item.href === "/chats" ? chatUnread : 0;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`drawer-link ${active ? "active" : ""}`}
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <span className={`material-symbols-outlined${active ? " icon-fill" : ""}`}>{item.icon}</span>
                                        <span className="drawer-link-label">{item.title}</span>
                                        {badge > 0 && (
                                            <span className="notif-badge drawer-link-badge">{badge > 99 ? "99+" : badge}</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                        <button
                            type="button"
                            className="drawer-link drawer-logout"
                            onClick={() => { setMenuOpen(false); handleLogout(); }}
                        >
                            <span className="material-symbols-outlined">logout</span>
                            <span className="drawer-link-label">Выход</span>
                        </button>
                    </div>
                </>
            )}

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
                /* Chained with .topnav-inner for specificity bump so that
                   globals.css .topnav .topnav-icon-btn does not override
                   display:none here. */
                .topnav-inner .menu-toggle {
                    display: none;
                    position: relative;
                }
                .menu-badge {
                    top: 2px;
                    right: 2px;
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

                /* ---------- Drawer (mobile menu) ---------- */
                .drawer-backdrop {
                    position: fixed;
                    inset: 56px 0 0 0;
                    background: rgba(0, 0, 0, 0.35);
                    z-index: 90;
                    animation: fadeBackdrop 0.18s ease-out;
                }
                @keyframes fadeBackdrop {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .drawer {
                    position: fixed;
                    top: 56px;
                    left: 0;
                    bottom: 0;
                    width: 280px;
                    max-width: 86vw;
                    background: var(--card-bg);
                    box-shadow: var(--shadow-lg);
                    z-index: 95;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding: 12px 8px;
                    overflow-y: auto;
                    animation: slideIn 0.18s ease-out;
                }
                @keyframes slideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .drawer-me {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px 14px;
                    border-bottom: 1px solid var(--border-soft);
                    margin-bottom: 8px;
                    color: var(--text-main);
                }
                .drawer-me:hover { color: var(--text-main); }
                .drawer-me-info { min-width: 0; flex: 1; }
                .drawer-me-name {
                    font-weight: 700;
                    font-size: 15px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .drawer-me-handle {
                    font-family: var(--font-mono);
                    font-size: 12px;
                    color: var(--text-secondary);
                    margin-top: 2px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .drawer-search {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--bg);
                    border-radius: var(--radius-pill);
                    padding: 8px 14px;
                    margin: 0 4px 12px;
                }
                .drawer-search :global(.material-symbols-outlined) {
                    color: var(--text-secondary);
                    font-size: 20px;
                }
                .drawer-search input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    font-family: inherit;
                    font-size: 14px;
                    color: var(--text-main);
                    min-width: 0;
                }
                .drawer-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .drawer-link {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 12px 14px;
                    border-radius: var(--radius);
                    font-weight: 600;
                    font-size: 15px;
                    color: var(--text-main);
                    background: transparent;
                    border: none;
                    text-align: left;
                    cursor: pointer;
                    font-family: inherit;
                    transition: background 0.15s, color 0.15s;
                }
                .drawer-link:hover { background: var(--bg-hover); color: var(--text-main); }
                .drawer-link.active {
                    background: var(--primary-tint);
                    color: var(--primary);
                }
                .drawer-link :global(.material-symbols-outlined) {
                    color: var(--primary);
                    font-size: 24px;
                }
                .drawer-link-label { flex: 1; }
                .drawer-link-badge {
                    position: static;
                    box-shadow: none;
                }
                .drawer-logout {
                    margin-top: auto;
                    border-top: 1px solid var(--border-soft);
                    border-radius: 0;
                    padding-top: 16px;
                }
                .drawer-logout :global(.material-symbols-outlined) {
                    color: var(--error);
                }

                @media (max-width: 1099px) {
                    .nav-tab { width: 60px; }
                    .topnav-left :global(.nav-search) { display: none; }
                }
                @media (max-width: 768px) {
                    .nav-tab { width: 52px; }
                    .nav-tab :global(.material-symbols-outlined) { font-size: 22px; }
                    .notif-badge { right: 6px; }
                    .topnav-inner { padding: 0 0.5rem; }
                }
                /* Critical width: brand + 4 icon tabs + avatar + logout no
                   longer fit without overlap. Below this, collapse the inline
                   nav into a hamburger drawer. Above this, keep the inline
                   tabs so desktop / tablet users don't lose them. */
                @media (max-width: 540px) {
                    .topnav-inner .menu-toggle { display: grid; }
                    .topnav-center { display: none; }
                    .profile-btn-desktop { display: none; }
                    .logout-desktop { display: none; }
                    .topnav-inner {
                        grid-template-columns: auto 1fr;
                        padding: 0 0.5rem;
                    }
                    .topnav-right { display: none; }
                    .brand { font-size: 1.25rem; }
                }
            `}</style>
        </header>
    );
}
