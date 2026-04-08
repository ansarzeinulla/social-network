import { useState } from "react";
import { useRouter } from "next/router";
import { fetchApi } from "../services/api";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();

        // Бэкенд проверит пароль и САМ установит Cookie в браузере
        const res = await fetchApi("/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
            alert("Успешный вход!");
            router.push("/profile/me"); // Перекидываем на закрытую страницу
        } else {
            alert("Неверный логин или пароль");
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <h1>Вход</h1>
            <input type="email" onChange={(e) => setEmail(e.target.value)} />
            <input type="password" onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">🔑 Войти</button>
        </form>
    );
}