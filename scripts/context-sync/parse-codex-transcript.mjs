/** Extracts user prompts and completed final responses from a Codex JSONL transcript. */
export function parseCodexTranscript(transcript) {
  return transcript
    .split('\n')
    .flatMap((line) => {
      try {
        const record = JSON.parse(line);
        if (record.type !== 'event_msg') {
          return [];
        }

        if (record.payload?.type === 'user_message' && typeof record.payload.message === 'string') {
          return [
            {
              role: 'user',
              text: record.payload.message.trim(),
              timestamp: record.timestamp ?? '',
            },
          ];
        }

        if (
          record.payload?.type === 'agent_message' &&
          record.payload.phase === 'final' &&
          typeof record.payload.message === 'string'
        ) {
          return [
            {
              role: 'assistant',
              text: record.payload.message.trim(),
              timestamp: record.timestamp ?? '',
            },
          ];
        }

        return [];
      } catch {
        return [];
      }
    })
    .filter((message) => message.text);
}
