// Temporary fixture proving the CI gates actually fail on real violations (WAYLI-22's
// own "Tests: intentional lint, coverage, and secret-leak failures" requirement).
// Deleted in the very next commit — do not depend on this file.

/** Intentionally untested — proves the 95% coverage threshold actually fails a build. */
export function uncoveredCiGateProof(flag: boolean): string {
  if (flag) {
    return 'a';
  }
  return 'b';
}

/** More untested surface — one small fixture wasn't enough to clear the 95% floor. */
export function uncoveredCiGateProofTwo(n: number): string {
  if (n > 100) {
    return 'huge';
  }
  if (n > 10) {
    return 'big';
  }
  if (n > 0) {
    return 'small';
  }
  return 'none';
}

/** Even more untested surface. */
export function uncoveredCiGateProofThree(n: number): number {
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    if (i % 2 === 0) {
      total += i;
    } else {
      total -= i;
    }
  }
  return total;
}

// AWS Access Key ID pattern (AKIA + 16 random alphanumeric chars) — proves gitleaks
// flags a real secret pattern. Not the well-known AWS-docs example value, which
// gitleaks' default allowlist deliberately ignores as a known placeholder.
export const CI_GATE_PROOF_FAKE_SECRET = 'AKIAQZRPMDXXVNJHK3WY';
