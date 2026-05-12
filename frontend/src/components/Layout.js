import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Avatar from "./Avatar";
import { useUser } from "../hooks/useUser";
import { followers as followersApi } from "../services/followers";
import { groups as groupsApi } from "../services/groups";

const SIDE = [
    { href: "/", icon: "home", label: "Лента" },
    { href: "/profile", icon: "person", label: "Мой профиль" },
    { href: "/groups", icon: "groups", label: "Поиск групп" },
    { href: "/mygroups", icon: "diversity_3", label: "Мои группы" },
    { href: "/chats", icon: "chat", label: "Чаты" },
    { href: "/notifications", icon: "notifications", label: "Уведомления" },
];

function RightRail() {
    const { user } = useUser();
    const [contacts, setContacts] = useState([]);
    const [myGroups, setMyGroups] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (user?.id) {
                try {
                    const list = await followersApi.listFollowing(user.id);
                    if (!cancelled) setContacts(list || []);
                } catch (_) {}
            }
            try {
                const list = await groupsApi.list();
                if (!cancelled) setMyGroups((list || []).filter((g) => g.joined));
            } catch (_) {}
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    return (
        <aside className="right-rail">
            <section className="rail-section">
                <h3 className="rail-title">Контакты</h3>
                <div className="rail-list">
                    {contacts.length === 0 ? (
                        <div className="rail-empty">Никого не отслеживаете</div>
                    ) : (
                        contacts.slice(0, 8).map((c) => {
                            const name = c.first_name
                                ? `${c.first_name} ${c.last_name || ""}`.trim()
                                : (c.nickname || "user");
                            return (
                                <Link key={c.id} href={`/profile/${c.id}`} className="rail-contact">
                                    <Avatar url={c.avatar} name={c.first_name || name} size={32} />
                                    <span>{name}</span>
                                </Link>
                            );
                        })
                    )}
                </div>
            </section>
            <section className="rail-section">
                <h3 className="rail-title">Мои группы</h3>
                <div className="rail-list">
                    {myGroups.length === 0 ? (
                        <div className="rail-empty">Нет групп</div>
                    ) : (
                        myGroups.slice(0, 5).map((g) => (
                            <Link key={g.id} href={`/groups/${g.id}`} className="rail-group">
                                <span className="material-symbols-outlined">groups</span>
                                <span>{g.title}</span>
                            </Link>
                        ))
                    )}
                </div>
            </section>
        </aside>
    );
}

// Pages that should NOT show the right rail (chat thread, post detail, new
// post form — narrow workflows where the rail would just add noise).
const HIDE_RAIL_ON = ["/chats/[id]", "/post/[id]", "/post/edit/[id]", "/newpost", "/groups/[id]/chat"];

export default function Layout({ children, title, action, mock, right }) {
    const router = useRouter();
    const { user } = useUser();
    const showRail = !right && user && !HIDE_RAIL_ON.includes(router.pathname);
    const rightContent = right || (showRail ? <RightRail /> : null);

    return (
        <div className="page-shell">
            <Navbar />
            <div className={`page-grid ${rightContent ? "with-right" : ""}`}>
                <aside className="side">
                    {user && (
                        <Link href="/profile" className="me-card sidebar-me">
                            <Avatar url={user.avatar} name={user.first_name} size={44} className="sidebar-me-avatar" />
                            <div className="me-info">
                                <div className="me-name sidebar-me-name">{user.first_name} {user.last_name}</div>
                                <div className="me-handle sidebar-me-handle">@{user.nickname || user.email}</div>
                            </div>
                        </Link>
                    )}
                    {SIDE.map((item) => {
                        const active = router.pathname === item.href ||
                            (item.href !== "/" && router.pathname.startsWith(item.href));
                        return (
                            <Link key={item.href} href={item.href} className={`side-link sidebar-link ${active ? "active is-active" : ""}`}>
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
                    {mock && <div className="mock-banner"><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>bolt</span>Demo mode (mock data) — backend not yet implemented</div>}
                    {children}
                </main>

                {rightContent && <aside className="side-right">{rightContent}</aside>}
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
