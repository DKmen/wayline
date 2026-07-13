import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

/** Finds the newest source transcript whose recorded working directory belongs to the repository. */
export async function findLatestTranscript({ homeDirectory, repositoryRoot, source }) {
  const searchRoot =
    source === 'codex' ? resolve(homeDirectory, 'sessions') : resolve(homeDirectory, 'projects');
  const candidates = [];
  const pending = [searchRoot];

  while (pending.length > 0) {
    const directory = pending.pop();
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(path);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        candidates.push({ path, modifiedAt: (await stat(path)).mtimeMs });
      }
    }
  }

  candidates.sort((left, right) => right.modifiedAt - left.modifiedAt);
  for (const candidate of candidates) {
    let transcript;
    try {
      transcript = await readFile(candidate.path, 'utf8');
    } catch {
      continue;
    }

    const belongs = transcript
      .split('\n')
      .slice(0, 100)
      .some((line) => {
        try {
          const record = JSON.parse(line);
          const cwd = source === 'codex' ? record.payload?.cwd : record.cwd;
          if (typeof cwd !== 'string') {
            return false;
          }
          const child = relative(resolve(repositoryRoot), resolve(cwd));
          return child === '' || !child.startsWith('..');
        } catch {
          return false;
        }
      });

    if (belongs) {
      return candidate.path;
    }
  }

  return null;
}
