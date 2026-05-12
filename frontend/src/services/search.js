import { apiJSON } from "./api";

// Search across users / posts / comments / messages.
// kind = "all" | "users" | "posts" | "comments" | "messages"
export const search = {
    query: (q, kind = "all") => {
        const params = new URLSearchParams({ q, kind });
        return apiJSON(`/search?${params.toString()}`);
    },
};
