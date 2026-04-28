import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { notifications } from "../services/notifications";
import { followers } from "../services/followers";

const ICONS = {
    follow_request: "person_add",
    group_invite: "groups",
    group_request: "group_add",
    new_event: "event",
};

const MESSAGES = {
    follow_request: "хочет на вас подписаться",
    group_invite: "приглашает в группу",
    group_request: "просится в вашу группу",
    new_event: "создал(а) новое событие",
};

export default function NotificationsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const normalize = (n) => ({
        id: n.id,
        type: n.type,
        sender_id: n.sender_id,
        actor: n.sender_first_name
            ? `${n.sender_first_name} ${n.sender_last_name}`
            : (n.actor || "Someone"),
        is_read: typeof n.is_read === "boolean" ? n.is_read : !!n.read,
        created_at: n.created_at,
        entity_id: n.entity_id,
    });

    const load = async () => {
        setLoading(true);
        try {
            const list = await notifications.list();
            setItems((list || []).map(normalize));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const markRead = async (id) => {
        await notifications.markRead(id);
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    };
    const markAllRead = async () => {
        await notifications.markAllRead();
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };
    const acceptFollow = async (n) => {
        try { await followers.accept(n.sender_id); } catch (_) {}
        setItems((prev) => prev.filter((x) => x.id !== n.id));
    };
    const declineFollow = async (n) => {
        try { await followers.decline(n.sender_id); } catch (_) {}
        setItems((prev) => prev.filter((x) => x.id !== n.id));
    };

    const unread = items.filter((n) => !n.is_read).length;

    return (
        <Layout
            title="Уведомления"
            action={unread > 0 && (
                <button className="btn btn-ghost" onClick={markAllRead}>
                    Прочитать все ({unread})
                </button>
            )}
        >
            {loading ? (
                <div className="empty-state">Loading…</div>
            ) : items.length === 0 ? (
                <div className="empty-state">Нет уведомлений</div>
            ) : (
                items.map((n) => (
                    <div key={n.id} className={`card notif ${n.is_read ? "read" : ""}`}>
                        <div className="notif-icon">
                            <span className="material-symbols-outlined">{ICONS[n.type] || "notifications"}</span>
                        </div>
                        <div className="notif-body">
                            <div className="notif-text">
                                <strong>{n.actor}</strong>
                                {!n.is_read && <span className="badge" style={{ marginLeft: 8 }}>new</span>}
                                <div className="notif-msg">{MESSAGES[n.type] || n.type}</div>
                            </div>
                            <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                        {n.type === "follow_request" && !n.is_read ? (
                            <div className="notif-actions">
                                <button className="btn" onClick={() => acceptFollow(n)}>Принять</button>
                                <button className="btn btn-danger" onClick={() => declineFollow(n)}>Отклонить</button>
                            </div>
                        ) : !n.is_read ? (
                            <button className="btn btn-ghost" onClick={() => markRead(n.id)}>Прочитать</button>
                        ) : null}
                    </div>
                ))
            )}

            <style jsx>{`
                .notif {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                }
                .notif.read { opacity: 0.65; }
                .notif-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(var(--primary-rgb), 0.12);
                    color: var(--primary);
                    display: grid;
                    place-items: center;
                    flex-shrink: 0;
                }
                .notif-body { flex: 1; min-width: 0; }
                .notif-text { font-size: 14px; }
                .notif-msg { color: var(--text-secondary); margin-top: 2px; }
                .notif-time { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
                .notif-actions { display: flex; gap: 8px; }
            `}</style>
        </Layout>
    );
}
