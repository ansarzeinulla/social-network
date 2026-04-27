import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { groups } from "../../services/groups";
import { isMocked } from "../../services/api";

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
        <Layout title="Новая группа" mock={isMocked("GROUPS")}>
            <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="field">
                    <label>Название</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        minLength={2}
                        maxLength={50}
                        style={inputStyle}
                    />
                </div>
                <div className="field">
                    <label>Описание</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        maxLength={500}
                        style={{ ...inputStyle, resize: "vertical" }}
                    />
                </div>
                <button type="submit" className="btn" disabled={loading}>
                    {loading ? "Создаём…" : "Создать"}
                </button>
            </form>
        </Layout>
    );
}

const inputStyle = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text-main)",
    padding: "0.7rem 0.9rem",
    borderRadius: "10px",
    width: "100%",
};
