export const MAX_STREAM_CHUNKS = 160;
export const MAX_CHAT_VIBE_RESERVE = 96;

function protectedChatVibe(chunk) {
  if (chunk?.kind === "questionnaire") return false;
  if (chunk?.source === "chat-directed") return true;
  // A semantic `chat-` envelope is emitted progressively with the generic
  // fresh-stream source, then rebuilt from the same durable envelope after a
  // relaunch. It is still reader-requested Chat material and must receive the
  // same reserve as a non-streamed completed answer.
  return chunk?.source === "fresh-stream" && String(chunk?.id ?? "").startsWith("stream:chat-");
}

function newestIds(chunks, count, predicate = () => true) {
  return chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(({ chunk }) => predicate(chunk))
    .sort((left, right) => {
      const leftTime = Number.isFinite(left.chunk?.publishedAt) ? left.chunk.publishedAt : Number.NEGATIVE_INFINITY;
      const rightTime = Number.isFinite(right.chunk?.publishedAt) ? right.chunk.publishedAt : Number.NEGATIVE_INFINITY;
      return rightTime - leftTime || right.index - left.index;
    })
    .slice(0, count)
    .map(({ chunk }) => chunk?.id);
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

  const protectedIds = new Set(newestIds(chunks, Math.min(chatReserve, limit), protectedChatVibe));
  for (const id of newestIds(chunks, limit)) {
    if (protectedIds.size >= limit) break;
    protectedIds.add(id);
  }
  return chunks.filter(({ id }) => protectedIds.has(id));
}
