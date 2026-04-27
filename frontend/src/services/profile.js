import { apiJSON, withMock } from "./api";
import { profileMock } from "./mocks/profile";

// id: numeric string -> /api/profile/{id}; "me" or undefined -> /api/profile
const profilePath = (id) => (!id || id === "me") ? "/profile" : `/profile/${id}`;

export const profile = {
    get: (id) =>
        withMock("PROFILE",
            () => apiJSON(profilePath(id)),
            () => profileMock.getProfile(id)
        ),
    update: (patch) =>
        withMock("PROFILE",
            () => apiJSON(`/profile`, { method: "PATCH", body: JSON.stringify(patch) }),
            () => profileMock.updateProfile(patch)
        ),
    setPrivacy: (isPublic) =>
        withMock("PROFILE",
            () => apiJSON(`/profile/privacy`, { method: "POST", body: JSON.stringify({ is_public: !!isPublic }) }),
            () => profileMock.setPrivacy(isPublic)
        ),
};
