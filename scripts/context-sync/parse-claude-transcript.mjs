/** Extracts completed first-party conversation messages from a Claude JSONL transcript. */
export function parseClaudeTranscript(transcript) {
  return transcript.split('\n').flatMap((line) => {
    try {
      const record = JSON.parse(line);
      if (
        (record.type !== 'user' && record.type !== 'assistant') ||
        record.isMeta ||
        record.isSidechain
      ) {
        return [];
      }

      if (record.type === 'assistant' && !record.message?.stop_reason) {
        return [];
      }

      const content = record.message?.content;
      const text =
        typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .filter((item) => item?.type === 'text')
                .map((item) => item.text)
                .join('\n')
            : '';

      return text.trim()
        ? [{ role: record.type, text: text.trim(), timestamp: record.timestamp ?? '' }]
        : [];
    } catch {
      return [];
    }
  });
}
