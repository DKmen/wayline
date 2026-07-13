/** Builds the shared SessionStart context-injection payload for Claude and Codex. */
export function createHookOutput(additionalContext) {
  return {
    hookSpecificOutput: {
      additionalContext,
      hookEventName: 'SessionStart',
    },
  };
}
