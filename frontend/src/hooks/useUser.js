import { useEffect, useState } from "react";
import { profile } from "../services/profile";

// Module-level cache + subscriber list. Any consumer that calls useUser()
// re-renders when setUser/refreshUser/clearUserCache fires.
let cached = null;
let pending = null;
const subscribers = new Set();

const broadcast = () => {
    subscribers.forEach((fn) => fn(cached));
};

export function useUser() {
    const [user, setUserState] = useState(cached);
    const [loading, setLoading] = useState(!cached);
    const [error, setError] = useState(null);

    useEffect(() => {
        subscribers.add(setUserState);
        if (cached) {
            setUserState(cached);
            return () => { subscribers.delete(setUserState); };
        }
        if (!pending) {
            pending = profile.get("me")
                .then((u) => { cached = u; broadcast(); return u; })
                .catch((e) => { pending = null; throw e; });
        }
        pending
            .then(() => { setLoading(false); })
            .catch((e) => { setError(e); setLoading(false); });
        return () => { subscribers.delete(setUserState); };
    }, []);

    return { user, loading, error };
}

// Patch one or more fields and broadcast to all consumers.
// Example: setUser({ avatar: "/uploads/abc.png" })
export function setUser(patch) {
    if (!cached) return;
    cached = { ...cached, ...patch };
    broadcast();
}

// Force re-fetch from server and broadcast.
export async function refreshUser() {
    pending = profile.get("me").then((u) => { cached = u; broadcast(); return u; });
    return pending;
}

export function clearUserCache() {
    cached = null;
    pending = null;
    broadcast();
}
