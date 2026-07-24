import { isNull } from 'drizzle-orm';
import { flows } from './schema';
import type { ScopedDb } from './scoped';

/** A workspace's live flows — always empty until S3 ships flow creation, but a real, scoped data path. */
export async function listFlows(scoped: ScopedDb) {
  return scoped.select(flows, isNull(flows.deletedAt));
}
