import { useState } from "react";
import { fetchApi } from "../services/api";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        const res = await fetchApi("/register", {
            method: "POST",
            body: JSON.stringify({ email, password, firstName, lastName, dateOfBirth }),
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
            <input type="text" onChange={(e) => setFirstName(e.target.value)} />
            <input type="text" onChange={(e) => setLastName(e.target.value)} />
            <input type="date" onChange={(e) => setDateOfBirth(e.target.value)} />
            <button type="submit">📝 Создать аккаунт</button>
        </form>
    );
}