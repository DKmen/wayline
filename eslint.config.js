import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';

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
    // One-component-per-file is mechanically enforceable only for React (dashboard/landing).
    // Everywhere else it stays a documented convention + code-review policy — see CLAUDE.md.
    files: ['apps/dashboard/**/*.{ts,tsx}', 'apps/landing/**/*.{ts,tsx}'],
    plugins: { react },
    rules: {
      'react/no-multi-comp': ['error', { ignoreStateless: true }],
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
);
