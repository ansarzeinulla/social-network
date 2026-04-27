// Mock registry. Each module exports a service that mirrors the real
// API surface. When the backend for a module is not yet implemented,
// components can call these mocks (via withMock helper in api.js) and the
// UI keeps working.
//
// Adding a new mock module:
//   1. Create mocks/<module>.js exporting an async function per endpoint.
//   2. Register it in src/services/<module>.js using withMock(...).
//   3. Toggle NEXT_PUBLIC_USE_MOCK_<MODULE>=true in .env.local while
//      backend is being built.

export { followersMock } from "./followers";
export { profileMock } from "./profile";
export { notificationsMock } from "./notifications";
export { commentsMock } from "./comments";
export { chatMock } from "./chat";
export { groupsMock } from "./groups";

// Tiny helper for simulating network latency in mocks.
export const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
