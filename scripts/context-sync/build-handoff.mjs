import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { findLatestTranscript } from './find-latest-transcript.mjs';
import { parseClaudeTranscript } from './parse-claude-transcript.mjs';
import { parseCodexTranscript } from './parse-codex-transcript.mjs';
import { redactSecrets } from './redact-secrets.mjs';
import { renderHandoff } from './render-handoff.mjs';
import { shouldInject } from './should-inject.mjs';

/** Builds the sanitized context handoff from the opposite coding tool's latest repository session. */
export async function buildHandoff({
  claudeHome,
  codexHome,
  lifecycle,
  repositoryRoot,
  sessionId,
  snapshot,
  stateDirectory,
  target,
}) {
  const source = target === 'codex' ? 'claude' : 'codex';
  const sourcePath = await findLatestTranscript({
    homeDirectory: source === 'claude' ? claudeHome : codexHome,
    repositoryRoot,
    source,
  });

  if (!sourcePath) {
    return { context: '', messageCount: 0, redactionCount: 0, skipped: true, sourcePath: null };
  }

  const transcript = await readFile(sourcePath, 'utf8');
  const messages =
    source === 'claude' ? parseClaudeTranscript(transcript) : parseCodexTranscript(transcript);
  if (messages.length === 0) {
    return { context: '', messageCount: 0, redactionCount: 0, skipped: true, sourcePath };
  }

  let redactionCount = 0;
  const safeMessages = messages.map((message) => {
    const sanitized = redactSecrets(message.text);
    redactionCount += sanitized.redactionCount;
    return { ...message, text: sanitized.text };
  });
  const fingerprint = createHash('sha256').update(`${sourcePath}\0${transcript}`).digest('hex');
  const inject = await shouldInject({ fingerprint, sessionId, source: lifecycle, stateDirectory });
  const context = inject
    ? renderHandoff({
        ...snapshot,
        messages: safeMessages,
        source: source === 'claude' ? 'Claude' : 'Codex',
      })
    : '';

  return {
    context,
    messageCount: messages.length,
    redactionCount,
    skipped: !inject,
    sourcePath,
  };
}
