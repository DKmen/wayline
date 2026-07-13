import { customType } from 'drizzle-orm/pg-core';

/**
 * Postgres `citext` (case-insensitive text) — used for email/slug columns per
 * docs/04-data-model.md §2. Drizzle has no first-class citext type.
 */
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});
