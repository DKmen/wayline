export type SessionReadyMessage = { type: 'session-ready' };

/** True if `message` is the dashboard's "a session now exists" ping (docs/03-architecture.md §3.2). */
export function isSessionReadyMessage(message: unknown): message is SessionReadyMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'session-ready'
  );
}

export type SessionEndedMessage = { type: 'session-ended' };

/** True if `message` is the dashboard's "sign-out just happened" ping. */
export function isSessionEndedMessage(message: unknown): message is SessionEndedMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'session-ended'
  );
}
