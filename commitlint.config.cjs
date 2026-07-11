const TICKET_PATTERN = /^WAY-\d+$/;
const TYPES_REQUIRING_TICKET = new Set(['feat', 'fix', 'refactor', 'perf']);

/**
 * Requires a WAY-123-shaped scope, but only for commit types that represent
 * user-facing/behavioral change. chore/docs/style/test/build/ci commits (including
 * this repo's own bootstrap commit) don't need to trace back to a Plane ticket.
 */
function scopeTicketId(parsed) {
  const { type, scope } = parsed;

  if (!TYPES_REQUIRING_TICKET.has(type)) {
    return [true];
  }

  if (!scope || !TICKET_PATTERN.test(scope)) {
    return [
      false,
      `${type} commits must include a ticket scope like WAY-123, e.g. "${type}(WAY-123): short summary"`,
    ];
  }

  return [true];
}

module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'scope-ticket-id': scopeTicketId,
      },
    },
  ],
  rules: {
    'scope-ticket-id': [2, 'always'],
  },
};
