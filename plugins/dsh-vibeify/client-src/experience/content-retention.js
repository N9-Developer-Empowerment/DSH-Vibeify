export const MAX_STREAM_CHUNKS = 160;
export const MAX_CHAT_VIBE_RESERVE = 96;

function protectedChatVibe(chunk) {
  return chunk?.source === "chat-directed" && chunk?.kind !== "questionnaire";
}

/**
 * Retain the newest reader material while reserving room for completed Chat
 * Vibes. The original order is preserved because presentation reverses it.
 */
export function boundReaderChunks(chunks, limit = MAX_STREAM_CHUNKS, chatReserve = MAX_CHAT_VIBE_RESERVE) {
  if (!Array.isArray(chunks)) throw new TypeError("reader chunks must be an array");
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("reader chunk limit is invalid");
  if (!Number.isInteger(chatReserve) || chatReserve < 0) throw new TypeError("Chat Vibe reserve is invalid");
  if (chunks.length <= limit) return chunks;

  const protectedIds = new Set(chunks
    .filter(protectedChatVibe)
    .slice(-Math.min(chatReserve, limit))
    .map(({ id }) => id));
  for (let index = chunks.length - 1; index >= 0 && protectedIds.size < limit; index -= 1) {
    protectedIds.add(chunks[index]?.id);
  }
  return chunks.filter(({ id }) => protectedIds.has(id));
}
