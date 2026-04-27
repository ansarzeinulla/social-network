import { useEffect, useState } from "react";
import { profile } from "../services/profile";

// useUser — fetches the current user once and caches it in module scope.
// Components that need to know "who am I" import this and don't have to
// re-fetch on every mount.
let cached = null;
let pending = null;

export function useUser() {
    const [user, setUser] = useState(cached);
    const [loading, setLoading] = useState(!cached);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (cached) return;
        if (!pending) {
            pending = profile.get("me")
                .then((u) => { cached = u; return u; })
                .catch((e) => { pending = null; throw e; });
        }
        pending
            .then((u) => { setUser(u); setLoading(false); })
            .catch((e) => { setError(e); setLoading(false); });
    }, []);

    return { user, loading, error };
}

export function clearUserCache() {
    cached = null;
    pending = null;
}
