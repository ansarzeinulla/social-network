import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { groups } from "../../services/groups";

export default function NewGroup() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const g = await groups.create({ title, description });
            router.push(`/groups/${g.id}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Новая группа">
            <form onSubmit={submit} className="card form">
                <label className="field">
                    <span>Название</span>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        minLength={2}
                        maxLength={50}
                    />
                </label>
                <label className="field">
                    <span>Описание</span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        maxLength={500}
                    />
                </label>
                <button type="submit" className="btn" disabled={loading}>
                    {loading ? "Создаём…" : "Создать"}
                </button>
            </form>

            <style jsx>{`
                .form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 20px;
                }
                .field { display: flex; flex-direction: column; gap: 6px; }
                .field span {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .field input, .field textarea {
                    background: var(--bg);
                    border: 1px solid var(--border);
                    color: var(--text-main);
                    padding: 10px 14px;
                    border-radius: var(--radius);
                    font-size: 14px;
                    resize: vertical;
                }
                .field input:focus, .field textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.18);
                }
                .btn { align-self: flex-start; padding: 10px 24px; }
            `}</style>
        </Layout>
    );
}
