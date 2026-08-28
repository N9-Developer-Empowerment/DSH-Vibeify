export const RECIPE_RUN_EVENT = "dsh-vibeify:run-recipe";
export const RECIPE_STATUS_EVENT = "dsh-vibeify:recipe-status";

export function createStreamEnvelope({ id, prompt, batchSize, answerLabels = [] }) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) throw new TypeError("stream id is invalid");
  if (typeof prompt !== "string" || prompt.length < 1800) throw new TypeError("stream prompt is not detailed enough");
  if (!Number.isInteger(batchSize) || batchSize < 4 || batchSize > 12) throw new TypeError("stream batch size is invalid");
  const answers = Array.isArray(answerLabels)
    ? [...new Set(answerLabels.filter((label) => typeof label === "string").map((label) => label.trim()).filter(Boolean))].slice(-12)
    : [];
  return Object.freeze({
    id,
    title: "VIBE background refill",
    prompt,
    batchSize,
    answers: Object.freeze(answers),
    mode: "continuous-stream",
  });
}

export function createRecipeEnvelope(episode, preferenceLabels = []) {
  if (episode === null || typeof episode !== "object") throw new TypeError("recipe episode is required");
  if (typeof episode.id !== "string" || typeof episode.title !== "string" || typeof episode.studioPrompt !== "string") {
    throw new TypeError("recipe episode is incomplete");
  }
  if (episode.studioPrompt.length < 1800) throw new TypeError("recipe prompt is not detailed enough for one-click execution");
  const preferences = Array.isArray(preferenceLabels)
    ? [...new Set(preferenceLabels.filter((label) => typeof label === "string").map((label) => label.trim()).filter(Boolean))].slice(0, 6)
    : [];
  const preferencePrompt = preferences.length === 0
    ? ""
    : `\n\n## User-selected refresh priorities\nTreat these as optional priorities, not inferred facts: ${preferences.join(", ")}.`;
  return Object.freeze({
    id: episode.id,
    title: episode.title,
    prompt: `${episode.studioPrompt}${preferencePrompt}`,
    preview: Object.freeze({
      eyebrow: episode.eyebrow,
      description: episode.description,
      editorialNote: episode.editorialNote,
      features: Object.freeze([...episode.resultFeatures]),
      accent: episode.accent,
    }),
    preferences: Object.freeze(preferences),
  });
}

function status(detail) {
  window.dispatchEvent(new CustomEvent(RECIPE_STATUS_EVENT, { detail }));
}

function visible(element) {
  return element instanceof HTMLElement && element.getClientRects().length > 0;
}

function setComposerValue(composer, prompt) {
  if (composer instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(composer, prompt);
  } else {
    composer.textContent = prompt;
  }
  composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: prompt }));
  composer.dispatchEvent(new Event("change", { bubbles: true }));
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function selectedSessionSnapshot() {
  const element = document.querySelector('[role="treeitem"][aria-selected="true"]');
  if (!(element instanceof HTMLElement)) return null;
  return { element, label: element.textContent?.trim() ?? "" };
}

function sessionChanged(previous) {
  if (previous === null) return true;
  const current = selectedSessionSnapshot();
  if (current === null) return true;
  return current.element !== previous.element && current.label !== previous.label;
}

function composerIsEmpty(composer) {
  if (composer instanceof HTMLTextAreaElement) return composer.value.trim().length === 0;
  return (composer.textContent ?? "").trim().length === 0;
}

async function waitForFreshComposer(runId, currentRun, previousSession) {
  for (let attempt = 0; attempt < 40 && runId === currentRun(); attempt += 1) {
    const composer = document.querySelector('[data-composer-seat] textarea,[data-composer-seat] [contenteditable="true"]');
    const send = composer?.closest("[data-composer-seat]")?.querySelector('button[aria-label="Send message"],button[aria-label="Send"]');
    if (sessionChanged(previousSession) && visible(composer) && visible(send) && composerIsEmpty(composer)) return composer;
    await wait(100);
  }
  return null;
}

export function installRecipeRunner(ctx) {
  ctx.effect(() => {
    let runId = 0;
    const onRun = async (event) => {
      const recipe = event.detail;
      if (recipe === null || typeof recipe !== "object" || typeof recipe.prompt !== "string") return;
      runId += 1;
      const thisRun = runId;
      status({ state: "starting", id: recipe.id, title: recipe.title });
      await wait(160);
      const newSession = [...document.querySelectorAll('button[aria-label="New session"]')].find(visible);
      const existingComposer = document.querySelector("[data-composer-seat]");
      if (!(newSession instanceof HTMLElement)) {
        status({ state: existingComposer === null ? "preview" : "blocked", id: recipe.id, title: recipe.title });
        return;
      }
      const previousSession = selectedSessionSnapshot();
      newSession.click();
      const composer = await waitForFreshComposer(thisRun, () => runId, previousSession);
      if (!(composer instanceof HTMLElement) || thisRun !== runId) {
        status({ state: "blocked", id: recipe.id, title: recipe.title });
        return;
      }
      setComposerValue(composer, recipe.prompt);
      await wait(80);
      const seat = composer.closest("[data-composer-seat]");
      const send = seat?.querySelector('button[aria-label="Send message"],button[aria-label="Send"],button[type="submit"]');
      if (!(send instanceof HTMLButtonElement) || send.disabled) {
        composer.focus();
        status({ state: "ready", id: recipe.id, title: recipe.title });
        return;
      }
      send.click();
      status({ state: "submitted", id: recipe.id, title: recipe.title });
    };
    window.addEventListener(RECIPE_RUN_EVENT, onRun);
    return () => {
      runId += 1;
      window.removeEventListener(RECIPE_RUN_EVENT, onRun);
    };
  }, "dsh-vibeify: fresh-session content refill runner");
}
