import Link from "next/link";
import { useRouter } from "next/router";
import { fetchApi } from "../services/api";

const NAV_ITEMS = [
    { label: "Лента", href: "/" },
    { label: "Чаты", href: "/chats" },
    { label: "Поиск групп", href: "/groups" },
    { label: "Мои группы", href: "/mygroups" },
    { label: "Профиль", href: "/profile" },
    { label: "Уведомления", href: "/notifications" },
];

export default function Navbar() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await fetchApi("/logout", { method: "POST" });
        } catch (error) {
            console.error("Logout failed:", error);
        }
        router.push("/login");
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link href="/" className="navbar-logo">
                    SocialNet
                </Link>

                <div className="navbar-links">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={router.pathname === item.href ? "active" : ""}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                <button onClick={handleLogout} className="logout-btn">
                    Выход
                </button>
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
                    gap: 1.5rem;
                }
                .navbar-logo {
                    font-size: 1.4rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, var(--primary), var(--accent));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    flex-shrink: 0;
                }
                .navbar-links {
                    display: flex;
                    gap: 1.25rem;
                    align-items: center;
                    flex: 1;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .navbar-links :global(a) {
                    color: var(--text-muted);
                    font-weight: 500;
                    font-size: 0.92rem;
                    transition: color 0.15s;
                }
                .navbar-links :global(a:hover),
                .navbar-links :global(a.active) {
                    color: var(--text-main);
                }
                .navbar-links :global(a.active) {
                    color: var(--primary);
                }
                .logout-btn {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--error);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-weight: 600;
                    transition: all 0.15s;
                    flex-shrink: 0;
                }
                .logout-btn:hover {
                    background: var(--error);
                    color: white;
                }
                @media (max-width: 768px) {
                    .navbar-container {
                        flex-wrap: wrap;
                        height: auto;
                        padding: 0.75rem 1rem;
                    }
                    .navbar-links {
                        order: 3;
                        width: 100%;
                        justify-content: flex-start;
                    }
                }
            `}</style>
        </nav>
    );
}
