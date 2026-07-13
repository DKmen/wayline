// Explicit allow-list, not a deny-list — docs/09-security-privacy.md §2: "structured
// logs with an explicit field allow-list; no request bodies, no screenshots, no email
// contents." Adding a field here is a deliberate decision, not an accident of what a
// caller happened to pass in.
const ALLOWED_FIELDS = new Set(['route', 'statusCode', 'method', 'durationMs', 'userId']);

type SafeFields = Partial<
  Record<'route' | 'statusCode' | 'method' | 'durationMs' | 'userId', string | number | boolean>
>;

/** Emits one JSON log line containing only the event name and allow-listed fields. */
export function logSafe(event: string, fields: SafeFields): void {
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([key]) => ALLOWED_FIELDS.has(key)),
  );

  console.log(JSON.stringify({ event, ...safeFields }));
}
