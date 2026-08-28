function protocolError(message) {
  const error = new Error(message);
  error.code = "PROTOCOL";
  return error;
}

export function reconcileCompletedAnswer(streamed, completed) {
  if (typeof streamed !== "string" || typeof completed !== "string") {
    throw protocolError("codex-chatgpt: invalid progressive answer text");
  }
  if (streamed.length === 0) return completed;
  if (completed.startsWith(streamed)) return completed.slice(streamed.length);
  throw protocolError("codex-chatgpt: streamed final-answer deltas did not match the completed answer");
}

export async function* streamTurnResult(run) {
  let reasoning = "";
  let answer = "";
  let reasoningClosed = false;
  let textStarted = false;
  let textClosed = false;

  yield { type: "block-start", index: 0, blockType: "reasoning" };
  try {
    for await (const event of run.events) {
      if (event?.type === "progress") {
        if (textStarted) {
          throw protocolError("codex-chatgpt: progress arrived after final-answer streaming began");
        }
        if (typeof event.text !== "string" || event.text.length === 0) continue;
        reasoning += event.text;
        yield { type: "reasoning-delta", index: 0, text: event.text };
        continue;
      }
      if (event?.type !== "answer") {
        throw protocolError("codex-chatgpt: invalid progressive turn event");
      }
      if (typeof event.text !== "string" || event.text.length === 0) continue;
      if (!textStarted) {
        yield { type: "block-end", index: 0, block: { type: "reasoning", text: reasoning } };
        reasoningClosed = true;
        yield { type: "block-start", index: 1, blockType: "text" };
        textStarted = true;
      }
      answer += event.text;
      yield { type: "text-delta", index: 1, text: event.text };
    }

    const completed = await run.result;
    if (!textStarted) {
      yield { type: "block-end", index: 0, block: { type: "reasoning", text: reasoning } };
      reasoningClosed = true;
      yield { type: "block-start", index: 1, blockType: "text" };
      textStarted = true;
    }
    const tail = reconcileCompletedAnswer(answer, completed);
    if (tail.length > 0) {
      answer += tail;
      yield { type: "text-delta", index: 1, text: tail };
    }
    yield { type: "block-end", index: 1, block: { type: "text", text: answer } };
    textClosed = true;
  } catch (error) {
    if (!reasoningClosed) {
      yield { type: "block-end", index: 0, block: { type: "reasoning", text: reasoning } };
    } else if (textStarted && !textClosed) {
      yield { type: "block-end", index: 1, block: { type: "text", text: answer } };
    }
    throw error;
  }
}
