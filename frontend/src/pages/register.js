import { useState } from "react";
import { useRouter } from "next/router";
import { fetchApi } from "../services/api";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async (e) => {
        e.preventDefault();
        const res = await fetchApi("/register", {
            method: "POST",
            body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName, date_of_birth: dateOfBirth }),
        });
        if (res.ok) {
            router.push("/");
        } else {
            const errMsg = await res.text();
            setError(errMsg || "Ошибка регистрации");
        }
    };

    return (
        <form onSubmit={handleRegister}>
            <h1>Регистрация</h1>
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
            <input
                type="text"
                placeholder="First Name"
                onChange={(e) => setFirstName(e.target.value)}
                minLength={2} maxLength={50} required
            />
            <input
                type="text"
                placeholder="Last Name"
                onChange={(e) => setLastName(e.target.value)}
                minLength={2} maxLength={50} required
            />
            <input
                type="date"
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                max={new Date("2020-01-01").toISOString().split('T')[0]}
                min={new Date("1950-01-01").toISOString().split('T')[0]}
            />
            <button type="submit">📝 Создать аккаунт</button>
        </form>
    );
}