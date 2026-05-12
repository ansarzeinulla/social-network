import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { notifications } from "../services/notifications";
import { followers } from "../services/followers";
import { groups as groupsApi } from "../services/groups";
import { useUser } from "../hooks/useUser";
import { useWebSocket } from "../hooks/useWebSocket";

const ICONS = {
    follow_request: "person_add",
    new_follower: "person_add",
    group_invite: "groups",
    group_request: "group_add",
    group_accepted: "check_circle",
    new_event: "event",
};

const MESSAGES = {
    follow_request: "хочет на вас подписаться",
    new_follower: "подписался(ась) на вас",
    group_invite: "приглашает в группу",
    group_request: "просится в вашу группу",
    group_accepted: "принял(а) вашу заявку в группу",
    new_event: "создал(а) новое событие",
};

// Where each notification type takes you when clicked on the body. Returns
// null for types we can't deep-link to (e.g. new_event — backend stores the
// event_id but not the group_id, and event routes don't exist standalone).
function targetHref(n) {
    switch (n.type) {
        case "follow_request":
        case "new_follower":
            return n.sender_id ? `/profile/${n.sender_id}` : null;
        case "group_request":
        case "group_invite":
        case "group_accepted":
            return n.entity_id ? `/groups/${n.entity_id}` : null;
        default:
            return null;
    }
}

export default function NotificationsPage() {
    const router = useRouter();
    const { user } = useUser();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState({}); // notif id -> true while a button request is in flight

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

    // Real-time push: when the WS bridge fires "notification.new", re-fetch
    // the list from the server. We could try to merge the WS payload directly,
    // but the payload shape is partial (no actor name, no created_at) — a
    // reload gives us the proper enriched record without forcing the user to
    // refresh the page.
    useWebSocket((ev) => {
        if (ev.type === "notification.new") {
            load();
        }
    }, { enabled: !!user });

    // Safety net: on every WS (re)connect, reload the list. Pushes can land
    // while we're momentarily disconnected (StrictMode/page transitions
    // remount the socket); the notification is still in the DB, we just
    // need to fetch it again.
    useEffect(() => {
        const onOpen = () => load();
        window.addEventListener("ws:open", onOpen);
        return () => window.removeEventListener("ws:open", onOpen);
    }, []);

    const setPendingFor = (id, val) => setPending((p) => ({ ...p, [id]: val }));

    // Tell every listener (Navbar bell badge in particular) that the unread
    // set may have changed. Cheap pub/sub via window events — Navbar refetches
    // and recomputes the badge.
    const fireChanged = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("notif:changed"));
        }
    };

    const markRead = async (id) => {
        await notifications.markRead(id);
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        fireChanged();
    };
    const markAllRead = async () => {
        await notifications.markAllRead();
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
        fireChanged();
    };

    // Wraps an action with proper error surfacing — previously every action
    // had a silent `catch (_)`, which made "I clicked Принять and nothing
    // happened" impossible to diagnose. Now the user sees an alert with the
    // server's error message when the call fails.
    const runAction = async (n, label, fn) => {
        setPendingFor(n.id, true);
        try {
            await fn();
            await notifications.markRead(n.id);
            setItems((prev) => prev.filter((x) => x.id !== n.id));
            fireChanged();
        } catch (err) {
            window.alert(`Не удалось «${label}»: ${err?.message || "ошибка сервера"}`);
        } finally {
            setPendingFor(n.id, false);
        }
    };

    const acceptFollow = (n) => runAction(n, "Принять", () => followers.accept(n.sender_id));
    const declineFollow = (n) => runAction(n, "Отклонить", () => followers.decline(n.sender_id));

    const acceptGroupRequest = (n) => {
        if (!n.entity_id || !n.sender_id) {
            window.alert("Уведомление повреждено: нет id группы или отправителя");
            return;
        }
        return runAction(n, "Принять в группу", () => groupsApi.acceptRequest(n.entity_id, n.sender_id));
    };
    const declineGroupRequest = (n) => {
        if (!n.entity_id || !n.sender_id) return;
        return runAction(n, "Отклонить", () => groupsApi.declineRequest(n.entity_id, n.sender_id));
    };

    const acceptGroupInvite = (n) => {
        if (!n.entity_id) return;
        return runAction(n, "Вступить", () => groupsApi.acceptInvite(n.entity_id));
    };

    // Click on the notification body — mark as read then go to the entity.
    const openNotif = async (n) => {
        const href = targetHref(n);
        if (!n.is_read) {
            try { await notifications.markRead(n.id); } catch (_) {}
            setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
            fireChanged();
        }
        if (href) router.push(href);
    };

    const unread = items.filter((n) => !n.is_read).length;

    const renderActions = (n) => {
        const isPending = !!pending[n.id];
        if (n.type === "follow_request" && !n.is_read) {
            return (
                <div className="notif-actions">
                    <button className="btn" disabled={isPending} onClick={(e) => { e.stopPropagation(); acceptFollow(n); }}>Принять</button>
                    <button className="btn btn-danger" disabled={isPending} onClick={(e) => { e.stopPropagation(); declineFollow(n); }}>Отклонить</button>
                </div>
            );
        }
        if (n.type === "group_request" && !n.is_read) {
            return (
                <div className="notif-actions">
                    <button className="btn" disabled={isPending} onClick={(e) => { e.stopPropagation(); acceptGroupRequest(n); }}>Принять</button>
                    <button className="btn btn-danger" disabled={isPending} onClick={(e) => { e.stopPropagation(); declineGroupRequest(n); }}>Отклонить</button>
                </div>
            );
        }
        if (n.type === "group_invite" && !n.is_read) {
            return (
                <div className="notif-actions">
                    <button className="btn" disabled={isPending} onClick={(e) => { e.stopPropagation(); acceptGroupInvite(n); }}>Вступить</button>
                    <button className="btn btn-ghost" disabled={isPending} onClick={(e) => { e.stopPropagation(); markRead(n.id); }}>Прочитать</button>
                </div>
            );
        }
        if (!n.is_read) {
            return (
                <button className="btn btn-ghost" disabled={isPending} onClick={(e) => { e.stopPropagation(); markRead(n.id); }}>Прочитать</button>
            );
        }
        return null;
    };

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
                items.map((n) => {
                    const clickable = !!targetHref(n);
                    return (
                        <div
                            key={n.id}
                            className={`card notif ${n.is_read ? "read" : ""} ${clickable ? "clickable" : ""}`}
                            onClick={clickable ? () => openNotif(n) : undefined}
                        >
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
                            {renderActions(n)}
                        </div>
                    );
                })
            )}

            <style jsx>{`
                .notif {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    transition: box-shadow 0.15s;
                }
                .notif.read { opacity: 0.65; }
                .notif.clickable { cursor: pointer; }
                .notif.clickable:hover { box-shadow: var(--shadow); }
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
                .notif-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
            `}</style>
        </Layout>
    );
}
