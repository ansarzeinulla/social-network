// API client with mock-layer support.
//
// How it works:
//   1. A module decides whether to hit real backend or local mock based on
//      USE_MOCK_<MODULE> env var (NEXT_PUBLIC_USE_MOCK_<MODULE>).
//   2. When backend for module X becomes ready, flip its flag to "false" in
//      .env.local and the same API call goes to real server. No component code
//      changes are needed.
//
// API_BASE:
//   - empty string  -> same-origin (Caddy reverse-proxies /api/* to backend)
//   - http://localhost:8080 -> direct dev mode without Caddy

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// assetURL turns a server-relative path like "/uploads/abc.jpg" into a fully
// qualified URL pointing at the backend (or same-origin if Caddy is in front).
// Components must NOT use raw "/uploads/..." in <img src>, otherwise the
// browser hits the Next.js dev server (port 3000) and gets 404.
export const assetURL = (path) => {
    if (!path) return "";
    if (/^https?:\/\//.test(path)) return path; // already absolute
    return API_BASE + path;
};

export const fetchApi = async (url, options = {}) => {
    const isFormData = options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };
    if (!isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${API_BASE}/api${url}`, {
        ...options,
        headers,
        credentials: "include",
    });
    return response;
};

export const apiJSON = async (url, options = {}) => {
    const res = await fetchApi(url, options);
    let data = null;
    try {
        data = await res.json();
    } catch (_) {
        data = null;
    }
    if (!res.ok) {
        const err = new Error(data?.error || `HTTP ${res.status}`);
        err.status = res.status;
        err.body = data;
        throw err;
    }
    return data;
};

// Mock toggle. Set NEXT_PUBLIC_USE_MOCK_FOLLOWERS=true (etc.) in .env.local.
export const isMocked = (module) => {
    const v = process.env[`NEXT_PUBLIC_USE_MOCK_${module.toUpperCase()}`];
    return v === "true" || v === "1";
};

// Helper: wraps a real API call with a mock fallback. The mock function is
// used when:
//   - isMocked(module) is true (explicit dev override), OR
//   - the real call fails because the endpoint isn't implemented yet:
//     * network error (no status — backend down)
//     * HTTP 404 (endpoint not registered on backend)
//     * HTTP 501/502/503/504 (server signaled "not implemented" / unavailable)
// HTTP 401/403/4xx-other are NOT masked — they're real auth/validation errors
// the UI must handle.
const FALLBACK_STATUSES = new Set([404, 501, 502, 503, 504]);

export const withMock = async (module, realFn, mockFn) => {
    if (isMocked(module)) {
        return mockFn();
    }
    try {
        return await realFn();
    } catch (err) {
        if (err.status === undefined || FALLBACK_STATUSES.has(err.status)) {
            console.warn(`[api] module=${module} not ready (${err.status || "network"}), using mock`);
            return mockFn();
        }
        throw err;
    }
};
