import { useState } from "react";
import { fetchApi } from "../services/api";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();

        // Отправляем JSON на бэкенд
        const res = await fetchApi("/register", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
            alert("Регистрация успешна!");
        } else {
            alert("Ошибка регистрации");
        }
    };

    return (
        <form onSubmit={handleRegister}>
            <h1>Регистрация</h1>
            <input type="email" onChange={(e) => setEmail(e.target.value)} />
            <input type="password" onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">📝 Создать аккаунт</button>
        </form>
    );
}