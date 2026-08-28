import React from "react";

import { createExperienceCatalog } from "./catalog.js";
import { createEditorialEdition } from "./editorial.js";
import {
  MAX_AUTO_RUNS_PER_VISIT,
  STREAM_BATCH_SIZE,
  createBundledStream,
  newestFirst,
  questionnaireIntroduction,
  questionnaireOptions,
  shouldStartStreamRun,
  visualEpisodeForChunk,
} from "./feed.js";
import {
  appendCachedChunks,
  getCachedStream,
  saveStreamAnswer,
} from "./content-store.js";
import {
  EDITORIAL_SETTINGS_EVENT,
  createEditorialProfile,
  loadEditorialProfile,
} from "./editorial-settings.js";
import { buildContinuousStreamPrompt } from "./stream-recipe.js";
import { appendStreamMetric } from "./stream-metrics.js";
import {
  loadExperienceState,
  reduceExperience,
  saveExperienceState,
} from "./state.js";
import { ARTWORK } from "virtual:vibeify-artwork";
import {
  VIBE_CHAT_RESULT_EVENT,
  VIBE_HOME_EVENT,
  VIBE_STREAM_CHUNKS_EVENT,
  VIBE_STREAM_STATUS_EVENT,
  installVibeStreamBridge,
  markdownFragment,
} from "./vibe-result.js";
import {
  RECIPE_RUN_EVENT,
  RECIPE_STATUS_EVENT,
  createStreamEnvelope,
  installRecipeRunner,
} from "./recipe-runner.js";

const STYLE_ID = "dsh-vibeify-experience-style";
const SLOT_ID = "vibeify-experience";
const BUNDLED_WELL_SIZE = 24;
const MIN_BACKGROUND_RUNS_PER_VISIT = 3;
const NAVIGATION_STARTED_AT = typeof performance === "undefined"
  ? 0
  : (performance.getEntriesByType?.("navigation")[0]?.startTime ?? 0);
const today = new Date();
const EDITION_KEY = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const CATALOG = createEditorialEdition(createExperienceCatalog(), EDITION_KEY);
const BUNDLED_STREAM = createBundledStream(CATALOG, EDITION_KEY, BUNDLED_WELL_SIZE);

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

function initialStream() {
  const now = Date.now();
  const cached = getCachedStream(browserStorage(), now);
  const chunks = [];
  const seen = new Set();
  // The bundled edition was authored in top-to-bottom order. Store it in the
  // opposite direction so the shared newest-first presentation restores that
  // intended opening beneath any genuinely newer cached material.
  for (const chunk of [...BUNDLED_STREAM].reverse()) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    chunks.push(Object.freeze({ ...chunk, publishedAt: now }));
  }
  for (const chunk of cached.chunks) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    chunks.push(chunk);
  }
  return Object.freeze(chunks.slice(-160));
}

function Icon({ name }) {
  const paths = {
    chat: "M4 5h16v11H8l-4 4V5zm4 5h8M8 7h8M8 13h5",
    save: "M6 3h12v18l-6-4-6 4V3z",
    check: "M5 12l4 4L19 6",
    arrow: "M5 12h14m-5-5 5 5-5 5",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="vfx-icon"><path d={paths[name]} /></svg>;
}

function Markdown({ value }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current !== null) ref.current.replaceChildren(markdownFragment(value));
  }, [value]);
  return <div ref={ref} className="vfx-markdown" />;
}

function Header({ editorialLabel, onChat, onHome }) {
  return (
    <header className="vfx-header">
      <button type="button" className="vfx-wordmark" aria-label="VIBE home and newest content" onClick={onHome}>
        <span>VIBE</span><small>newest first · edited from Chat</small>
      </button>
      <span className="vfx-edition">{editorialLabel} · {CATALOG.editorial.label}</span>
      <button type="button" className="vfx-chat" onClick={onChat}><Icon name="chat" /> Chat</button>
    </header>
  );
}

function Questionnaire({ chunk, answer, onAnswer }) {
  const options = questionnaireOptions(chunk.markdown);
  return (
    <section className="vfx-question" aria-labelledby={`vfx-title-${chunk.id}`}>
      <p>{questionnaireIntroduction(chunk.markdown)}</p>
      <div className="vfx-question-options">
        {options.map((label) => (
          <button key={label} type="button" aria-pressed={answer === label} onClick={() => onAnswer(chunk.id, label)}>
            <span>{answer === label ? <Icon name="check" /> : null}</span>{label}
          </button>
        ))}
      </div>
    </section>
  );
}

function StreamChunk({ chunk, index, saved, answer, onSave, onAnswer }) {
  const episode = visualEpisodeForChunk(CATALOG, chunk);
  const visual = episode === null || episode === undefined ? null : ARTWORK[episode.artwork];
  const isChatResult = chunk.source === "chat-directed";
  const isHero = index === 0 && !isChatResult;
  return (
    <article
      className={`vfx-chunk${isHero ? " is-hero" : ""}`}
      data-kind={chunk.kind}
      data-source={chunk.source}
      data-chunk-id={chunk.id}
      style={{ "--chunk-accent": episode?.accent ?? "#ff759f" }}
    >
      {visual !== null ? (
        <figure className="vfx-chunk-visual">
          <img
            src={visual}
            alt={episode.photo.alt}
            style={{ objectPosition: episode.photo.focalPoint }}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={index === 0 ? "high" : "auto"}
          />
          <span className="vfx-visual-shade" />
          <figcaption>Photograph · <a href={episode.photo.sourceUrl} target="_blank" rel="noreferrer">{episode.photo.photographer}</a></figcaption>
        </figure>
      ) : null}
      <div className="vfx-chunk-copy">
        <div className="vfx-chunk-heading">
          <div><span>{chunk.kind}</span><h2 id={`vfx-title-${chunk.id}`}>{chunk.title}</h2></div>
          {isChatResult ? null : (
            <button type="button" className="vfx-save" aria-label={`${saved ? "Remove" : "Save"} ${chunk.title}`} aria-pressed={saved} onClick={() => onSave(chunk.id)}>
              <Icon name={saved ? "check" : "save"} />
            </button>
          )}
        </div>
        {chunk.kind === "questionnaire"
          ? <Questionnaire chunk={chunk} answer={answer} onAnswer={onAnswer} />
          : <Markdown value={chunk.markdown} />}
        {chunk.source === "fresh-stream" ? <span className="vfx-next-page"><Icon name="arrow" /> another page in today's edit</span> : null}
        {isChatResult ? <span className="vfx-next-page"><Icon name="arrow" /> from Chat · kept out of the local content cache</span> : null}
      </div>
    </article>
  );
}

function ExperienceShell() {
  const [state, dispatch] = React.useReducer(reduceExperience, null, () => loadExperienceState(browserStorage()));
  const [chunks, setChunks] = React.useState(initialStream);
  const [editorialProfile, setEditorialProfile] = React.useState(() => loadEditorialProfile(browserStorage()));
  const [answers, setAnswers] = React.useState(() => {
    const store = getCachedStream(browserStorage());
    return Object.fromEntries(store.answers.map(({ chunkId, label }) => [chunkId, label]));
  });
  const streamRef = React.useRef(null);
  const chunksRef = React.useRef(chunks);
  const stateRef = React.useRef(state);
  const answersRef = React.useRef(answers);
  const editorialProfileRef = React.useRef(editorialProfile);
  const scheduler = React.useRef({ active: false, activeId: null, blocked: false, consumed: 0, runsStarted: 0, scrollFrame: null, directionPending: false });

  React.useEffect(() => { chunksRef.current = chunks; }, [chunks]);
  React.useEffect(() => { stateRef.current = state; }, [state]);
  React.useEffect(() => { answersRef.current = answers; }, [answers]);
  React.useEffect(() => { editorialProfileRef.current = editorialProfile; }, [editorialProfile]);

  const record = React.useCallback((event, recipeId, durationMs, source) => {
    appendStreamMetric(browserStorage(), { event, recipeId, durationMs, source });
  }, []);

  const maybeStartRun = React.useCallback(() => {
    const current = scheduler.current;
    const forceWarmWell = current.runsStarted < MIN_BACKGROUND_RUNS_PER_VISIT;
    const forceDirectionRefresh = current.directionPending;
    const policyAllows = shouldStartStreamRun({
      totalChunks: chunksRef.current.length,
      consumedChunks: current.consumed,
      active: current.active,
      runsStarted: current.runsStarted,
    });
    if (stateRef.current.view !== "home" || current.blocked || current.active || current.runsStarted >= MAX_AUTO_RUNS_PER_VISIT) return;
    if (!forceWarmWell && !forceDirectionRefresh && !policyAllows) return;
    current.runsStarted += 1;
    current.active = true;
    current.directionPending = false;
    const runId = `refill-${Date.now().toString(36)}-${current.runsStarted}`;
    current.activeId = runId;
    const answerLabels = Object.values(answersRef.current).slice(-12);
    const recentTitles = chunksRef.current.slice(-20).map(({ title }) => title);
    const chatTopics = chunksRef.current
      .filter(({ source }) => source === "chat-directed")
      .slice(-12)
      .map(({ title }) => title);
    const prompt = buildContinuousStreamPrompt({
      runId,
      batchSize: STREAM_BATCH_SIZE,
      answerLabels,
      recentTitles,
      chatTopics,
      editorialProfile: editorialProfileRef.current,
    });
    const envelope = createStreamEnvelope({ id: runId, prompt, batchSize: STREAM_BATCH_SIZE, answerLabels });
    record("buffer-run-started", runId, 0, "fresh-stream");
    window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: envelope }));
  }, [record]);

  React.useEffect(() => {
    const now = Date.now();
    appendCachedChunks(browserStorage(), chunks, now);
    const frame = window.requestAnimationFrame(() => {
      const durationMs = Math.max(0, performance.now() - NAVIGATION_STARTED_AT);
      record("home-first-frame", "home", durationMs, "bundle");
      record("feed-restored", "home", durationMs, chunks.some(({ source }) => source === "fresh-stream") ? "local-cache" : "bundle");
      document.body.dataset.vibeifyFirstFrameMs = String(Math.round(durationMs));
      window.setTimeout(maybeStartRun, 120);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    saveExperienceState(browserStorage(), state);
    document.body.dataset.vibeifyExperience = state.view;
    if (state.view === "home") window.setTimeout(maybeStartRun, 80);
    return () => delete document.body.dataset.vibeifyExperience;
  }, [maybeStartRun, state]);

  React.useEffect(() => {
    const onChunks = (event) => {
      const incoming = Array.isArray(event.detail?.chunks) ? event.detail.chunks : [];
      const appended = appendCachedChunks(browserStorage(), incoming);
      if (appended.length === 0) return;
      setChunks((current) => {
        const seen = new Set(current.map(({ id }) => id));
        const next = [...current, ...appended.filter(({ id }) => !seen.has(id))].slice(-160);
        chunksRef.current = next;
        return next;
      });
      record("chunk-appended", event.detail?.runId ?? "stream", event.detail?.durationMs ?? 0, "fresh-stream");
    };
    const onStreamStatus = (event) => {
      const current = scheduler.current;
      if (event.detail?.id !== current.activeId || event.detail?.state !== "complete") return;
      current.active = false;
      current.activeId = null;
      record("buffer-run-complete", event.detail.id, event.detail.durationMs ?? 0, "fresh-stream");
      window.setTimeout(maybeStartRun, 180);
    };
    const onRecipeStatus = (event) => {
      const current = scheduler.current;
      if (event.detail?.id !== current.activeId) return;
      if (event.detail?.state === "blocked" || event.detail?.state === "preview" || event.detail?.state === "ready") {
        current.active = false;
        current.activeId = null;
        current.blocked = true;
      }
    };
    const onChatResult = (event) => {
      const chunk = event.detail?.chunk;
      if (chunk === null || typeof chunk !== "object" || chunk.source !== "chat-directed") return;
      if (typeof chunk.id !== "string" || typeof chunk.title !== "string" || typeof chunk.markdown !== "string") return;
      setChunks((current) => {
        if (current.some(({ id }) => id === chunk.id)) return current;
        const next = [...current, chunk].slice(-160);
        chunksRef.current = next;
        return next;
      });
    };
    const onEditorialSettings = (event) => {
      const profile = createEditorialProfile(event.detail?.preset, event.detail?.customDirection ?? event.detail?.direction);
      editorialProfileRef.current = profile;
      setEditorialProfile(profile);
      scheduler.current.directionPending = true;
      record("editorial-direction-changed", "home", 0, "user");
      window.setTimeout(maybeStartRun, 80);
    };
    const onVibeHome = () => {
      dispatch({ type: "home" });
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => streamRef.current?.scrollTo({ top: 0, behavior: "smooth" })));
    };
    window.addEventListener(VIBE_CHAT_RESULT_EVENT, onChatResult);
    window.addEventListener(VIBE_STREAM_CHUNKS_EVENT, onChunks);
    window.addEventListener(VIBE_STREAM_STATUS_EVENT, onStreamStatus);
    window.addEventListener(RECIPE_STATUS_EVENT, onRecipeStatus);
    window.addEventListener(VIBE_HOME_EVENT, onVibeHome);
    window.addEventListener(EDITORIAL_SETTINGS_EVENT, onEditorialSettings);
    return () => {
      window.removeEventListener(VIBE_STREAM_CHUNKS_EVENT, onChunks);
      window.removeEventListener(VIBE_STREAM_STATUS_EVENT, onStreamStatus);
      window.removeEventListener(RECIPE_STATUS_EVENT, onRecipeStatus);
      window.removeEventListener(VIBE_CHAT_RESULT_EVENT, onChatResult);
      window.removeEventListener(VIBE_HOME_EVENT, onVibeHome);
      window.removeEventListener(EDITORIAL_SETTINGS_EVENT, onEditorialSettings);
    };
  }, [maybeStartRun, record]);

  const onScroll = React.useCallback(() => {
    const current = scheduler.current;
    if (current.scrollFrame !== null) return;
    current.scrollFrame = window.requestAnimationFrame(() => {
      current.scrollFrame = null;
      const container = streamRef.current;
      if (container === null) return;
      const cards = [...container.querySelectorAll("[data-chunk-id]")];
      const viewportBottom = container.getBoundingClientRect().bottom;
      let consumed = 0;
      for (let index = 0; index < cards.length; index += 1) {
        if (cards[index].getBoundingClientRect().top <= viewportBottom) consumed = index + 1;
      }
      if (consumed <= current.consumed) return;
      current.consumed = consumed;
      const last = cards[Math.max(0, consumed - 1)]?.dataset.chunkId;
      if (last !== undefined) dispatch({ type: "mark-read", chunkId: last });
      if (chunksRef.current.length - consumed < 14) {
        record("buffer-low-water", "home", 0, "user");
        maybeStartRun();
      }
    });
  }, [maybeStartRun, record]);

  const onAnswer = React.useCallback((chunkId, label) => {
    if (!saveStreamAnswer(browserStorage(), chunkId, label)) return;
    setAnswers((current) => ({ ...current, [chunkId]: label }));
    record("questionnaire-answered", "home", Math.max(0, performance.now() - NAVIGATION_STARTED_AT), "user");
  }, [record]);

  const onSave = React.useCallback((chunkId) => dispatch({ type: "toggle-save", chunkId }), []);
  const displayChunks = newestFirst(chunks);
  const goHome = React.useCallback(() => streamRef.current?.scrollTo({ top: 0, behavior: "smooth" }), []);

  return (
    <div className="vfx-shell" data-view={state.view}>
      {state.view === "home" ? (
        <main ref={streamRef} className="vfx-stream" onScroll={onScroll}>
          <Header editorialLabel={editorialProfile.label} onHome={goHome} onChat={() => dispatch({ type: "enter-chat" })} />
          <section className="vfx-edition-intro">
            <span>Newest first · {editorialProfile.label}</span>
            <h1>Your conversation, edited into a better view.</h1>
            <p>Completed Chat answers and the editor's discoveries arrive here at the top. Chat keeps the detailed working view.</p>
          </section>
          <div className="vfx-chunks">
            {displayChunks.map((chunk, index) => (
              <StreamChunk
                key={chunk.id}
                chunk={chunk}
                index={index}
                saved={state.savedChunkIds.includes(chunk.id)}
                answer={answers[chunk.id]}
                onSave={onSave}
                onAnswer={onAnswer}
              />
            ))}
          </div>
          <footer className="vfx-footer"><span>Older pages continue below; VIBE always returns to the newest arrival.</span><span>Creators credited · external actions stay in Chat</span></footer>
        </main>
      ) : null}
    </div>
  );
}

const CSS = `
body[data-vibeify-experience="home"] { overflow:hidden; }
body:not([data-vibeify-experience="chat"]) #dsh-vibeify-picker { display:none; }
.vfx-shell,.vfx-shell * { box-sizing:border-box; }
.vfx-shell { --ink:#fffafc; --muted:#b9adb8; position:fixed; inset:0; z-index:9990; overflow:hidden; color:var(--ink); color-scheme:dark; background:#080609; font-family:Inter,"SF Pro Display","Helvetica Neue",sans-serif; letter-spacing:-.01em; }
.vfx-shell[data-view="chat"] { pointer-events:none; background:transparent; }
.vfx-shell button { color:inherit; font:inherit; }
.vfx-shell button:focus-visible,.vfx-shell a:focus-visible { outline:2px solid #fff; outline-offset:3px; }
.vfx-icon { width:1.15em; height:1.15em; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.vfx-stream { height:100%; overflow:auto; overscroll-behavior:contain; background:radial-gradient(circle at 82% 0,rgba(132,73,145,.18),transparent 28%),linear-gradient(#080609,#0b070b 62%,#110b11); scrollbar-color:#503a49 transparent; }
.vfx-header { position:sticky; z-index:20; top:0; height:78px; padding:0 clamp(20px,4vw,68px); display:flex; align-items:center; gap:24px; border-bottom:1px solid rgba(255,255,255,.07); background:rgba(7,5,8,.89); backdrop-filter:blur(18px); }
.vfx-wordmark { padding:0; border:0; display:flex; flex-direction:column; align-items:flex-start; background:none; cursor:pointer; }
.vfx-wordmark span { font-size:24px; font-weight:900; letter-spacing:.18em; background:linear-gradient(100deg,#fff 5%,#ff88ad 55%,#9f8cff); background-clip:text; color:transparent; }
.vfx-wordmark small { color:#ab9ca7; font-size:9px; letter-spacing:.12em; text-transform:uppercase; }
.vfx-edition { margin-left:auto; color:#94858f; font-size:9px; font-weight:750; letter-spacing:.1em; text-transform:uppercase; }
.vfx-chat { min-height:39px; padding:0 16px; display:flex; align-items:center; gap:8px; border:1px solid rgba(255,255,255,.25); border-radius:999px; background:rgba(255,255,255,.06); cursor:pointer; font-size:13px; font-weight:700; }
.vfx-chat:hover { background:rgba(255,255,255,.14); }
.vfx-edition-intro { width:min(1180px,calc(100% - 40px)); margin:0 auto; padding:clamp(34px,5vw,64px) 0 clamp(34px,5vw,58px); }
.vfx-edition-intro>span { color:#ff85aa; font-size:10px; font-weight:850; letter-spacing:.16em; text-transform:uppercase; }
.vfx-edition-intro h1 { max-width:940px; margin:9px 0 13px; font-family:"Iowan Old Style",Georgia,serif; font-size:clamp(36px,5vw,70px); font-weight:500; line-height:.94; letter-spacing:-.055em; text-wrap:balance; }
.vfx-edition-intro p { max-width:720px; margin:0; color:#c7bac4; font-size:clamp(14px,1.35vw,18px); line-height:1.5; }
.vfx-chunks { width:min(1180px,calc(100% - 40px)); margin:0 auto; display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:clamp(20px,3vw,42px); }
.vfx-chunk { grid-column:span 6; min-width:0; align-self:start; overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:22px; background:linear-gradient(145deg,rgba(31,23,31,.96),rgba(16,12,17,.98)); box-shadow:0 22px 70px rgba(0,0,0,.18); }
.vfx-chunk:nth-child(5n+2),.vfx-chunk:nth-child(5n+4) { grid-column:span 5; }
.vfx-chunk:nth-child(5n+3),.vfx-chunk:nth-child(5n+5) { grid-column:span 7; }
.vfx-chunk.is-hero { grid-column:1/-1; display:grid; grid-template-columns:minmax(0,1.25fr) minmax(360px,.75fr); background:#100b10; }
.vfx-chunk[data-kind="questionnaire"] { grid-column:2/span 10; background:radial-gradient(circle at 90% 0,color-mix(in srgb,var(--chunk-accent) 22%,transparent),transparent 42%),linear-gradient(145deg,#241522,#151018); }
.vfx-chunk[data-source="chat-directed"] { grid-column:1/-1; border-color:rgba(255,133,170,.34); background:radial-gradient(circle at 100% 0,rgba(159,140,255,.16),transparent 38%),linear-gradient(145deg,#271522,#130e15); }
.vfx-chunk[data-kind="music"],.vfx-chunk[data-kind="video"] { background:linear-gradient(145deg,color-mix(in srgb,var(--chunk-accent) 12%,#201720),#100c11); }
.vfx-chunk-visual { position:relative; min-height:210px; margin:0; overflow:hidden; background:#171117; }
.vfx-chunk-visual img { width:100%; height:210px; display:block; object-fit:cover; }
.vfx-chunk.is-hero .vfx-chunk-visual,.vfx-chunk.is-hero .vfx-chunk-visual img { min-height:300px; height:100%; }
.vfx-visual-shade { position:absolute; inset:0; background:linear-gradient(0deg,rgba(5,3,6,.72),transparent 60%); }
.vfx-chunk-visual figcaption { position:absolute; right:16px; bottom:14px; color:#d7cad3; font-size:10px; }.vfx-chunk-visual a { color:#fff; }
.vfx-chunk-copy { padding:clamp(24px,3vw,42px); }
.vfx-chunk-heading { display:flex; align-items:start; justify-content:space-between; gap:24px; }
.vfx-chunk-heading span { color:var(--chunk-accent); font-size:9px; font-weight:850; letter-spacing:.14em; text-transform:uppercase; }
.vfx-chunk h2 { margin:8px 0 20px; font-family:"Iowan Old Style",Georgia,serif; font-size:clamp(30px,3.4vw,52px); font-weight:500; line-height:1; letter-spacing:-.05em; text-wrap:balance; }
.vfx-chunk.is-hero h2 { font-size:clamp(42px,5vw,76px); }
.vfx-save { width:37px; height:37px; flex:none; display:grid; place-items:center; border:1px solid rgba(255,255,255,.17); border-radius:50%; background:rgba(255,255,255,.04); cursor:pointer; }
.vfx-save[aria-pressed="true"] { color:#161016; border-color:#fff; background:#fff; }
.vfx-markdown { color:#c7bbc4; font-size:15px; line-height:1.7; }.vfx-markdown p { margin:0 0 16px; }.vfx-markdown p:last-child { margin-bottom:0; }.vfx-markdown a { color:#ffc0d4; text-decoration-color:#765466; text-underline-offset:3px; }.vfx-markdown blockquote { margin:20px 0 0; padding:18px 20px; border-left:2px solid var(--chunk-accent); border-radius:0 14px 14px 0; color:#efe5eb; background:rgba(255,255,255,.045); font-family:"Iowan Old Style",Georgia,serif; font-size:18px; }.vfx-markdown ul,.vfx-markdown ol { display:grid; gap:8px; padding-left:20px; }.vfx-markdown h1,.vfx-markdown h2,.vfx-markdown h3 { font-family:"Iowan Old Style",Georgia,serif; font-weight:500; }
.vfx-question>p { max-width:720px; margin:0 0 24px; color:#d0c3cb; line-height:1.55; }
.vfx-question-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.vfx-question-options button { min-height:54px; padding:10px 15px; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,.14); border-radius:13px; background:rgba(255,255,255,.045); cursor:pointer; text-align:left; }
.vfx-question-options button:hover { border-color:var(--chunk-accent); background:rgba(255,255,255,.08); }.vfx-question-options button[aria-pressed="true"] { border-color:var(--chunk-accent); background:color-mix(in srgb,var(--chunk-accent) 18%,#171017); }.vfx-question-options button>span { width:20px; height:20px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.25); border-radius:50%; }
.vfx-next-page { margin-top:25px; display:flex; align-items:center; gap:7px; color:#8d7e88; font-size:9px; font-weight:750; letter-spacing:.1em; text-transform:uppercase; }
.vfx-footer { width:min(1180px,calc(100% - 40px)); margin:80px auto 0; padding:32px 0 44px; display:flex; justify-content:space-between; gap:20px; border-top:1px solid rgba(255,255,255,.08); color:#766975; font-size:10px; }
@media (max-width:820px) { .vfx-edition { display:none; }.vfx-chunks { display:block; }.vfx-chunk,.vfx-chunk[data-kind="questionnaire"] { margin-bottom:24px; }.vfx-chunk.is-hero { display:block; }.vfx-chunk-visual,.vfx-chunk-visual img { min-height:280px; height:280px; }.vfx-question-options { grid-template-columns:1fr; } }
@media (max-width:560px) { .vfx-header { height:66px; padding:0 16px; }.vfx-wordmark small { display:none; }.vfx-chat { padding:0 12px; }.vfx-edition-intro,.vfx-chunks,.vfx-footer { width:calc(100% - 28px); }.vfx-edition-intro { padding-top:34px; }.vfx-edition-intro h1 { font-size:42px; }.vfx-chunk { border-radius:17px; }.vfx-chunk-copy { padding:24px 20px; }.vfx-chunk h2 { font-size:34px; }.vfx-chunk-visual,.vfx-chunk-visual img { min-height:230px; height:230px; }.vfx-footer { flex-direction:column; } }
@media (prefers-reduced-motion:reduce) { .vfx-shell * { scroll-behavior:auto!important; animation-duration:.001ms!important; transition-duration:.001ms!important; } }
`;

function installStyles(ctx) {
  ctx.effect(() => {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.getElementById(STYLE_ID)?.remove();
    document.head.appendChild(style);
    return () => style.remove();
  }, "dsh-vibeify: continuous editorial stream styles");
}

export function registerExperienceShell(ctx) {
  installStyles(ctx);
  installVibeStreamBridge(ctx);
  installRecipeRunner(ctx);
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: SLOT_ID, order: -100 }, ExperienceShell));
}
