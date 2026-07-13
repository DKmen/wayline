import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Records source fingerprints and decides whether this lifecycle event needs reinjection. */
export async function shouldInject({ fingerprint, sessionId, source, stateDirectory }) {
  await mkdir(stateDirectory, { recursive: true });
  const statePath = join(stateDirectory, `${sessionId}.json`);
  let unchanged = false;

  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    unchanged = state.fingerprint === fingerprint;
  } catch {
    unchanged = false;
  }

  await writeFile(statePath, JSON.stringify({ fingerprint }), 'utf8');
  return source !== 'resume' || !unchanged;
}
