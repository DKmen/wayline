import { uuidv7 } from 'uuidv7';

/** App-side UUIDv7 primary keys (docs/04-data-model.md §1) — PG16 has no native v7 generator. */
export function newId(): string {
  return uuidv7();
}
