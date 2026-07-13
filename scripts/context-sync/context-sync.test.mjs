import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, describe, expect, test } from 'vitest';

import { buildHandoff } from './build-handoff.mjs';
import { createHookOutput } from './create-hook-output.mjs';
import { findLatestTranscript } from './find-latest-transcript.mjs';
import { getRepositorySnapshot } from './get-repository-snapshot.mjs';
import { parseClaudeTranscript } from './parse-claude-transcript.mjs';
import { parseCodexTranscript } from './parse-codex-transcript.mjs';
import { redactSecrets } from './redact-secrets.mjs';
import { renderHandoff } from './render-handoff.mjs';
import { shouldInject } from './should-inject.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { force: true, recursive: true })),
  );
});

async function createTemporaryDirectory() {
  const path = await mkdtemp(join(tmpdir(), 'wayline-context-sync-'));
  temporaryDirectories.push(path);
  return path;
}

async function runCli({ arguments: cliArguments, cwd, env, input = '' }) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(cwd, 'scripts/context-sync/context-sync.cli.mjs'), ...cliArguments],
      { cwd, env },
    );
    let stderr = '';
    let stdout = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr, stdout }));
    child.stdin.end(input);
  });
}

describe('Claude transcript parsing', () => {
  test('keeps genuine completed conversation text and ignores unsafe records', () => {
    const transcript = [
      {
        type: 'user',
        cwd: '/repo',
        isMeta: false,
        isSidechain: false,
        timestamp: '2026-07-13T01:00:00Z',
        message: { content: 'Start WAYLI-27', role: 'user' },
      },
      {
        type: 'assistant',
        cwd: '/repo',
        isSidechain: false,
        timestamp: '2026-07-13T01:01:00Z',
        message: {
          content: [
            { type: 'thinking', thinking: 'hidden' },
            { type: 'text', text: 'WAYLI-27 is ready.' },
            { type: 'tool_use', name: 'Bash' },
          ],
          role: 'assistant',
          stop_reason: 'end_turn',
        },
      },
      {
        type: 'user',
        cwd: '/repo',
        isMeta: true,
        isSidechain: false,
        timestamp: '2026-07-13T01:02:00Z',
        message: { content: 'hook payload', role: 'user' },
      },
      {
        type: 'assistant',
        cwd: '/repo',
        isSidechain: true,
        timestamp: '2026-07-13T01:03:00Z',
        message: {
          content: [{ type: 'text', text: 'sidechain' }],
          role: 'assistant',
          stop_reason: 'end_turn',
        },
      },
      {
        type: 'assistant',
        cwd: '/repo',
        isSidechain: false,
        timestamp: '2026-07-13T01:04:00Z',
        message: {
          content: [{ type: 'text', text: 'unfinished' }],
          role: 'assistant',
          stop_reason: null,
        },
      },
      {
        type: 'user',
        cwd: '/repo',
        isMeta: false,
        isSidechain: false,
        message: { content: [{ type: 'image', source: 'ignored' }], role: 'user' },
      },
      {
        type: 'user',
        cwd: '/repo',
        isMeta: false,
        isSidechain: false,
        message: { content: 42, role: 'user' },
      },
      '{malformed',
    ]
      .map((record) => (typeof record === 'string' ? record : JSON.stringify(record)))
      .join('\n');

    expect(parseClaudeTranscript(transcript)).toEqual([
      { role: 'user', text: 'Start WAYLI-27', timestamp: '2026-07-13T01:00:00Z' },
      { role: 'assistant', text: 'WAYLI-27 is ready.', timestamp: '2026-07-13T01:01:00Z' },
    ]);
  });

  test('normalizes a missing message timestamp', () => {
    const transcript = JSON.stringify({
      type: 'user',
      cwd: '/repo',
      isMeta: false,
      isSidechain: false,
      message: { content: 'No timestamp', role: 'user' },
    });
    expect(parseClaudeTranscript(transcript)).toEqual([
      { role: 'user', text: 'No timestamp', timestamp: '' },
    ]);
  });
});

describe('Codex transcript parsing', () => {
  test('uses event messages without duplicating response items or commentary', () => {
    const transcript = [
      {
        type: 'event_msg',
        timestamp: '2026-07-13T01:00:00Z',
        payload: { type: 'user_message', message: 'Implement the plan.' },
      },
      {
        type: 'response_item',
        timestamp: '2026-07-13T01:00:01Z',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'duplicate' }],
        },
      },
      {
        type: 'event_msg',
        timestamp: '2026-07-13T01:01:00Z',
        payload: { type: 'agent_message', phase: 'commentary', message: 'Working...' },
      },
      {
        type: 'event_msg',
        timestamp: '2026-07-13T01:02:00Z',
        payload: { type: 'agent_message', phase: 'final', message: 'Implementation complete.' },
      },
      { type: 'event_msg', payload: { type: 'user_message', message: 42 } },
      '{partial',
    ]
      .map((record) => (typeof record === 'string' ? record : JSON.stringify(record)))
      .join('\n');

    expect(parseCodexTranscript(transcript)).toEqual([
      { role: 'user', text: 'Implement the plan.', timestamp: '2026-07-13T01:00:00Z' },
      { role: 'assistant', text: 'Implementation complete.', timestamp: '2026-07-13T01:02:00Z' },
    ]);
  });

  test('normalizes a missing event timestamp', () => {
    const transcript = JSON.stringify({
      type: 'event_msg',
      payload: { type: 'user_message', message: 'No timestamp' },
    });
    expect(parseCodexTranscript(transcript)).toEqual([
      { role: 'user', text: 'No timestamp', timestamp: '' },
    ]);
  });
});

describe('transcript discovery', () => {
  test('selects the newest transcript whose recorded cwd belongs to the repository', async () => {
    const home = await createTemporaryDirectory();
    const sessions = join(home, 'sessions', '2026', '07', '13');
    await mkdir(sessions, { recursive: true });
    await writeFile(join(sessions, 'ignored.txt'), 'not a transcript');
    await writeFile(
      join(sessions, 'older.jsonl'),
      `${JSON.stringify({ type: 'session_meta', payload: { cwd: '/repo' } })}\n`,
    );
    await delay(10);
    await writeFile(
      join(sessions, 'unrelated.jsonl'),
      `${JSON.stringify({ type: 'session_meta', payload: { cwd: '/other' } })}\n`,
    );
    await delay(10);
    const newest = join(sessions, 'newest.jsonl');
    await writeFile(
      newest,
      `${JSON.stringify({ type: 'session_meta', payload: { cwd: '/repo/apps/api' } })}\n`,
    );

    await expect(
      findLatestTranscript({ homeDirectory: home, repositoryRoot: '/repo', source: 'codex' }),
    ).resolves.toBe(newest);
  });

  test('returns null when no transcript belongs to the repository', async () => {
    const home = await createTemporaryDirectory();
    await expect(
      findLatestTranscript({ homeDirectory: home, repositoryRoot: '/repo', source: 'claude' }),
    ).resolves.toBeNull();
  });
});

describe('handoff safety and rendering', () => {
  test('redacts common credential forms', () => {
    const apiKeyAssignment = ['API', '_KEY=', 'sk', '-test12345678901234567890'].join('');
    const authorization = ['Authorization: Bearer ', 'abc', '.def', '.ghi'].join('');
    const githubToken = ['github', '_pat_', '12345678901234567890'].join('');
    const privateKey = [
      '-----BEGIN ',
      'PRIVATE KEY-----\nprivate-material\n-----END PRIVATE KEY-----',
    ].join('');
    const input = [
      `${apiKeyAssignment} ${authorization} password: "hunter2"`,
      githubToken,
      privateKey,
    ].join('\n');
    const result = redactSecrets(input);

    expect(result.text).not.toContain('sk-test');
    expect(result.text).not.toContain('abc.def.ghi');
    expect(result.text).not.toContain('hunter2');
    expect(result.text).not.toContain('private-material');
    expect(result.text).not.toMatch(/\d+\[REDACTED\]/);
    expect(result.redactionCount).toBe(5);
  });

  test('keeps the newest six turns, preserves chronology, and caps output', () => {
    const messages = Array.from({ length: 16 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      text: `message-${index} ${'x'.repeat(900)}`,
      timestamp: `2026-07-13T01:${String(index).padStart(2, '0')}:00Z`,
    }));

    const output = renderHandoff({
      branch: 'chore/WAYLI-91-cross-tool-context-sync',
      head: '8f8457e',
      messages,
      source: 'Claude',
      status: 'clean',
    });

    expect(output.length).toBeLessThanOrEqual(8_000);
    expect(output).not.toContain('message-3 ');
    expect(output.indexOf('message-4 ')).toBeLessThan(output.indexOf('message-15 '));
    expect(output).toContain('reference-only');
  });

  test('labels missing timestamps and truncates one oversized latest message', () => {
    const output = renderHandoff({
      branch: 'main',
      head: 'abc1234',
      messages: [{ role: 'assistant', text: 'z'.repeat(10_000) }],
      source: 'Codex',
      status: 'clean',
    });

    expect(output).toContain('unknown time');
    expect(output.endsWith('[truncated]')).toBe(true);
    expect(output.length).toBeLessThanOrEqual(8_000);
  });
});

describe('hook lifecycle', () => {
  test('injects new sessions, clear, and compact but skips unchanged resumes', async () => {
    const stateDirectory = await createTemporaryDirectory();
    const input = { fingerprint: 'source-v1', sessionId: 'target-1', stateDirectory };

    await expect(shouldInject({ ...input, source: 'startup' })).resolves.toBe(true);
    await expect(shouldInject({ ...input, source: 'resume' })).resolves.toBe(false);
    await expect(shouldInject({ ...input, source: 'clear' })).resolves.toBe(true);
    await expect(shouldInject({ ...input, source: 'compact' })).resolves.toBe(true);
  });

  test('formats context using the shared SessionStart hook schema', () => {
    expect(createHookOutput('Imported context')).toEqual({
      hookSpecificOutput: {
        additionalContext: 'Imported context',
        hookEventName: 'SessionStart',
      },
    });
  });
});

describe('handoff orchestration', () => {
  test('builds a sanitized Claude handoff for Codex from the latest Wayline session', async () => {
    const claudeHome = await createTemporaryDirectory();
    const projectDirectory = join(claudeHome, 'projects', 'wayline');
    const stateDirectory = await createTemporaryDirectory();
    await mkdir(projectDirectory, { recursive: true });
    await writeFile(
      join(projectDirectory, 'session.jsonl'),
      [
        JSON.stringify({
          type: 'user',
          cwd: '/repo',
          isMeta: false,
          isSidechain: false,
          timestamp: '2026-07-13T01:00:00Z',
          message: { content: 'Use token=secret-value and password: "hunter2"', role: 'user' },
        }),
        JSON.stringify({
          type: 'assistant',
          cwd: '/repo',
          isSidechain: false,
          timestamp: '2026-07-13T01:01:00Z',
          message: {
            content: [{ type: 'text', text: 'Ready to continue.' }],
            role: 'assistant',
            stop_reason: 'end_turn',
          },
        }),
      ].join('\n'),
    );

    const result = await buildHandoff({
      claudeHome,
      codexHome: '/missing',
      lifecycle: 'startup',
      repositoryRoot: '/repo',
      sessionId: 'codex-target',
      snapshot: { branch: 'main', head: 'abc1234', status: 'clean' },
      stateDirectory,
      target: 'codex',
    });

    expect(result.context).toContain('[Cross-tool context from Claude]');
    expect(result.context).toContain('token=[REDACTED]');
    expect(result.context).toContain('password: "[REDACTED]"');
    expect(result.context).not.toContain('secret-value');
    expect(result.context).not.toContain('hunter2');
    expect(result.messageCount).toBe(2);
    expect(result.redactionCount).toBe(2);
    expect(result.sourcePath.endsWith('session.jsonl')).toBe(true);

    const unchangedResume = await buildHandoff({
      claudeHome,
      codexHome: '/missing',
      lifecycle: 'resume',
      repositoryRoot: '/repo',
      sessionId: 'codex-target',
      snapshot: { branch: 'main', head: 'abc1234', status: 'clean' },
      stateDirectory,
      target: 'codex',
    });
    expect(unchangedResume.context).toBe('');
    expect(unchangedResume.skipped).toBe(true);
  });

  test('returns an empty result when the other tool has no matching transcript', async () => {
    const home = await createTemporaryDirectory();
    const result = await buildHandoff({
      claudeHome: home,
      codexHome: home,
      lifecycle: 'startup',
      repositoryRoot: '/repo',
      sessionId: 'target',
      snapshot: { branch: 'main', head: 'abc1234', status: 'clean' },
      stateDirectory: await createTemporaryDirectory(),
      target: 'claude',
    });

    expect(result).toEqual({
      context: '',
      messageCount: 0,
      redactionCount: 0,
      skipped: true,
      sourcePath: null,
    });
  });

  test('builds Codex context for Claude and skips a transcript with no completed messages', async () => {
    const codexHome = await createTemporaryDirectory();
    const stateDirectory = await createTemporaryDirectory();
    const sessions = join(codexHome, 'sessions');
    await mkdir(sessions, { recursive: true });
    await writeFile(
      join(sessions, 'session.jsonl'),
      [
        JSON.stringify({ type: 'session_meta', payload: { cwd: '/repo' } }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-07-13T01:00:00Z',
          payload: { type: 'user_message', message: 'Codex decision' },
        }),
        JSON.stringify({
          type: 'event_msg',
          timestamp: '2026-07-13T01:01:00Z',
          payload: { type: 'agent_message', phase: 'final', message: 'Codex result' },
        }),
      ].join('\n'),
    );

    const result = await buildHandoff({
      claudeHome: '/missing',
      codexHome,
      lifecycle: 'startup',
      repositoryRoot: '/repo',
      sessionId: 'claude-target',
      snapshot: { branch: 'main', head: 'abc1234', status: 'clean' },
      stateDirectory,
      target: 'claude',
    });
    expect(result.context).toContain('[Cross-tool context from Codex]');

    await writeFile(
      join(sessions, 'session.jsonl'),
      JSON.stringify({ type: 'session_meta', payload: { cwd: '/repo' } }),
    );
    const empty = await buildHandoff({
      claudeHome: '/missing',
      codexHome,
      lifecycle: 'startup',
      repositoryRoot: '/repo',
      sessionId: 'claude-empty',
      snapshot: { branch: 'main', head: 'abc1234', status: 'clean' },
      stateDirectory,
      target: 'claude',
    });
    expect(empty.context).toBe('');
    expect(empty.sourcePath).not.toBeNull();
  });
});

describe('context sync CLI', () => {
  test('emits SessionStart JSON in hook mode and readable diagnostics in manual mode', async () => {
    const claudeHome = await createTemporaryDirectory();
    const codexHome = await createTemporaryDirectory();
    const stateDirectory = await createTemporaryDirectory();
    const repositoryRoot = process.cwd();
    const projectDirectory = join(claudeHome, 'projects', 'wayline');
    await mkdir(projectDirectory, { recursive: true });
    await writeFile(
      join(projectDirectory, 'session.jsonl'),
      [
        JSON.stringify({
          type: 'user',
          cwd: repositoryRoot,
          isMeta: false,
          isSidechain: false,
          timestamp: '2026-07-13T01:00:00Z',
          message: { content: 'Continue WAYLI-91', role: 'user' },
        }),
        JSON.stringify({
          type: 'assistant',
          cwd: repositoryRoot,
          isSidechain: false,
          timestamp: '2026-07-13T01:01:00Z',
          message: {
            content: [{ type: 'text', text: 'Context ready.' }],
            role: 'assistant',
            stop_reason: 'end_turn',
          },
        }),
      ].join('\n'),
    );
    const env = {
      ...process.env,
      AGENT_SYNC_STATE_DIR: stateDirectory,
      CLAUDE_CONFIG_DIR: claudeHome,
      CODEX_HOME: codexHome,
    };

    const hook = await runCli({
      arguments: ['--for', 'codex', '--hook'],
      cwd: repositoryRoot,
      env,
      input: JSON.stringify({
        hook_event_name: 'SessionStart',
        session_id: 'target-hook',
        source: 'startup',
      }),
    });
    const manual = await runCli({ arguments: ['--for', 'codex'], cwd: repositoryRoot, env });

    expect(hook.code).toBe(0);
    expect(JSON.parse(hook.stdout).hookSpecificOutput.additionalContext).toContain(
      'Continue WAYLI-91',
    );
    expect(manual.code).toBe(0);
    expect(manual.stdout).toContain('Source: Claude');
    expect(manual.stdout).toContain('Messages: 2');
  });
});

describe('repository snapshot', () => {
  test('reports the active branch, commit, and dirty state', () => {
    const snapshot = getRepositorySnapshot(process.cwd());

    expect(snapshot.branch.length).toBeGreaterThan(0);
    expect(snapshot.head).toMatch(/^[a-f0-9]{7,}$/);
    expect(snapshot.status).toMatch(/^(clean|dirty)$/);
  });

  test('reports clean and detached repositories', async () => {
    const repository = await createTemporaryDirectory();
    const gitEnvironment = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
    );
    const runFixtureGit = (...arguments_) =>
      execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...arguments_], {
        cwd: repository,
        env: gitEnvironment,
      });
    runFixtureGit('init');
    runFixtureGit('config', 'user.email', 'tests@wayline.local');
    runFixtureGit('config', 'user.name', 'Wayline Tests');
    await writeFile(join(repository, 'README.md'), 'fixture');
    runFixtureGit('add', 'README.md');
    runFixtureGit('commit', '-m', 'test: fixture');
    runFixtureGit('checkout', '--detach');

    const snapshot = getRepositorySnapshot(repository);
    expect(snapshot).toMatchObject({ branch: 'detached', status: 'clean' });

    await writeFile(join(repository, 'README.md'), 'changed fixture');
    expect(getRepositorySnapshot(repository).status).toBe('dirty');
  });
});
