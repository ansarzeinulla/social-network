import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Register() {
    const [form, setForm] = useState({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        date_of_birth: "",
        nickname: "",
        about_me: "",
    });
    const [avatar, setAvatar] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
            if (avatar) fd.append("avatar", avatar);

            const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
            const res = await fetch(`${apiBase}/api/register`, {
                method: "POST",
                body: fd,
                credentials: "include",
            });
            if (res.ok) {
                router.push("/");
            } else {
                const errMsg = await res.text();
                setError(errMsg || "Ошибка регистрации");
            }
        } catch (err) {
            setError("Сервер недоступен");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <form className="auth-card" onSubmit={submit}>
                <div className="brand">Connect</div>
                <h1>Создать аккаунт</h1>
                <p className="subtitle">Поля со звёздочкой — обязательные</p>

                {error && <div className="error">{error}</div>}

                <div className="field">
                    <label>Email *</label>
                    <input type="email" value={form.email} onChange={update("email")}
                        minLength={3} maxLength={30} required />
                </div>

                <div className="field">
                    <label>Пароль *</label>
                    <input type="password" value={form.password} onChange={update("password")}
                        minLength={6} maxLength={50} required placeholder="6-50 символов" />
                </div>

                <div className="field">
                    <label>Имя *</label>
                    <input type="text" value={form.first_name} onChange={update("first_name")}
                        minLength={2} maxLength={50} required />
                </div>

                <div className="field">
                    <label>Фамилия *</label>
                    <input type="text" value={form.last_name} onChange={update("last_name")}
                        minLength={2} maxLength={50} required />
                </div>

                <div className="field">
                    <label>Дата рождения *</label>
                    <input type="date" value={form.date_of_birth} onChange={update("date_of_birth")}
                        max={new Date("2020-01-01").toISOString().split("T")[0]}
                        min={new Date("1950-01-01").toISOString().split("T")[0]}
                        required />
                </div>

                <div className="field">
                    <label>Никнейм</label>
                    <input type="text" value={form.nickname} onChange={update("nickname")}
                        maxLength={50} placeholder="опционально" />
                </div>

                <div className="field">
                    <label>О себе</label>
                    <textarea value={form.about_me} onChange={update("about_me")}
                        maxLength={500} rows={3} placeholder="опционально" />
                </div>

                <div className="field">
                    <label>Аватар</label>
                    <input type="file" accept="image/*"
                        onChange={(e) => setAvatar(e.target.files?.[0] || null)} />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Создаём…" : "Создать аккаунт"}
                </button>

                <div className="auth-footer">
                    Уже есть аккаунт? <Link href="/login">Войти</Link>
                </div>
            </form>
        </div>
    );
}
