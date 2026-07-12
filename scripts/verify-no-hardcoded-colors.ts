import path from 'node:path';
import { ESLint } from 'eslint';

const ROOT_ESLINT_CONFIG = path.resolve(import.meta.dirname, '..', 'eslint.config.js');
const COMPONENT_FIXTURE_PATH = 'packages/ui/src/components/ui/example.tsx';

const VIOLATING_CODE = `export function BadCard() {
  return <div style={{ color: '#FF0000' }}>Warning</div>;
}
`;

const COMPLIANT_CODE = `export function GoodCard() {
  return <div className="bg-warning text-warning-foreground">Warning</div>;
}
`;

interface Check {
  name: string;
  ok: boolean;
}

async function ruleMessageCount(eslint: ESLint, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath: COMPONENT_FIXTURE_PATH });
  return (result?.messages ?? []).filter((message) => message.ruleId === 'no-restricted-syntax')
    .length;
}

/** Proves the no-hardcoded-colors rule (WAYLI-24) fires — apps/dashboard has no real source yet to test it against otherwise. */
async function main(): Promise<void> {
  const eslint = new ESLint({ overrideConfigFile: ROOT_ESLINT_CONFIG });

  const violatingCount = await ruleMessageCount(eslint, VIOLATING_CODE);
  const compliantCount = await ruleMessageCount(eslint, COMPLIANT_CODE);

  const checks: Check[] = [
    { name: 'flags a hardcoded hex color in a component file', ok: violatingCount === 1 },
    { name: 'stays silent on theme-token class names', ok: compliantCount === 0 },
  ];

  for (const check of checks) {
    console.log(`${check.ok ? '✅' : '❌'} ${check.name}`);
  }

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

main();
