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

// Recognizable AWS Access Key ID pattern (AWS's own documentation example) — proves
// gitleaks actually flags a real secret pattern.
export const CI_GATE_PROOF_FAKE_SECRET = 'AKIAIOSFODNN7EXAMPLE';
