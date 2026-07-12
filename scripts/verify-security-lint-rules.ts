import path from 'node:path';
import { ESLint } from 'eslint';

const ROOT_ESLINT_CONFIG = path.resolve(import.meta.dirname, '..', 'eslint.config.js');
const CAPTURE_FIXTURE_PATH = 'apps/extension/src/lib/capture/example.ts';

const VIOLATING_CODE = `export function readValue(input: HTMLInputElement) {
  return input.value;
}

export function readText(el: HTMLElement) {
  return el.textContent;
}
`;

const COMPLIANT_CODE = `export function readMetadata(el: HTMLElement) {
  return { tag: el.tagName, role: el.getAttribute('role') };
}
`;

interface Check {
  name: string;
  ok: boolean;
}

async function captureRuleMessageCount(eslint: ESLint, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath: CAPTURE_FIXTURE_PATH });
  return (result?.messages ?? []).filter((message) => message.ruleId === 'no-restricted-syntax')
    .length;
}

/** Proves the capture-value-read-ban rule (docs/09-security-privacy.md §2) fires — apps/extension/lib/capture/ has no real source yet to test it against otherwise. */
async function main(): Promise<void> {
  const eslint = new ESLint({ overrideConfigFile: ROOT_ESLINT_CONFIG });

  const violatingCount = await captureRuleMessageCount(eslint, VIOLATING_CODE);
  const compliantCount = await captureRuleMessageCount(eslint, COMPLIANT_CODE);

  const checks: Check[] = [
    { name: 'flags both .value and .textContent reads in lib/capture/', ok: violatingCount === 2 },
    { name: 'stays silent on metadata-only reads', ok: compliantCount === 0 },
  ];

  for (const check of checks) {
    console.log(`${check.ok ? '✅' : '❌'} ${check.name}`);
  }

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

main();
