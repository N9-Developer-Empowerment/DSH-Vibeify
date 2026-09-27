const GAME_DIRECTIVE = ":::vibe-game mochi-meadow";

/** Split only the one built-in, harmless game block from reader-authored Markdown. */
export function splitPlayableGameBlocks(markdown) {
  const source = String(markdown ?? "").replace(/\r\n?/g, "\n");
  const lines = source.split("\n");
  const parts = [];
  let pending = [];
  let fenceCharacter = null;
  let fenceLength = 0;
  const flush = () => {
    const value = pending.join("\n");
    if (value.trim() !== "") parts.push(Object.freeze({ type: "markdown", value }));
    pending = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence !== null) {
      const marker = fence[1];
      if (fenceCharacter === null) {
        fenceCharacter = marker[0];
        fenceLength = marker.length;
      } else if (marker[0] === fenceCharacter && marker.length >= fenceLength) {
        fenceCharacter = null;
        fenceLength = 0;
      }
      pending.push(line);
      continue;
    }
    if (fenceCharacter === null && line === GAME_DIRECTIVE && lines[index + 1] === ":::") {
      flush();
      parts.push(Object.freeze({ type: "game", gameId: "mochi-meadow" }));
      index += 1;
      continue;
    }
    pending.push(line);
  }
  flush();
  return Object.freeze(parts.length > 0 ? parts : [Object.freeze({ type: "markdown", value: source })]);
}

export function hasMochiMeadowBlock(markdown) {
  return splitPlayableGameBlocks(markdown).some((part) => part.type === "game");
}

export function playableGameAnchorId(chunkId) {
  const safeId = String(chunkId ?? "article").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "article";
  return `vfx-game-${safeId}`;
}

/** Opaque-origin frames may signal only a start from their own window. */
export function isMochiStartEvent(event, frameWindow) {
  return Boolean(frameWindow) && event.source === frameWindow && event.data?.type === "vibe-mochi-start";
}
