import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { fetchApi } from "../services/api";

// Modal listing users who liked a given post. Fetches on open, closes on
// backdrop click or × button. Used both from PostCard (feed) and the post
// detail page — same endpoint, same component, same look.
export default function LikersModal({ postId, open, onClose }) {
    const [likers, setLikers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !postId) return;
        let cancelled = false;
        setLoading(true);
        setError("");
        fetchApi(`/posts/${postId}/likes`)
            .then((r) => {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            })
            .then((data) => { if (!cancelled) setLikers(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setError("Не удалось загрузить лайки"); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, postId]);

    if (!open) return null;

    return (
        <div className="likers-backdrop" onClick={onClose}>
            <div className="likers-modal" onClick={(e) => e.stopPropagation()}>
                <div className="likers-head">
                    <h3>Лайки{!loading && likers.length > 0 ? ` (${likers.length})` : ""}</h3>
                    <button type="button" className="likers-close" onClick={onClose} aria-label="Закрыть">×</button>
                </div>
                <div className="likers-body">
                    {loading ? (
                        <div className="likers-empty">Загружаем…</div>
                    ) : error ? (
                        <div className="likers-empty">{error}</div>
                    ) : likers.length === 0 ? (
                        <div className="likers-empty">Пока никто не лайкнул</div>
                    ) : (
                        likers.map((u) => (
                            <Link
                                key={u.id}
                                href={`/profile/${u.id}`}
                                className="liker-row"
                                onClick={onClose}
                            >
                                <Avatar url={u.avatar} name={u.first_name} size={40} />
                                <div className="liker-info">
                                    <div className="liker-name">{u.first_name} {u.last_name}</div>
                                    {u.nickname && <div className="liker-handle">@{u.nickname}</div>}
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            <style jsx>{`
                .likers-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 200;
                    display: grid;
                    place-items: center;
                    padding: 16px;
                    animation: fadeIn 0.15s ease-out;
                }
                .likers-modal {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    width: 100%;
                    max-width: 420px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--shadow-lg);
                    overflow: hidden;
                }
                .likers-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    border-bottom: 1px solid var(--border-soft);
                }
                .likers-head h3 { font-size: 16px; font-weight: 700; }
                .likers-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 20px;
                    line-height: 1;
                    display: grid;
                    place-items: center;
                    transition: background 0.15s;
                }
                .likers-close:hover { background: var(--bg-hover); }
                .likers-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }
                .likers-empty {
                    text-align: center;
                    color: var(--text-secondary);
                    padding: 24px 16px;
                    font-size: 14px;
                }
                .liker-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 10px;
                    border-radius: var(--radius);
                    text-decoration: none;
                    color: var(--text-main);
                    transition: background 0.15s;
                }
                .liker-row:hover { background: var(--bg-hover); color: var(--text-main); }
                .liker-info { flex: 1; min-width: 0; }
                .liker-name {
                    font-weight: 700;
                    font-size: 14px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .liker-handle {
                    font-family: var(--font-mono);
                    font-size: 12px;
                    color: var(--text-secondary);
                    margin-top: 1px;
                }
            `}</style>
        </div>
    );
}
