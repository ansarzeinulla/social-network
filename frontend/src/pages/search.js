import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../components/Layout";
import Avatar from "../components/Avatar";
import { assetURL } from "../services/api";
import { search } from "../services/search";

const TABS = [
    { key: "all", label: "Всё" },
    { key: "users", label: "Люди" },
    { key: "posts", label: "Посты" },
    { key: "comments", label: "Комментарии" },
    { key: "messages", label: "Сообщения" },
];

// Trim long bodies for the result preview. Mid-truncate would be nicer but
// for v1 just take first 140 chars.
function snippet(text) {
    if (!text) return "";
    return text.length > 140 ? text.slice(0, 140) + "…" : text;
}

export default function SearchPage() {
    const router = useRouter();
    const { q = "", kind = "all" } = router.query;
    const queryStr = String(q || "");
    const kindStr = String(kind || "all");
    const [draft, setDraft] = useState(queryStr);
    const [results, setResults] = useState({ users: [], posts: [], comments: [], messages: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => { setDraft(queryStr); }, [queryStr]);

    useEffect(() => {
        if (!queryStr.trim()) {
            setResults({ users: [], posts: [], comments: [], messages: [] });
            return;
        }
        let cancelled = false;
        setLoading(true);
        search.query(queryStr, kindStr)
            .then((data) => {
                if (cancelled) return;
                setResults({
                    users: data?.users || [],
                    posts: data?.posts || [],
                    comments: data?.comments || [],
                    messages: data?.messages || [],
                });
            })
            .catch(() => {
                if (!cancelled) setResults({ users: [], posts: [], comments: [], messages: [] });
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [queryStr, kindStr]);

    const submit = (e) => {
        e.preventDefault();
        const v = draft.trim();
        if (!v) return;
        router.push({ pathname: "/search", query: { q: v, kind: kindStr } });
    };

    const selectTab = (key) => {
        router.push({ pathname: "/search", query: { q: queryStr, kind: key } }, undefined, { shallow: false });
    };

    const showUsers = (kindStr === "all" || kindStr === "users") && results.users.length > 0;
    const showPosts = (kindStr === "all" || kindStr === "posts") && results.posts.length > 0;
    const showComments = (kindStr === "all" || kindStr === "comments") && results.comments.length > 0;
    const showMessages = (kindStr === "all" || kindStr === "messages") && results.messages.length > 0;

    const totalCount =
        (showUsers ? results.users.length : 0) +
        (showPosts ? results.posts.length : 0) +
        (showComments ? results.comments.length : 0) +
        (showMessages ? results.messages.length : 0);

    return (
        <Layout title={queryStr ? `Поиск: ${queryStr}` : "Поиск"}>
            <form className="card search-input-card" onSubmit={submit}>
                <span className="material-symbols-outlined">search</span>
                <input
                    type="text"
                    placeholder="Что найти?"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                />
                <button type="submit" className="btn">Искать</button>
            </form>

            <div className="card tabs">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        className={`tab ${kindStr === t.key ? "active" : ""}`}
                        onClick={() => selectTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {!queryStr.trim() ? (
                <div className="empty-state">Введите поисковый запрос</div>
            ) : loading ? (
                <div className="empty-state">Ищу…</div>
            ) : totalCount === 0 ? (
                <div className="empty-state">Ничего не найдено по «{queryStr}»</div>
            ) : (
                <>
                    {showUsers && (
                        <section className="result-section">
                            <h3 className="section-title">Люди ({results.users.length})</h3>
                            {results.users.map((u) => (
                                <Link key={`u-${u.id}`} href={`/profile/${u.id}`} className="card result-row">
                                    <Avatar url={u.avatar} name={u.first_name} size={44} />
                                    <div className="result-info">
                                        <div className="result-title">{u.first_name} {u.last_name}</div>
                                        {u.nickname && <div className="result-meta">@{u.nickname}</div>}
                                    </div>
                                </Link>
                            ))}
                        </section>
                    )}

                    {showPosts && (
                        <section className="result-section">
                            <h3 className="section-title">Посты ({results.posts.length})</h3>
                            {results.posts.map((p) => (
                                <Link key={`p-${p.id}`} href={`/post/${p.id}`} className="card result-row">
                                    <Avatar url={p.avatar} name={p.first_name} size={36} />
                                    <div className="result-info">
                                        <div className="result-title">{p.first_name} {p.last_name}</div>
                                        <div className="result-body">{snippet(p.content)}</div>
                                    </div>
                                </Link>
                            ))}
                        </section>
                    )}

                    {showComments && (
                        <section className="result-section">
                            <h3 className="section-title">Комментарии ({results.comments.length})</h3>
                            {results.comments.map((c) => (
                                <Link key={`c-${c.id}`} href={`/post/${c.post_id}`} className="card result-row">
                                    <Avatar url={c.avatar} name={c.first_name} size={36} />
                                    <div className="result-info">
                                        <div className="result-title">{c.first_name} {c.last_name}</div>
                                        <div className="result-body">{snippet(c.content)}</div>
                                        <div className="result-meta">в посте #{c.post_id}</div>
                                    </div>
                                </Link>
                            ))}
                        </section>
                    )}

                    {showMessages && (
                        <section className="result-section">
                            <h3 className="section-title">Сообщения ({results.messages.length})</h3>
                            {results.messages.map((m) => (
                                <Link key={`m-${m.id}`} href={`/chats/${m.peer_id}`} className="card result-row">
                                    <Avatar url={m.peer_avatar} name={m.peer_first_name} size={36} />
                                    <div className="result-info">
                                        <div className="result-title">
                                            Чат с {m.peer_first_name} {m.peer_last_name}
                                        </div>
                                        <div className="result-body">{snippet(m.content)}</div>
                                    </div>
                                </Link>
                            ))}
                        </section>
                    )}
                </>
            )}

            <style jsx>{`
                .search-input-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                }
                .search-input-card :global(.material-symbols-outlined) {
                    color: var(--text-secondary);
                }
                .search-input-card input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 15px;
                    color: var(--text-main);
                }
                .tabs {
                    display: flex;
                    gap: 4px;
                    padding: 6px;
                    flex-wrap: wrap;
                }
                .tab {
                    flex: 1 1 auto;
                    min-width: 80px;
                    padding: 8px 12px;
                    border-radius: var(--radius);
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    font-family: inherit;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background 0.15s, color 0.15s;
                }
                .tab:hover { background: var(--bg-hover); color: var(--text-main); }
                .tab.active {
                    background: var(--primary-tint);
                    color: var(--primary);
                }
                .section-title {
                    font-family: var(--font-mono);
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    margin: 12px 4px 6px;
                }
                .result-section { display: flex; flex-direction: column; gap: 6px; }
                .result-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 14px;
                    text-decoration: none;
                    color: var(--text-main);
                    transition: box-shadow 0.15s;
                }
                .result-row:hover { box-shadow: var(--shadow); color: var(--text-main); }
                .result-info { flex: 1; min-width: 0; }
                .result-title {
                    font-weight: 700;
                    font-size: 14px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .result-body {
                    color: var(--text-main);
                    font-size: 14px;
                    margin-top: 2px;
                    line-height: 1.4;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .result-meta {
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-family: var(--font-mono);
                    margin-top: 2px;
                }
            `}</style>
        </Layout>
    );
}
