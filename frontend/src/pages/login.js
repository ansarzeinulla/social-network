import { useState } from "react";
import { useRouter } from "next/router";
import { fetchApi } from "../services/api";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
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
    };

    return (
        <form onSubmit={handleLogin}>
            <h1>Вход</h1>
            {error && <div id="error-label" style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}
            <input
                type="email"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                minLength={3} maxLength={30} required
            />
            <input
                type="password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
                minLength={6} maxLength={50} required
            />
            <button type="submit">🔑 Войти</button>
        </form>
    );
}