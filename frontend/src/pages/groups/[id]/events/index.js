import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../../components/Layout";
import { groups } from "../../../../services/groups";

const voteLabel = {
    going: "Going",
    not_going: "Not going",
};

export default function GroupEvents() {
    const router = useRouter();
    const { id } = router.query;
    const [g, setG] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        title: "",
        description: "",
        event_date: "",
    });

    const loadEvents = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const list = await groups.events(id);
            setEvents(list || []);
            setError("");
        } catch (err) {
            setError("Не удалось загрузить события группы");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        // Group info is fetched separately so the title can show the group's
        // name instead of a raw numeric id ("События группы: Тестовая группа"
        // rather than "События группы #1"). On error we silently fall back
        // to the bare title.
        groups.get(id).then(setG).catch(() => setG(null));
        loadEvents();
    }, [id]);

    const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const createEvent = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.event_date) return;
        const eventDate = new Date(form.event_date).toISOString();
        await groups.createEvent(id, {
            title: form.title.trim(),
            description: form.description.trim(),
            event_date: eventDate,
            options: ["going", "not_going"],
        });
        setForm({ title: "", description: "", event_date: "" });
        await loadEvents();
    };

    const vote = async (eventID, value, currentVote) => {
        // Click the already-active option to retract the vote, otherwise set
        // it to the chosen option. Backend handles "" as "remove my vote".
        const next = currentVote === value ? "" : value;
        try {
            await groups.voteEvent(id, eventID, next);
            await loadEvents();
        } catch (err) {
            setError(err?.message || "Не удалось проголосовать");
        }
    };

    return (
        <Layout title={g ? `События группы: ${g.title}` : "События группы"}>
            <form className="card event-form" onSubmit={createEvent}>
                <input
                    value={form.title}
                    onChange={update("title")}
                    placeholder="Название события"
                    required
                />
                <textarea
                    value={form.description}
                    onChange={update("description")}
                    placeholder="Описание"
                    rows={3}
                />
                <div className="form-row">
                    <input
                        type="datetime-local"
                        value={form.event_date}
                        onChange={update("event_date")}
                        required
                    />
                    <div className="options-preview">
                        <span>Going</span>
                        <span>Not going</span>
                    </div>
                    <button className="btn" disabled={!form.title.trim() || !form.event_date}>
                        Создать
                    </button>
                </div>
            </form>

            {error && <div className="empty-state">{error}</div>}
            {loading ? (
                <div className="empty-state">Loading…</div>
            ) : events.length === 0 ? (
                <div className="empty-state">Событий пока нет</div>
            ) : events.map((ev) => (
                <article key={ev.id} className="card event-card">
                    <div className="event-main">
                        <div>
                            <h2>{ev.title}</h2>
                            <p>{ev.description}</p>
                        </div>
                        <time>{new Date(ev.event_date).toLocaleString()}</time>
                    </div>
                    <div className="vote-row">
                        {["going", "not_going"].map((value) => (
                            <button
                                key={value}
                                className={`vote ${ev.my_vote === value ? "active" : ""}`}
                                onClick={() => vote(ev.id, value, ev.my_vote)}
                                title={ev.my_vote === value ? "Кликните снова, чтобы убрать голос" : ""}
                            >
                                <span>{voteLabel[value]}</span>
                                <strong>{value === "going" ? ev.going : ev.not_going}</strong>
                            </button>
                        ))}
                    </div>
                </article>
            ))}

            <style jsx>{`
                .event-form {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding: 14px;
                }
                .event-form input,
                .event-form textarea {
                    width: 100%;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    background: var(--bg);
                    padding: 10px 12px;
                    outline: none;
                }
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr auto auto;
                    gap: 8px;
                    align-items: center;
                }
                .options-preview {
                    display: flex;
                    gap: 6px;
                    color: var(--text-secondary);
                    font-size: 12px;
                    white-space: nowrap;
                }
                .options-preview span {
                    background: var(--bg);
                    border-radius: 999px;
                    padding: 8px 10px;
                }
                .event-card { padding: 14px; }
                .event-main {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                }
                .event-main h2 {
                    font-size: 17px;
                    font-weight: 800;
                }
                .event-main p {
                    color: var(--text-secondary);
                    margin-top: 4px;
                    font-size: 14px;
                    white-space: pre-wrap;
                }
                time {
                    color: var(--text-muted);
                    font-size: 12px;
                    white-space: nowrap;
                }
                .vote-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-top: 12px;
                }
                .vote {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--bg);
                    color: var(--text-main);
                    border-radius: var(--radius);
                    padding: 10px 12px;
                    font-weight: 700;
                }
                .vote.active {
                    background: rgba(var(--primary-rgb), 0.12);
                    color: var(--primary);
                }
                @media (max-width: 640px) {
                    .form-row { grid-template-columns: 1fr; }
                    .options-preview { flex-wrap: wrap; }
                    .event-main { flex-direction: column; }
                }
            `}</style>
        </Layout>
    );
}
