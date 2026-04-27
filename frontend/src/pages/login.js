import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { fetchApi } from "../services/api";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetchApi("/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                router.push("/");
            } else {
                const errMsg = await res.text();
                setError(errMsg || "Неверный логин или пароль");
            }
        } catch (err) {
            setError("Сервер недоступен");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <form className="auth-card" onSubmit={handleLogin}>
                <h1>Добро пожаловать</h1>
                <p className="subtitle">Войдите, чтобы продолжить</p>

                {error && <div className="error">{error}</div>}

                <div className="field">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        minLength={3}
                        maxLength={30}
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="password">Пароль</label>
                    <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        maxLength={50}
                        required
                    />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Входим…" : "Войти"}
                </button>

                <div className="auth-footer">
                    Нет аккаунта? <Link href="/register">Создать аккаунт</Link>
                </div>
            </form>
        </div>
    );
}
