import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { notifications } from "../services/notifications";
import { followers } from "../services/followers";
import { isMocked } from "../services/api";

const ICONS = {
    follow_request:  "👤",
    group_invite:    "👥",
    group_request:   "🛎️",
    new_event:       "🗓️",
    // legacy / mock variants
    group_invitation:"👥",
    event_reminder:  "🗓️",
    new_message:     "💬",
    new_comment:     "💭",
};

const MESSAGES = {
    follow_request:   "хочет на вас подписаться",
    group_invite:     "приглашает в группу",
    group_request:    "просится в вашу группу",
    new_event:        "создал(а) новое событие",
    group_invitation: "приглашает в группу",
    event_reminder:   "напоминает о событии",
    new_message:      "написал(а) вам сообщение",
    new_comment:      "прокомментировал(а) ваш пост",
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
        } catch (e) {
            console.error(e);
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
        try {
            await followers.accept(n.sender_id);
        } catch (_) {}
        await notifications.markRead(n.id);
        setItems((prev) => prev.filter((x) => x.id !== n.id));
    };

    const declineFollow = async (n) => {
        try {
            await followers.decline(n.sender_id);
        } catch (_) {}
        await notifications.markRead(n.id);
        setItems((prev) => prev.filter((x) => x.id !== n.id));
    };

    const unread = items.filter((n) => !n.is_read).length;

    return (
        <Layout
            title="Уведомления"
            mock={isMocked("NOTIFICATIONS")}
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
                    <div key={n.id} className="card card-row" style={{ opacity: n.is_read ? 0.6 : 1 }}>
                        <div className="avatar">{ICONS[n.type] || "🔔"}</div>
                        <div style={{ flex: 1 }}>
                            <div className="card-title">
                                {n.actor}
                                {!n.is_read && <span className="badge" style={{ marginLeft: "0.5rem" }}>new</span>}
                            </div>
                            <div className="card-meta">
                                {MESSAGES[n.type] || n.type}
                                {" · "}
                                {new Date(n.created_at).toLocaleString()}
                            </div>
                        </div>
                        {n.type === "follow_request" && !n.is_read ? (
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button className="btn" onClick={() => acceptFollow(n)}>Принять</button>
                                <button className="btn btn-danger" onClick={() => declineFollow(n)}>Отклонить</button>
                            </div>
                        ) : !n.is_read ? (
                            <button className="btn btn-ghost" onClick={() => markRead(n.id)}>
                                Прочитать
                            </button>
                        ) : null}
                    </div>
                ))
            )}
        </Layout>
    );
}
