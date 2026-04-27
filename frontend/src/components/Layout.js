import Navbar from "./Navbar";

export default function Layout({ children, title, action, mock }) {
    return (
        <div className="page-shell">
            <Navbar />
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
        </div>
    );
}
