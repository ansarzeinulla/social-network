import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import Avatar from "../../../components/Avatar";
import { groups } from "../../../services/groups";

export default function GroupPage() {
    const router = useRouter();
    const { id } = router.query;
    const [g, setG] = useState(null);
    const [members, setMembers] = useState([]);
    const [showMembers, setShowMembers] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            const [data, mems] = await Promise.all([
                groups.get(id),
                groups.members(id).catch(() => []),
            ]);
            setG(data);
            setMembers(mems || []);
            setLoading(false);
        })();
    }, [id]);

    if (loading) return <Layout><div className="empty-state">Loading…</div></Layout>;
    if (!g) return <Layout><div className="empty-state">Группа не найдена</div></Layout>;

    const creatorName = `${g.creator_first_name || ""} ${g.creator_last_name || ""}`.trim() || `User #${g.creator_id}`;

    return (
        <Layout>
            <div className="group-cover">
                <div className="cover-photo" />
                <div className="group-header">
                    <div className="avatar group-avatar">{g.title.slice(0, 1).toUpperCase()}</div>
                    <div className="group-info">
                        <h1>{g.title}</h1>
                        <p className="group-meta">
                            <button
                                type="button"
                                className="members-btn"
                                onClick={() => setShowMembers(true)}
                                title="Показать участников"
                            >
                                <strong>{g.members_count}</strong> участников
                            </button>
                            {g.joined && <> · <span className="badge">joined</span></>}
                            {g.pending && <> · <span className="badge" style={{ color: "var(--warning)" }}>pending</span></>}
                        </p>
                        <p className="group-creator">
                            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle" }}>star</span>
                            {" Создатель: "}
                            <Link href={`/profile/${g.creator_id}`} className="creator-link">
                                {creatorName}
                            </Link>
                        </p>
                    </div>
                </div>
                {g.description && <p className="about">{g.description}</p>}
            </div>

            <div className="card actions-card">
                <Link href={`/groups/${id}/chat`} className="action-btn">
                    <span className="material-symbols-outlined">chat</span>
                    <span>Чат группы</span>
                </Link>
                <Link href={`/groups/${id}/events`} className="action-btn">
                    <span className="material-symbols-outlined">event</span>
                    <span>События</span>
                </Link>
            </div>

            <div className="empty-state">Посты группы появятся здесь</div>

            {showMembers && (
                <div className="modal-backdrop" onClick={() => setShowMembers(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Участники ({members.length})</h3>
                            <button className="modal-close" onClick={() => setShowMembers(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {members.length === 0 ? (
                                <div className="empty-state" style={{ padding: 16 }}>Пока никого</div>
                            ) : (
                                members.map((u) => {
                                    const isCreator = u.id === g.creator_id;
                                    return (
                                        <div
                                            key={u.id}
                                            className="member-row"
                                            onClick={() => router.push(`/profile/${u.id}`)}
                                        >
                                            <Avatar url={u.avatar} name={u.first_name} />
                                            <div className="member-info">
                                                <div className="member-name">
                                                    {u.first_name} {u.last_name}
                                                    {isCreator && <span className="creator-badge">creator</span>}
                                                </div>
                                                <div className="member-handle">@{u.nickname || `id${u.id}`}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .group-cover {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                .cover-photo {
                    height: 180px;
                    background: linear-gradient(135deg, var(--primary), #4A99F8);
                }
                .group-header {
                    display: flex;
                    align-items: flex-end;
                    gap: 16px;
                    padding: 0 24px 16px;
                    margin-top: -40px;
                }
                .group-avatar {
                    width: 96px;
                    height: 96px;
                    font-size: 36px;
                    border-radius: var(--radius-lg);
                    border: 4px solid var(--card-bg);
                }
                .group-info { flex: 1; padding-bottom: 8px; }
                .group-info h1 { font-size: 22px; font-weight: 800; }
                .group-meta { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
                .members-btn {
                    background: transparent;
                    border: none;
                    padding: 0;
                    color: var(--text-secondary);
                    font: inherit;
                    cursor: pointer;
                    text-decoration: underline dotted;
                    text-underline-offset: 2px;
                }
                .members-btn:hover { color: var(--primary); }
                .members-btn strong { color: var(--text-main); }
                .group-creator {
                    color: var(--text-secondary);
                    font-size: 13px;
                    margin-top: 4px;
                }
                .creator-link {
                    color: var(--primary);
                    font-weight: 600;
                }
                .about { padding: 0 24px 16px; font-size: 14px; line-height: 1.5; }
                .actions-card { display: flex; gap: 8px; padding: 8px; }
                .action-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px;
                    border-radius: var(--radius);
                    color: var(--text-main);
                    font-weight: 600;
                    font-size: 14px;
                    transition: background 0.15s;
                }
                .action-btn:hover { background: var(--bg-hover); color: var(--text-main); }
                .action-btn :global(.material-symbols-outlined) { color: var(--primary); font-size: 22px; }

                /* Modal */
                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 200;
                    display: grid;
                    place-items: center;
                    padding: 16px;
                    animation: fadeIn 0.15s ease-out;
                }
                .modal {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    width: 100%;
                    max-width: 440px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--shadow-lg);
                    overflow: hidden;
                }
                .modal-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    border-bottom: 1px solid var(--border-soft);
                }
                .modal-head h3 { font-size: 16px; font-weight: 700; }
                .modal-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: transparent;
                    color: var(--text-secondary);
                    display: grid;
                    place-items: center;
                    transition: background 0.15s;
                }
                .modal-close:hover { background: var(--bg-hover); }
                .modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }
                .member-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .member-row:hover { background: var(--bg-hover); }
                .member-info { flex: 1; min-width: 0; }
                .member-name {
                    font-weight: 600;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .creator-badge {
                    background: rgba(var(--primary-rgb), 0.12);
                    color: var(--primary);
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 999px;
                    text-transform: uppercase;
                }
                .member-handle {
                    font-size: 12px;
                    color: var(--text-secondary);
                    margin-top: 2px;
                }
            `}</style>
        </Layout>
    );
}
