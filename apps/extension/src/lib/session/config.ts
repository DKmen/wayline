// WXT exposes vars prefixed WXT_ to import.meta.env — set WXT_API_BASE_URL in
// apps/extension/.env.local to http://localhost:3000 for local manual verification
// (docs/03-architecture.md §3.2); production defaults to the real API origin.
/** Absolute origin the extension calls for its session-bridge identity fetch. */
export const API_BASE_URL: string = import.meta.env.WXT_API_BASE_URL || 'https://api.wayline.app';
