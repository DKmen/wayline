import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    // .claude/skills holds instructional markdown + third-party reference snippets
    // (see .claude/skills/THIRD_PARTY_NOTICES.md) — not application source to lint.
    ignores: [
      '**/dist/**',
      '**/.output/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/storybook-static/**',
      '.claude/skills/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Root-level config files (commitlint, this file itself, etc.) run under Node's
    // CommonJS loader — give them the Node globals ESLint's browser-leaning default lacks.
    files: ['**/*.cjs'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        exports: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    rules: {
      // No general "one function per file" rule exists (checked eslint-plugin-unicorn's
      // full rule set — nothing there); this is the one class-based analogue that does.
      'max-classes-per-file': ['error', 1],
      // Recognize the standard "destructure to omit a key" idiom (e.g. `const { x: _x, ...rest } = obj`)
      // as intentionally unused rather than flagging it.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // One-component-per-file is mechanically enforceable only for React (dashboard/landing/
    // packages/ui). Everywhere else it stays a documented convention + code-review policy —
    // see CLAUDE.md. `ignoreStateless` permits a file like Tooltip.tsx that groups several
    // small, hookless wrapper components sharing one Radix primitive's state.
    files: [
      'apps/dashboard/**/*.{ts,tsx}',
      'apps/landing/**/*.{ts,tsx}',
      'packages/ui/**/*.{ts,tsx}',
    ],
    plugins: { react, 'jsx-a11y': jsxA11y },
    settings: { react: { version: '19' } },
    rules: {
      'react/no-multi-comp': ['error', { ignoreStateless: true }],
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    // Capture code may read element metadata only, never typed values (docs/09-security-privacy.md §2) —
    // a captured `.value`/`.textContent` could carry sensitive user input into a stored step.
    files: ['apps/extension/**/lib/capture/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='value']",
          message:
            'Capture code must read element metadata only, never form-control values (docs/09-security-privacy.md §2) — remove this `.value` read.',
        },
        {
          selector: "MemberExpression[property.name='textContent']",
          message:
            'Capture code must read element metadata only, never rendered text (docs/09-security-privacy.md §2) — remove this `.textContent` read.',
        },
      ],
    },
  },
  {
    // No hardcoded hex colors in component files — proves "dashboard can consume the
    // shared theme without hardcoded component colors" (WAYLI-24) now, via packages/ui's
    // own components; the apps/dashboard and apps/landing globs are currently inert
    // (those apps have no real source yet) and activate automatically in Sprint 1+.
    files: [
      'packages/ui/src/components/**/*.tsx',
      'apps/dashboard/**/*.tsx',
      'apps/landing/**/*.astro',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Matches either an exact standalone hex literal (inline style values, e.g.
          // `'#fff'`) or a Tailwind arbitrary-value bracketed form (`bg-[#fff]`) — NOT any
          // hex-shaped substring anywhere in a string, which would false-positive on
          // ordinary copy like `title="Ref #123abc"`.
          selector: 'Literal[value=/^#([0-9a-fA-F]{3}){1,2}$|\\[#([0-9a-fA-F]{3}){1,2}\\]/]',
          message:
            'No hardcoded hex colors in component files — use a packages/ui theme token (bg-primary, text-foreground, etc.) instead (docs/05-design-system.md).',
        },
        {
          selector:
            'TemplateElement[value.raw=/^#([0-9a-fA-F]{3}){1,2}$|\\[#([0-9a-fA-F]{3}){1,2}\\]/]',
          message:
            'No hardcoded hex colors in component files — use a packages/ui theme token (bg-primary, text-foreground, etc.) instead (docs/05-design-system.md).',
        },
      ],
    },
  },
);
