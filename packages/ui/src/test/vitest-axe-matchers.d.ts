import 'vitest';

// @types/jest-axe only augments Jest's Expect interface, not Vitest's — this repeats
// that augmentation for Vitest's own Assertion interface.
interface CustomMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module 'vitest' {
  // Declaration merging into an external module's interface requires re-stating it with
  // no new members of its own — an apparent no-op to a generic lint rule, but the only
  // way TypeScript lets you augment an already-declared ambient interface.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
