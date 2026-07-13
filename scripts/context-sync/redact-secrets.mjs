/** Masks common credential representations before cross-tool context injection. */
export function redactSecrets(input) {
  let redactionCount = 0;
  const patterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    /\b(Authorization\s*:\s*(?:Bearer|Basic)\s+)[^\s"']+/gi,
    /\b((?:api[_-]?key|token|secret|password|client[_-]?secret)\s*(?:=|:)\s*["']?)[^\s,"']+/gi,
    /\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{16,}\b/g,
  ];

  const text = patterns.reduce(
    (value, pattern) =>
      value.replace(pattern, (match, prefix) => {
        redactionCount += 1;
        return typeof prefix === 'string' ? `${prefix}[REDACTED]` : '[REDACTED]';
      }),
    input,
  );

  return { redactionCount, text };
}
