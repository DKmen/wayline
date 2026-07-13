#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';

import { buildHandoff } from './build-handoff.mjs';
import { createHookOutput } from './create-hook-output.mjs';
import { getRepositorySnapshot } from './get-repository-snapshot.mjs';

const arguments_ = process.argv.slice(2);
const targetIndex = arguments_.indexOf('--for');
const target = targetIndex >= 0 ? arguments_[targetIndex + 1] : '';
const hookMode = arguments_.includes('--hook');

if (target !== 'claude' && target !== 'codex') {
  process.stderr.write('Usage: pnpm context:sync --for <claude|codex>\n');
  process.exitCode = 2;
} else {
  try {
    const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim();
    const commonDirectory = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    }).trim();
    const hookInput = hookMode
      ? JSON.parse((await Array.fromAsync(process.stdin)).join('') || '{}')
      : {};
    const result = await buildHandoff({
      claudeHome: process.env.CLAUDE_CONFIG_DIR || resolve(homedir(), '.claude'),
      codexHome: process.env.CODEX_HOME || resolve(homedir(), '.codex'),
      lifecycle: hookInput.source || 'startup',
      repositoryRoot,
      sessionId: hookInput.session_id || `manual-${target}-${Date.now()}`,
      snapshot: getRepositorySnapshot(repositoryRoot),
      stateDirectory:
        process.env.AGENT_SYNC_STATE_DIR ||
        resolve(repositoryRoot, commonDirectory, 'agent-context-sync'),
      target,
    });

    if (hookMode) {
      if (result.context) {
        process.stdout.write(`${JSON.stringify(createHookOutput(result.context))}\n`);
      }
    } else {
      const source = target === 'codex' ? 'Claude' : 'Codex';
      process.stdout.write(
        [
          `Source: ${source}`,
          `Transcript: ${result.sourcePath ?? 'none'}`,
          `Messages: ${result.messageCount}`,
          `Redactions: ${result.redactionCount}`,
          `Injected: ${result.context ? 'yes' : 'no'}`,
          result.context ? `\n${result.context}` : '',
        ].join('\n'),
      );
    }
  } catch (error) {
    process.stderr.write(
      `Context sync skipped: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}
