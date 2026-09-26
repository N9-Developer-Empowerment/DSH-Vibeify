import React from "react";
import { APPEARANCE_OPEN_EVENT, APPEARANCE_SETTINGS_EVENT, MAGAZINE_UPDATE_EVENT, createAppearanceProfile, loadAppearanceProfile } from "./appearance-settings.js";

import { createExperienceCatalog } from "./catalog.js";
import { createEditorialEdition } from "./editorial.js";
import {
  GENERATED_STREAM_BATCH_SIZE,
  contentLinkForMarkdown,
  createBundledStream,
  createInstantUpdateChunks,
  newestFirst,
  markdownWithoutLeadVisual,
  panelLayoutForChunk,
  questionnaireIntroduction,
  questionnaireOptions,
  remoteVisualForMarkdown,
  remoteVisualsForMarkdown,
  visualMediaForChunk,
  storyCoverForChunk,
} from "./feed.js";
import {
  CONTENT_STORE_KEY,
  MAX_STREAM_CHUNKS,
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
import {
  MAX_VIBE_LIBRARY_QUERY,
  searchableVibeChunks,
  vibeLibrarySummary,
} from "./vibe-library.js";
import { ARTWORK } from "virtual:vibeify-artwork";
import {
  VIBE_CHAT_RESULT_EVENT,
  VIBE_CHAT_EVENT,
  VIBE_HOME_EVENT,
  VIBE_STREAM_CHUNKS_EVENT,
  installVibeStreamBridge,
  markdownHasTable,
  markdownFragment,
} from "./vibe-result.js";
import {
  RECIPE_RUN_EVENT,
  RECIPE_STATUS_EVENT,
  RECIPE_STOP_EVENT,
  createStreamEnvelope,
  installRecipeRunner,
} from "./recipe-runner.js";
import {
  PULL_REFRESH_THRESHOLD,
  TRACKPAD_PULL_SETTLE_MS,
  createPullRefreshState,
  createTrackpadPullRefreshState,
  reducePullRefresh,
  reduceTrackpadPullRefresh,
} from "./refresh-control.js";
import { installThreadMagazineBridge } from "./thread-magazine.js";
import { installBackgroundEditor } from "./background-editor.js";
import { appendLearningEvent } from "./learning-store.js";
import {
  consumeApprovedPages,
  consumeCandidatePages,
  markVibeActivity,
} from "./reserve-store.js";
import { clickToLoadMedia } from "./media-embed.js";
import {
  beginSharePreview,
  copyPublicShareUrl,
  publicShareUrl,
  sharePublicUrl,
  shareSnapshotForChunk,
} from "./share-client.js";
import {
  mediaFromVisualCandidate,
  publicVisualBriefForChunk,
  readVisualCache,
  searchVisualForChunk,
  writeVisualCache,
  visualImageLoads,
  generateVisualForChunk,
} from "./visual-source-client.js";
import {
  boundMagazinePresentation,
  composeOpeningStream,
  createWelcomeEdition,
} from "./welcome-edition.js";

const STYLE_ID = "dsh-vibeify-experience-style";
const SLOT_ID = "vibeify-experience";
const BUNDLED_WELL_SIZE = 24;
const NAVIGATION_STARTED_AT = typeof performance === "undefined"
  ? 0
  : (performance.getEntriesByType?.("navigation")[0]?.startTime ?? 0);
const today = new Date();
const EDITION_KEY = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const CATALOG = createEditorialEdition(createExperienceCatalog(), EDITION_KEY);
const BUNDLED_STREAM = createBundledStream(CATALOG, EDITION_KEY, BUNDLED_WELL_SIZE);
const WELCOME_STREAM = createWelcomeEdition(CATALOG);

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

function initialStream() {
  const now = Date.now();
  const cached = getCachedStream(browserStorage(), now);
  const profile = loadEditorialProfile(browserStorage());
  return composeOpeningStream({
    cached: cached.chunks,
    bundle: BUNDLED_STREAM,
    welcome: WELCOME_STREAM,
    includeOrientation: profile.customDirection === "" && profile.tribes.length === 1 && profile.tribes[0] === "global-curious" && cached.chunks.length === 0,
    now,
    dynamicLimit: MAX_STREAM_CHUNKS,
  });
}

function Icon({ name }) {
  const paths = {
    chat: "M4 5h16v11H8l-4 4V5zm4 5h8M8 7h8M8 13h5",
    save: "M6 3h12v18l-6-4-6 4V3z",
    share: "M12 3v12m-4-8 4-4 4 4M5 11v9h14v-9",
    search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5 12 4 4",
    check: "M5 12l4 4L19 6",
    arrow: "M5 12h14m-5-5 5 5-5 5",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="vfx-icon"><path d={paths[name]} /></svg>;
}

function Markdown({ value, title, onLink }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current !== null) ref.current.replaceChildren(markdownFragment(value, title));
  }, [title, value]);
  return <div ref={ref} className="vfx-markdown" onClick={(event) => {
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (link !== null) onLink?.(link.href);
  }} />;
}

function PublicLinkShare({ url, title, label = "Share link" }) {
  const safeUrl = publicShareUrl(url);
  const [open, setOpen] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const inputRef = React.useRef(null);
  const nativeShareAvailable = typeof navigator !== "undefined" && typeof navigator.share === "function";
  if (safeUrl === null) return null;

  const selectLink = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };
  const copy = async () => {
    const copied = await copyPublicShareUrl(safeUrl);
    if (copied) {
      setNotice("Link copied.");
      return;
    }
    setNotice("Copy is unavailable. Select the link below to copy it.");
    selectLink();
  };
  const share = async () => {
    const result = await sharePublicUrl(safeUrl, title);
    setNotice(result === "cancelled"
      ? "Sharing cancelled. The link is still available below."
      : result === "unavailable"
        ? "The share sheet could not open. Select or copy the link below."
        : "The share sheet closed. Check the destination if you chose one.");
    if (result === "unavailable") selectLink();
  };

  return (
    <div className="vfx-public-share">
      <button type="button" className="vfx-share" aria-expanded={open} onClick={() => { setOpen((value) => !value); setNotice(""); }}>
        <Icon name="share" /> {label}
      </button>
      {open ? (
        <div className="vfx-share-link-panel" aria-label="Share this public link">
          <label>
            <span>Public link</span>
            <input ref={inputRef} type="url" readOnly value={safeUrl} onFocus={(event) => event.currentTarget.select()} onClick={(event) => event.currentTarget.select()} />
          </label>
          <div>
            {nativeShareAvailable ? <button type="button" onClick={share}>Share…</button> : null}
            <button type="button" onClick={copy}>Copy link</button>
          </div>
          {notice === "" ? null : <p role="status">{notice}</p>}
        </div>
      ) : null}
    </div>
  );
}

function Header({ editorialLabel, updateState, libraryOpen, onChat, onHome, onFind, onUpdate, onStop }) {
  const updating = updateState === "starting" || updateState === "submitted" || updateState === "stopping";
  return (
    <header className="vfx-header">
      <button type="button" className="vfx-wordmark" aria-label="VIBE home and newest content" onClick={onHome}>
        <span>VIBE</span><small>one magazine · all completed chats</small>
      </button>
      <span className="vfx-edition">{editorialLabel} · {CATALOG.editorial.label}</span>
      <button type="button" className="vfx-find" aria-pressed={libraryOpen} onClick={onFind}><Icon name="search" /> Find Vibes</button>
      <button
        type="button"
        className={`vfx-update${updating ? " is-active" : ""}`}
        onClick={updating ? onStop : onUpdate}
        aria-label={updating ? "Stop Vibe magazine update" : "Update Vibe magazine"}
      >
        {updateState === "stopping" ? "Stopping…" : updating ? "Stop update" : "Update"}
      </button>
      <button type="button" className="vfx-find vfx-settings" onClick={() => window.dispatchEvent(new CustomEvent(APPEARANCE_OPEN_EVENT))}>Look & feel</button>
      <button type="button" className="vfx-chat" onClick={onChat}><Icon name="chat" /> Chat</button>
    </header>
  );
}

function Questionnaire({ chunk, answer, onAnswer, onLink }) {
  const options = questionnaireOptions(chunk.markdown);
  return (
    <section className="vfx-question" aria-labelledby={`vfx-title-${chunk.id}`}>
      <Markdown value={questionnaireIntroduction(chunk.markdown)} title={chunk.title} onLink={onLink} />
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

function InlineVisuals({ visuals, title, onOpen }) {
  if (!Array.isArray(visuals) || visuals.length === 0) return null;
  return (
    <div className="vfx-inline-visuals" aria-label={`More photographs for ${title}`}>
      {visuals.map((visual) => (
        <figure key={visual.imageUrl}>
          <img
            src={visual.imageUrl}
            alt={visual.alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(event) => { event.currentTarget.closest("figure")?.setAttribute("hidden", ""); }}
          />
          <figcaption><a href={visual.sourceUrl} target="_blank" rel="noreferrer" onClick={onOpen}>{visual.credit}</a></figcaption>
        </figure>
      ))}
    </div>
  );
}

function StreamChunk({ chunk, index, visualOverride, visualStatus, failedVisuals, onVisualFailure, saved, answer, skipped, shareStatus, clickToLoad, onSave, onAnswer, onEngage, onSkip, onShare, onChat }) {
  const fallbackMedia = visualMediaForChunk(CATALOG, chunk);
  const enhancedMedia = mediaFromVisualCandidate(visualOverride, fallbackMedia?.episode?.artwork, fallbackMedia?.mode);
  const proposedMedia = enhancedMedia === null ? fallbackMedia : Object.freeze({ ...enhancedMedia, episode: fallbackMedia?.episode });
  const media = failedVisuals.has(proposedMedia?.externalUrl) ? storyCoverForChunk(chunk) : proposedMedia;
  const contentLink = contentLinkForMarkdown(chunk.markdown);
  const episode = media?.episode;
  const visual = media === null ? null : (media.externalUrl ?? ARTWORK[media.artwork]);
  const isChatResult = chunk.source === "chat-directed";
  const isWelcome = chunk.source === "welcome";
  const isHero = index === 0;
  const hasTable = markdownHasTable(chunk.markdown);
  const layout = panelLayoutForChunk(chunk, index);
  const [playerOpen, setPlayerOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const isLongRead = chunk.kind !== "questionnaire" && markdownWithoutLeadVisual(chunk.markdown).length > 1600;
  const player = clickToLoad ? clickToLoadMedia(chunk.markdown) : null;
  const shareUrl = contentLink?.href ?? player?.href ?? null;
  const shareLabel = contentLink === null && player !== null ? "Share media link" : "Share link";
  const inlineVisuals = (remoteVisualsForMarkdown(chunk.markdown) ?? []).slice(1, 3);
  return (
    <article
      className={`vfx-chunk${isHero ? " is-hero" : ""}`}
      data-kind={chunk.kind}
      data-source={chunk.source}
      data-layout={layout}
      data-has-table={hasTable}
      data-expanded={isLongRead && expanded}
      data-visual-kind={media?.kind}
      data-visual-mode={media?.mode}
      data-chunk-id={chunk.id}
      style={{ "--chunk-accent": episode?.accent ?? "#ff759f" }}
    >
      {visual !== null ? (
        <figure className="vfx-chunk-visual">
          <img
            src={visual}
            alt={media.alt}
            style={{ objectPosition: media.focalPoint }}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            fetchpriority={index === 0 ? "high" : "auto"}
            referrerPolicy="no-referrer"
            onError={() => { if (media.externalUrl?.startsWith("https://")) onVisualFailure(media.externalUrl); }}
          />
          <span className="vfx-visual-shade" />
          <figcaption><a href={media.href} target="_blank" rel="noreferrer" onClick={() => onEngage(chunk, "opened")}>{media.label}</a></figcaption>
        </figure>
      ) : null}
      <div className="vfx-chunk-copy">
        {media?.kind === "typography" && visualStatus ? <p role="status" className="vfx-visual-status">{visualStatus}</p> : null}
        <div className="vfx-chunk-heading">
          <div><span>{chunk.kind}</span><h2 id={`vfx-title-${chunk.id}`}>{chunk.title}</h2></div>
          {isChatResult ? null : (
            <button type="button" className="vfx-save" aria-label={`${saved ? "Remove" : "Save"} ${chunk.title}`} aria-pressed={saved} onClick={() => onSave(chunk.id)}>
              <Icon name={saved ? "check" : "save"} />
            </button>
          )}
        </div>
        {chunk.kind === "questionnaire"
          ? <Questionnaire chunk={chunk} answer={answer} onAnswer={onAnswer} onLink={() => onEngage(chunk, "opened")} />
          : <>
            <div id={`vfx-reading-${chunk.id}`} className={`vfx-reading${isLongRead && !expanded ? " is-excerpt" : ""}`} onFocusCapture={() => { if (isLongRead) setExpanded(true); }}>
              <Markdown value={markdownWithoutLeadVisual(chunk.markdown)} title={chunk.title} onLink={() => onEngage(chunk, "opened")} />
            </div>
            {isLongRead ? <button type="button" className="vfx-read-more" aria-expanded={expanded} aria-controls={`vfx-reading-${chunk.id}`} onClick={(event) => {
              const card = event.currentTarget.closest("article");
              setExpanded(!expanded);
              if (expanded) window.requestAnimationFrame(() => card?.scrollIntoView({ block: "start" }));
            }}>{expanded ? "Back to magazine view" : "Read full article"}<Icon name="arrow" /></button> : null}
          </>}
        {chunk.kind === "questionnaire" ? null : <InlineVisuals visuals={inlineVisuals} title={chunk.title} onOpen={() => onEngage(chunk, "opened")} />}
        {player === null ? null : playerOpen ? (
          <div className="vfx-player" data-media-provider={player.provider}>
            <iframe title={`${player.kind} player for ${chunk.title}`} src={player.src} loading="lazy" allow="encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" />
          </div>
        ) : (
          <button type="button" className="vfx-media-button" onClick={() => { setPlayerOpen(true); onEngage(chunk, "played"); }}>{player.label}</button>
        )}
        {chunk.source === "fresh-stream" ? <span className="vfx-next-page"><Icon name="arrow" /> from an explicit magazine update</span> : null}
        {isChatResult ? <span className="vfx-next-page"><Icon name="arrow" /> completed in Chat · shared locally across threads</span> : null}
        {chunk.kind === "questionnaire" ? null : (
          <div className="vfx-card-actions">
            {contentLink === null ? null : (
              <a className="vfx-source-link" href={contentLink.href} target="_blank" rel="noreferrer" onClick={() => onEngage(chunk, "opened")}>
                <span>Read source</span><strong>{contentLink.label}</strong><Icon name="arrow" />
              </a>
            )}
            <div className="vfx-reader-actions">
              <PublicLinkShare url={shareUrl} title={chunk.title} label={shareLabel} />
              {isWelcome ? <button type="button" className="vfx-chat-cta" onClick={onChat}><Icon name="chat" /> Ask Chat to make a Vibe</button> : null}
              <button
                type="button"
                className="vfx-share"
                disabled={shareStatus === "opening"}
                onClick={() => onShare(chunk, { media, inlineVisuals, contentLink, embeddedMedia: player })}
              >
                <Icon name="share" />
                {{ opening: "Opening preview…", transferred: "Preview ready", blocked: "Allow pop-up to share", "timed-out": "Try sharing again", invalid: "Share unavailable" }[shareStatus] ?? "Preview and share"}
              </button>
              {isChatResult || isWelcome ? null : <button type="button" className="vfx-skip" aria-pressed={skipped} disabled={skipped} onClick={() => onSkip(chunk)}>{skipped ? "Noted" : "Not for me"}</button>}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function ExperienceShell({ codexFeatures, connection }) {
  const [state, dispatch] = React.useReducer(reduceExperience, null, () => loadExperienceState(browserStorage()));
  const [chunks, setChunks] = React.useState(initialStream);
  const [editorialProfile, setEditorialProfile] = React.useState(() => loadEditorialProfile(browserStorage()));
  const [appearance, setAppearance] = React.useState(() => loadAppearanceProfile(browserStorage()));
  const [updateState, setUpdateState] = React.useState("idle");
  const [pullDistance, setPullDistance] = React.useState(0);
  const [skipped, setSkipped] = React.useState(() => new Set());
  const [shareState, setShareState] = React.useState(() => ({ chunkId: null, status: "idle" }));
  const [visualStatus, setVisualStatus] = React.useState(() => new Map());
  const [failedVisuals, setFailedVisuals] = React.useState(() => new Set());
  const onVisualFailure = React.useCallback((url) => setFailedVisuals((current) => current.has(url) ? current : new Set([...current, url])), []);
  const [visualOverrides, setVisualOverrides] = React.useState(() => readVisualCache(browserStorage()));
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [libraryQuery, setLibraryQuery] = React.useState("");
  const [answers, setAnswers] = React.useState(() => {
    const store = getCachedStream(browserStorage());
    return Object.fromEntries(store.answers.map(({ chunkId, label }) => [chunkId, label]));
  });
  const streamRef = React.useRef(null);
  const chunksRef = React.useRef(chunks);
  const stateRef = React.useRef(state);
  const answersRef = React.useRef(answers);
  const editorialProfileRef = React.useRef(editorialProfile);
  const scheduler = React.useRef({ active: false, activeId: null, consumed: 0, runsStarted: 0, scrollFrame: null });
  const touchPull = React.useRef(createPullRefreshState());
  const trackpadPull = React.useRef(createTrackpadPullRefreshState());
  const trackpadSettleTimer = React.useRef(null);
  const visualCapability = React.useRef("unknown");

  React.useEffect(() => { chunksRef.current = chunks; }, [chunks]);
  React.useEffect(() => { stateRef.current = state; }, [state]);
  React.useEffect(() => { answersRef.current = answers; }, [answers]);
  React.useEffect(() => { editorialProfileRef.current = editorialProfile; }, [editorialProfile]);

  const record = React.useCallback((event, recipeId, durationMs, source) => {
    appendStreamMetric(browserStorage(), { event, recipeId, durationMs, source });
  }, []);

  const startRun = React.useCallback(() => {
    const current = scheduler.current;
    if (stateRef.current.view !== "home" || current.active) return;
    current.runsStarted += 1;
    current.active = true;
    const runId = `refill-${Date.now().toString(36)}-${current.runsStarted}`;
    current.activeId = runId;
    setUpdateState("starting");
    markVibeActivity(browserStorage());
    const answerLabels = Object.values(answersRef.current).slice(-12);
    const recentTitles = chunksRef.current.slice(-20).map(({ title }) => title);
    const instantChunks = createInstantUpdateChunks(CATALOG, runId, recentTitles).filter(({ kind }) => kind === "questionnaire");
    const approved = consumeApprovedPages(browserStorage(), 6, Date.now(), editorialProfileRef.current);
    const nativeCandidates = codexFeatures ? [] : consumeCandidatePages(browserStorage(), Math.max(0, 6 - approved.length), Date.now(), editorialProfileRef.current);
    const reservedChunks = [...approved, ...nativeCandidates].map((page, index) => Object.freeze({
      id: `reserve:${page.id}`,
      kind: page.kind,
      title: page.title,
      markdown: page.markdown,
      topicId: null,
      source: "radar-reserve",
      tribes: page.tribes,
      publishedAt: Date.now() + index,
    }));
    window.dispatchEvent(new CustomEvent(VIBE_STREAM_CHUNKS_EVENT, {
      detail: { runId, chunks: [...reservedChunks, ...instantChunks], durationMs: 0, source: "instant-reserve" },
    }));
    if (reservedChunks.length >= 4) {
      current.active = false;
      current.activeId = null;
      setUpdateState("complete");
      record("magazine-update-complete", runId, 0, "local-cache");
      return;
    }
    const chatTopics = chunksRef.current
      .filter(({ source }) => source === "chat-directed")
      .slice(-12)
      .map(({ title }) => title);
    const recentMediaUrls = chunksRef.current
      .map(({ markdown }) => remoteVisualForMarkdown(markdown)?.imageUrl)
      .filter(Boolean)
      .slice(-80);
    const prompt = buildContinuousStreamPrompt({
      runId,
      batchSize: GENERATED_STREAM_BATCH_SIZE,
      answerLabels,
      recentTitles: [...recentTitles, ...instantChunks.map(({ title }) => title)],
      chatTopics,
      recentMediaUrls,
      editorialProfile: editorialProfileRef.current,
    });
    const envelope = createStreamEnvelope({ id: runId, prompt, batchSize: GENERATED_STREAM_BATCH_SIZE, answerLabels });
    record("magazine-update-started", runId, 0, "fresh-stream");
    window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: envelope }));
  }, [codexFeatures, record]);

  React.useEffect(() => {
    const onAppearance = (event) => setAppearance(createAppearanceProfile(event.detail));
    const onUpdate = () => {
      stateRef.current = { ...stateRef.current, view: "home" };
      dispatch({ type: "home" });
      setLibraryOpen(false);
      startRun();
    };
    const onStorageAppearance = (event) => { if (event.key === "dsh-vibeify.appearance.v1" || event.key === null) setAppearance(loadAppearanceProfile(browserStorage())); };
    window.addEventListener(APPEARANCE_SETTINGS_EVENT, onAppearance);
    window.addEventListener(MAGAZINE_UPDATE_EVENT, onUpdate);
    window.addEventListener("storage", onStorageAppearance);
    return () => {
      window.removeEventListener(APPEARANCE_SETTINGS_EVENT, onAppearance);
      window.removeEventListener(MAGAZINE_UPDATE_EVENT, onUpdate);
      window.removeEventListener("storage", onStorageAppearance);
    };
  }, [startRun]);

  const stopRun = React.useCallback(() => {
    const current = scheduler.current;
    if (!current.active || current.activeId === null) return;
    setUpdateState("stopping");
    window.dispatchEvent(new CustomEvent(RECIPE_STOP_EVENT, { detail: { id: current.activeId } }));
  }, []);

  React.useEffect(() => {
    const now = Date.now();
    appendCachedChunks(browserStorage(), chunks, now);
    const frame = window.requestAnimationFrame(() => {
      const durationMs = Math.max(0, performance.now() - NAVIGATION_STARTED_AT);
      record("home-first-frame", "home", durationMs, "bundle");
      record("feed-restored", "home", durationMs, chunks.some(({ source }) => source === "fresh-stream") ? "local-cache" : "bundle");
      document.body.dataset.vibeifyFirstFrameMs = String(Math.round(durationMs));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  React.useEffect(() => {
    if (state.view !== "home" || connection?.rpc?.call === undefined) return undefined;
    let active = true;
    const run = async () => {
      if (visualCapability.current === "unknown") {
        try {
          const result = await connection.rpc.call("/dsh-visuals", "capabilities", {});
          visualCapability.current = result?.ok === true ? "available" : "unavailable";
        } catch {
          visualCapability.current = "unavailable";
        }
      }
      if (!active || visualCapability.current !== "available") return;
      const selected = new Map([...readVisualCache(browserStorage()), ...visualOverrides]);
      for (const [id, item] of selected) if (failedVisuals.has(item.imageUrl)) selected.delete(id);
      const excluded = new Set([
        ...failedVisuals,
        ...selected.values().map(({ imageUrl }) => imageUrl),
        ...chunks.flatMap(({ markdown }) => (remoteVisualsForMarkdown(markdown) ?? []).map(({ imageUrl }) => imageUrl)),
      ]);
      const targets = newestFirst(chunks).filter((chunk) =>
        publicVisualBriefForChunk(chunk) !== null
        && (remoteVisualForMarkdown(chunk.markdown) === null || failedVisuals.has(remoteVisualForMarkdown(chunk.markdown)?.imageUrl))
        && !selected.has(chunk.id));
      const illustrationQueue = [];
      for (const chunk of targets) {
        if (!active) return;
        setVisualStatus((current) => new Map(current).set(chunk.id, "Finding a photograph…"));
        const candidates = await searchVisualForChunk(connection, chunk, [...excluded]);
        let visual;
        for (const candidate of candidates) {
          if (!active) return;
          if (await visualImageLoads(candidate.imageUrl)) { visual = candidate; break; }
          excluded.add(candidate.imageUrl);
        }
        if (visual === undefined) {
          illustrationQueue.push(chunk);
          continue;
        }
        selected.set(chunk.id, visual);
        excluded.add(visual.imageUrl);
        writeVisualCache(browserStorage(), chunk.id, visual);
        if (active) setVisualOverrides((current) => new Map(current).set(chunk.id, visual));
      }
      // Finish photograph recovery for the whole issue before slow generation.
      for (const chunk of illustrationQueue) {
        if (!active) return;
        if (codexFeatures) setVisualStatus((current) => new Map(current).set(chunk.id, "Creating an illustration…"));
        const generated = codexFeatures ? await generateVisualForChunk(connection, chunk) : null;
        if (generated !== null && await visualImageLoads(generated.imageUrl)) {
          if (chunksRef.current.some(({ id }) => id === chunk.id)) setVisualOverrides((current) => new Map(current).set(chunk.id, generated));
        } else if (active) {
          setVisualStatus((current) => new Map(current).set(chunk.id, "Image still needed. Try Update again later."));
        }
      }
    };
    run();
    return () => { active = false; };
  }, [chunks, connection, state.view, failedVisuals]);

  React.useEffect(() => {
    saveExperienceState(browserStorage(), state);
    document.body.dataset.vibeifyExperience = state.view;
    return () => delete document.body.dataset.vibeifyExperience;
  }, [state]);

  React.useEffect(() => {
    if (state.view === "home") markVibeActivity(browserStorage());
  }, [state.view]);

  React.useEffect(() => {
    const onChunks = (event) => {
      const incoming = Array.isArray(event.detail?.chunks) ? event.detail.chunks : [];
      appendCachedChunks(browserStorage(), incoming);
      const acceptedIds = new Set(getCachedStream(browserStorage()).chunks.map(({ id }) => id));
      const accepted = incoming.filter(({ id }) => acceptedIds.has(id));
      if (accepted.length === 0) return;
      setChunks((current) => {
        const seen = new Set(current.map(({ id }) => id));
        const next = boundMagazinePresentation([...current, ...accepted.filter(({ id }) => !seen.has(id))], MAX_STREAM_CHUNKS);
        chunksRef.current = next;
        return next;
      });
      record("chunk-appended", event.detail?.runId ?? "stream", event.detail?.durationMs ?? 0, "fresh-stream");
    };
    const onRecipeStatus = (event) => {
      const current = scheduler.current;
      if (event.detail?.id !== current.activeId) return;
      const nextState = event.detail?.state;
      if (["starting", "submitted", "stopping"].includes(nextState)) {
        setUpdateState(nextState);
        return;
      }
      if (["complete", "stopped", "timed-out", "busy", "error"].includes(nextState)) {
        if (nextState === "complete") record("magazine-update-complete", event.detail.id, event.detail.durationMs ?? 0, "fresh-stream");
        current.active = false;
        current.activeId = null;
        setUpdateState(nextState);
      }
    };
    const onChatResult = (event) => {
      const chunk = event.detail?.chunk;
      if (chunk === null || typeof chunk !== "object" || chunk.source !== "chat-directed") return;
      if (typeof chunk.id !== "string" || typeof chunk.title !== "string" || typeof chunk.markdown !== "string") return;
      const accepted = appendCachedChunks(browserStorage(), [chunk])[0];
      if (accepted === undefined) return;
      setChunks((current) => {
        if (current.some(({ id }) => id === accepted.id)) return current;
        const next = boundMagazinePresentation([...current, accepted], MAX_STREAM_CHUNKS);
        chunksRef.current = next;
        return next;
      });
    };
    const onEditorialSettings = (event) => {
      const profile = createEditorialProfile(event.detail);
      editorialProfileRef.current = profile;
      setEditorialProfile(profile);
      setChunks((current) => current.filter(({ source }) => source !== "welcome" && source !== "bundle"));
      record("editorial-direction-changed", "home", 0, "user");
    };
    const onStorage = (event) => {
      if (event.key !== CONTENT_STORE_KEY && event.key !== null) return;
      const cached = getCachedStream(browserStorage()).chunks;
      setChunks((current) => {
        const seen = new Set(current.map(({ id }) => id));
        const next = boundMagazinePresentation([...current, ...cached.filter(({ id }) => !seen.has(id))], MAX_STREAM_CHUNKS);
        chunksRef.current = next;
        return next;
      });
    };
    const onVibeHome = () => {
      setLibraryOpen(false);
      setLibraryQuery("");
      dispatch({ type: "home" });
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => streamRef.current?.scrollTo({ top: 0, behavior: "smooth" })));
    };
    window.addEventListener(VIBE_CHAT_RESULT_EVENT, onChatResult);
    window.addEventListener(VIBE_STREAM_CHUNKS_EVENT, onChunks);
    window.addEventListener(RECIPE_STATUS_EVENT, onRecipeStatus);
    window.addEventListener(VIBE_HOME_EVENT, onVibeHome);
    window.addEventListener(EDITORIAL_SETTINGS_EVENT, onEditorialSettings);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(VIBE_STREAM_CHUNKS_EVENT, onChunks);
      window.removeEventListener(RECIPE_STATUS_EVENT, onRecipeStatus);
      window.removeEventListener(VIBE_CHAT_RESULT_EVENT, onChatResult);
      window.removeEventListener(VIBE_HOME_EVENT, onVibeHome);
      window.removeEventListener(EDITORIAL_SETTINGS_EVENT, onEditorialSettings);
      window.removeEventListener("storage", onStorage);
    };
  }, [record]);

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
    });
  }, []);

  const onTouchStart = React.useCallback((event) => {
    if (trackpadSettleTimer.current !== null) window.clearTimeout(trackpadSettleTimer.current);
    trackpadSettleTimer.current = null;
    trackpadPull.current = createTrackpadPullRefreshState();
    const y = event.touches?.[0]?.clientY;
    touchPull.current = reducePullRefresh(touchPull.current, { type: "start", y, atTop: (streamRef.current?.scrollTop ?? 1) <= 0 });
  }, []);
  const onTouchMove = React.useCallback((event) => {
    const y = event.touches?.[0]?.clientY;
    touchPull.current = reducePullRefresh(touchPull.current, { type: "move", y });
    setPullDistance(touchPull.current.distance);
  }, []);
  const finishPull = React.useCallback(() => {
    const ended = reducePullRefresh(touchPull.current, { type: "end" });
    touchPull.current = createPullRefreshState();
    setPullDistance(0);
    if (ended.requested) startRun();
  }, [startRun]);
  const cancelPull = React.useCallback(() => {
    touchPull.current = reducePullRefresh(touchPull.current, { type: "cancel" });
    setPullDistance(0);
  }, []);

  const finishTrackpadPull = React.useCallback(() => {
    trackpadSettleTimer.current = null;
    const ended = reduceTrackpadPullRefresh(trackpadPull.current, { type: "end" });
    trackpadPull.current = createTrackpadPullRefreshState();
    setPullDistance(0);
    if (ended.requested) startRun();
  }, [startRun]);

  const onTrackpadWheel = React.useCallback((event) => {
    const next = reduceTrackpadPullRefresh(trackpadPull.current, {
      type: "wheel",
      deltaY: event.deltaY,
      deltaMode: event.deltaMode,
      atTop: (streamRef.current?.scrollTop ?? 1) <= 0,
      modified: event.ctrlKey || event.metaKey || event.altKey || event.shiftKey,
    });
    trackpadPull.current = next;
    if (next.eligible && next.distance > 0) event.preventDefault();
    setPullDistance(next.distance);
    if (trackpadSettleTimer.current !== null) window.clearTimeout(trackpadSettleTimer.current);
    trackpadSettleTimer.current = window.setTimeout(finishTrackpadPull, TRACKPAD_PULL_SETTLE_MS);
  }, [finishTrackpadPull]);

  React.useEffect(() => {
    if (state.view !== "home") return undefined;
    const stream = streamRef.current;
    if (stream === null) return undefined;
    stream.scrollLeft = 0;
    stream.addEventListener("wheel", onTrackpadWheel, { passive: false });
    return () => {
      stream.removeEventListener("wheel", onTrackpadWheel);
      if (trackpadSettleTimer.current !== null) window.clearTimeout(trackpadSettleTimer.current);
      trackpadSettleTimer.current = null;
      trackpadPull.current = createTrackpadPullRefreshState();
    };
  }, [onTrackpadWheel, state.view]);

  const onAnswer = React.useCallback((chunkId, label) => {
    if (!saveStreamAnswer(browserStorage(), chunkId, label)) return;
    setAnswers((current) => ({ ...current, [chunkId]: label }));
    const chunk = chunksRef.current.find(({ id }) => id === chunkId);
    if (chunk !== undefined) appendLearningEvent(browserStorage(), { event: "answered", chunkId, kind: chunk.kind, tribes: chunk.tribes, label });
    record("questionnaire-answered", "home", Math.max(0, performance.now() - NAVIGATION_STARTED_AT), "user");
  }, [record]);

  const onSave = React.useCallback((chunkId) => {
    const chunk = chunksRef.current.find(({ id }) => id === chunkId);
    if (!stateRef.current.savedChunkIds.includes(chunkId) && chunk !== undefined) appendLearningEvent(browserStorage(), { event: "saved", chunkId, kind: chunk.kind, tribes: chunk.tribes });
    dispatch({ type: "toggle-save", chunkId });
  }, []);
  const onEngage = React.useCallback((chunk, event) => {
    appendLearningEvent(browserStorage(), { event, chunkId: chunk.id, kind: chunk.kind, tribes: chunk.tribes });
    markVibeActivity(browserStorage());
  }, []);
  const onSkip = React.useCallback((chunk) => {
    appendLearningEvent(browserStorage(), { event: "skipped", chunkId: chunk.id, kind: chunk.kind, tribes: chunk.tribes });
    setSkipped((current) => new Set([...current, chunk.id]));
  }, []);
  const onShare = React.useCallback((chunk, { media, inlineVisuals, contentLink, embeddedMedia }) => {
    const snapshot = shareSnapshotForChunk({
      chunk,
      markdown: markdownWithoutLeadVisual(chunk.markdown),
      media,
      inlineVisuals,
      contentLink,
      embeddedMedia,
    });
    if (snapshot === null) {
      setShareState({ chunkId: chunk.id, status: "invalid" });
      return;
    }
    setShareState({ chunkId: chunk.id, status: "opening" });
    beginSharePreview(snapshot, {
      onStatus(status) {
        setShareState({ chunkId: chunk.id, status });
      },
    });
  }, []);
  const newestChunks = newestFirst(chunks);
  const librarySummary = vibeLibrarySummary(newestChunks);
  const displayChunks = libraryOpen ? searchableVibeChunks(newestChunks, libraryQuery) : newestChunks;
  const goHome = React.useCallback(() => {
    setLibraryOpen(false);
    setLibraryQuery("");
    streamRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const openLibrary = React.useCallback(() => {
    setLibraryOpen(true);
    window.requestAnimationFrame(() => streamRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  }, []);
  const enterChat = React.useCallback(() => {
    dispatch({ type: "enter-chat" });
    window.dispatchEvent(new CustomEvent(VIBE_CHAT_EVENT));
  }, []);
  const updateNotice = {
    complete: "Magazine updated. It will stay still until another Chat answer completes or you request an update.",
    stopped: "Magazine update stopped.",
    "timed-out": "Magazine update reached its time limit and stopped.",
    error: "Fresh articles could not be added. Your saved articles are still here.",
  }[updateState];
  return (
    <div className="vfx-shell" data-view={state.view} data-palette={appearance.palette} data-text-size={appearance.textSize} data-spacing={appearance.spacing}>
      {state.view === "home" ? (
        <main
          ref={streamRef}
          className="vfx-stream"
          onScroll={onScroll}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={finishPull}
          onTouchCancel={cancelPull}
        >
          <Header
            editorialLabel={editorialProfile.label}
            updateState={updateState}
            libraryOpen={libraryOpen}
            onHome={goHome}
            onFind={openLibrary}
            onUpdate={startRun}
            onStop={stopRun}
            onChat={enterChat}
          />
          <>
            <div className={`vfx-pull${pullDistance >= PULL_REFRESH_THRESHOLD ? " is-armed" : ""}`} style={{ height: `${pullDistance}px` }} aria-hidden="true">
              <span>{pullDistance >= PULL_REFRESH_THRESHOLD ? "Release to update" : "Pull to update"}</span>
            </div>
            {libraryOpen ? (
            <section className="vfx-library" aria-labelledby="vfx-library-title">
              <div className="vfx-library-heading">
                <span>Your local library</span>
                <h1 id="vfx-library-title">Find your past Vibes.</h1>
                <p>Search Vibes made from Chat and explicit magazine updates. They stay in this browser across DSH restarts, up to 160 cards or 30 days; older material leaves automatically.</p>
              </div>
              <label className="vfx-library-search">
                <span>Search titles and article text</span>
                <div><Icon name="search" /><input type="search" value={libraryQuery} maxLength={MAX_VIBE_LIBRARY_QUERY} placeholder="Try a person, place or idea" aria-label="Search saved Vibes" onChange={(event) => setLibraryQuery(event.target.value)} /></div>
              </label>
              <div className="vfx-library-status" role="status">
                <span>{libraryQuery.trim() === ""
                  ? `${librarySummary.count} ${librarySummary.count === 1 ? "Vibe" : "Vibes"} saved in this browser`
                  : `${displayChunks.length} matching ${displayChunks.length === 1 ? "Vibe" : "Vibes"}`}</span>
                <button type="button" onClick={goHome}>Back to magazine</button>
              </div>
            </section>
          ) : (
            <section className="vfx-edition-intro">
              <span>Your magazine · {editorialProfile.label}</span>
              <h1>People. Stories. Something worth your time.</h1>
              <p>Your editorial direction sets the brief. Update for a fresh read: the people, relationships and ideas behind the headlines. Your saved edition is here when you return.</p>
              <button type="button" className="vfx-intro-cta" disabled={["starting", "submitted", "stopping"].includes(updateState)} onClick={startRun}>Update my magazine</button>
              {updateNotice === undefined ? null : <p className="vfx-update-note" role={updateState === "error" ? "alert" : "status"}>{updateNotice}</p>}
            </section>
            )}
            {libraryOpen && displayChunks.length === 0 ? <p className="vfx-library-empty">No saved Vibes match that search yet.</p> : null}
            <div className="vfx-chunks">
              {displayChunks.map((chunk, index) => (
                <StreamChunk
                  key={chunk.id}
                  chunk={chunk}
                  index={index}
                  visualOverride={visualOverrides.get(chunk.id)}
                  visualStatus={visualStatus.get(chunk.id)}
                  failedVisuals={failedVisuals}
                  onVisualFailure={onVisualFailure}
                  saved={state.savedChunkIds.includes(chunk.id)}
                  answer={answers[chunk.id]}
                  skipped={skipped.has(chunk.id)}
                  shareStatus={shareState.chunkId === chunk.id ? shareState.status : "idle"}
                  clickToLoad={editorialProfile.clickToLoadMedia}
                  onSave={onSave}
                  onAnswer={onAnswer}
                  onEngage={onEngage}
                  onSkip={onSkip}
                  onShare={onShare}
                  onChat={enterChat}
                />
              ))}
            </div>
            <footer className="vfx-footer"><span>{libraryOpen ? "Your local library is bounded and private to this browser." : displayChunks.length === 0 ? "Your first edition is one update away." : "Your saved edition · newest stories first."}</span><span>Creators credited · sharing stays reviewed</span></footer>
          </>
        </main>
      ) : null}
    </div>
  );
}

const CSS = `
body[data-vibeify-experience="home"] { overflow:hidden; }
body:not([data-vibeify-experience="chat"]) #dsh-vibeify-picker .dsh-vibeify-trigger { display:none; }
.vfx-shell,.vfx-shell * { box-sizing:border-box; }
.vfx-shell { --ink:#fffafc; --muted:#b9adb8; position:fixed; inset:0; z-index:9990; overflow:hidden; color:var(--ink); color-scheme:dark; background:#080609; font-family:Inter,"SF Pro Display","Helvetica Neue",sans-serif; letter-spacing:-.01em; }
.vfx-shell[data-view="chat"] { pointer-events:none; background:transparent; }
.vfx-shell button { color:inherit; font:inherit; }
.vfx-shell button:focus-visible,.vfx-shell a:focus-visible { outline:2px solid #fff; outline-offset:3px; }
.vfx-icon { width:1.15em; height:1.15em; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.vfx-stream { height:100%; overflow-y:auto; overflow-x:hidden; overflow-x:clip; overscroll-behavior-y:contain; overscroll-behavior-x:none; background:radial-gradient(circle at 82% 0,rgba(132,73,145,.18),transparent 28%),linear-gradient(#080609,#0b070b 62%,#110b11); scrollbar-color:#503a49 transparent; }
.vfx-header { position:sticky; z-index:20; top:0; height:78px; padding:0 clamp(20px,4vw,68px); display:flex; align-items:center; gap:24px; border-bottom:1px solid rgba(255,255,255,.07); background:rgba(7,5,8,.89); backdrop-filter:blur(18px); }
.vfx-wordmark { padding:0; border:0; display:flex; flex-direction:column; align-items:flex-start; background:none; cursor:pointer; }
.vfx-wordmark span { font-size:24px; font-weight:900; letter-spacing:.18em; background:linear-gradient(100deg,#fff 5%,#ff88ad 55%,#9f8cff); background-clip:text; color:transparent; }
.vfx-wordmark small { color:#ab9ca7; font-size:9px; letter-spacing:.12em; text-transform:uppercase; }
.vfx-edition { margin-left:auto; color:#94858f; font-size:9px; font-weight:750; letter-spacing:.1em; text-transform:uppercase; }
.vfx-update { min-height:39px; padding:0 16px; border:1px solid rgba(255,255,255,.19); border-radius:999px; background:rgba(255,255,255,.04); cursor:pointer; font-size:12px; font-weight:760; }
.vfx-update:hover { background:rgba(255,255,255,.12); }.vfx-update.is-active { color:#190d13; border-color:#ff9aba; background:#ff9aba; }
.vfx-find { min-height:39px; padding:0 15px; display:flex; align-items:center; gap:7px; border:1px solid rgba(255,255,255,.17); border-radius:999px; background:rgba(255,255,255,.035); cursor:pointer; font-size:12px; font-weight:760; }
.vfx-find:hover,.vfx-find[aria-pressed="true"] { border-color:rgba(255,154,186,.68); background:rgba(255,117,159,.14); }
.vfx-chat { min-height:39px; padding:0 16px; display:flex; align-items:center; gap:8px; border:1px solid rgba(255,255,255,.25); border-radius:999px; background:rgba(255,255,255,.06); cursor:pointer; font-size:13px; font-weight:700; }
.vfx-chat:hover { background:rgba(255,255,255,.14); }
.vfx-pull { height:0; overflow:hidden; display:grid; place-items:end center; color:#9d8f99; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; transition:height .18s ease; }.vfx-pull span { padding:0 0 12px; }.vfx-pull.is-armed { color:#ff8db1; }
.vfx-edition-intro { width:min(1180px,calc(100% - 40px)); margin:0 auto; padding:clamp(34px,5vw,64px) 0 clamp(34px,5vw,58px); }
.vfx-edition-intro>span { color:#ff85aa; font-size:10px; font-weight:850; letter-spacing:.16em; text-transform:uppercase; }
.vfx-edition-intro h1 { max-width:940px; margin:9px 0 13px; font-family:"Iowan Old Style",Georgia,serif; font-size:clamp(36px,5vw,70px); font-weight:500; line-height:.94; letter-spacing:-.055em; text-wrap:balance; }
.vfx-edition-intro p { max-width:720px; margin:0; color:#c7bac4; font-size:clamp(14px,1.35vw,18px); line-height:1.5; }
.vfx-edition-intro .vfx-update-note { margin-top:14px; color:#ffb3cb; font-size:12px; font-weight:700; }
.vfx-intro-cta { min-height:44px; margin-top:22px; padding:0 18px; display:inline-flex; align-items:center; gap:9px; border:1px solid #ff9aba; border-radius:999px; background:#ff9aba; color:#190d13!important; cursor:pointer; font-size:13px!important; font-weight:850; }
.vfx-library { width:min(1180px,calc(100% - 40px)); margin:0 auto; padding:clamp(34px,5vw,64px) 0 clamp(28px,4vw,44px); display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,.62fr); align-items:end; gap:24px clamp(30px,5vw,70px); }
.vfx-library-heading>span { color:#ff85aa; font-size:10px; font-weight:850; letter-spacing:.16em; text-transform:uppercase; }
.vfx-library h1 { max-width:720px; margin:9px 0 13px; font-family:"Iowan Old Style",Georgia,serif; font-size:clamp(36px,5vw,66px); font-weight:500; line-height:.95; letter-spacing:-.055em; text-wrap:balance; }
.vfx-library p { max-width:720px; margin:0; color:#c7bac4; font-size:clamp(14px,1.25vw,17px); line-height:1.55; }
.vfx-library-search { display:grid; gap:9px; color:#a99aa5; font-size:10px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; }
.vfx-library-search>div { min-height:52px; padding:0 16px; display:flex; align-items:center; gap:11px; border:1px solid rgba(255,255,255,.19); border-radius:16px; background:rgba(255,255,255,.055); }
.vfx-library-search>div:focus-within { border-color:#ff9aba; box-shadow:0 0 0 3px rgba(255,117,159,.13); }
.vfx-library-search input { width:100%; min-width:0; border:0; outline:0; background:transparent; color:#fff; font:600 15px/1.3 Inter,"SF Pro Display","Helvetica Neue",sans-serif; letter-spacing:0; text-transform:none; }
.vfx-library-search input::placeholder { color:#7e717b; }
.vfx-library-status { grid-column:1/-1; padding-top:18px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; border-top:1px solid rgba(255,255,255,.08); color:#978992; font-size:11px; }
.vfx-library-status button { min-height:36px; padding:0 14px; border:1px solid rgba(255,255,255,.16); border-radius:999px; background:rgba(255,255,255,.04); cursor:pointer; font-size:11px; font-weight:760; }
.vfx-library-empty { width:min(1180px,calc(100% - 40px)); margin:0 auto 36px; padding:42px 24px; border:1px dashed rgba(255,255,255,.14); border-radius:18px; color:#a99aa5; text-align:center; }
.vfx-chunks { width:min(1240px,calc(100% - 40px)); min-width:0; margin:0 auto; display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); grid-auto-flow:row; align-items:start; gap:clamp(18px,2.4vw,34px); }
.vfx-chunk { scroll-margin-top:100px; grid-column:span 6; min-width:0; max-width:100%; align-self:start; overflow:hidden; contain:inline-size; border:1px solid rgba(255,255,255,.1); border-radius:22px; background:linear-gradient(145deg,rgba(31,23,31,.96),rgba(16,12,17,.98)); box-shadow:0 22px 70px rgba(0,0,0,.18); }
.vfx-chunk[data-layout="compact"] { grid-column:span 4; }
.vfx-chunk[data-layout="feature"] { grid-column:span 8; }
.vfx-chunk[data-layout="wide"] { grid-column:1/-1; }
.vfx-chunk.is-hero { grid-column:1/-1; display:grid; grid-template-columns:minmax(0,1.25fr) minmax(360px,.75fr); background:#100b10; }
.vfx-chunk[data-has-table="true"].is-hero { display:block; }
.vfx-chunk[data-has-table="true"].is-hero .vfx-chunk-visual,.vfx-chunk[data-has-table="true"].is-hero .vfx-chunk-visual img { min-height:300px; height:clamp(300px,34vw,460px); }
.vfx-chunk[data-kind="questionnaire"] { display:grid; grid-template-columns:minmax(260px,.42fr) minmax(0,1fr); background:radial-gradient(circle at 90% 0,color-mix(in srgb,var(--chunk-accent) 22%,transparent),transparent 42%),linear-gradient(145deg,#241522,#151018); }
.vfx-chunk[data-source="chat-directed"] { border-color:rgba(255,133,170,.34); background:radial-gradient(circle at 100% 0,rgba(159,140,255,.16),transparent 38%),linear-gradient(145deg,#271522,#130e15); }
.vfx-chunk[data-kind="music"],.vfx-chunk[data-kind="video"] { background:linear-gradient(145deg,color-mix(in srgb,var(--chunk-accent) 12%,#201720),#100c11); }
.vfx-chunk-visual { position:relative; min-height:260px; margin:0; overflow:hidden; background:#171117; }
.vfx-chunk-visual img { width:100%; height:300px; display:block; object-fit:cover; }
.vfx-chunk[data-layout="compact"] .vfx-chunk-visual,.vfx-chunk[data-layout="compact"] .vfx-chunk-visual img { min-height:230px; height:230px; }
.vfx-chunk[data-layout="feature"] .vfx-chunk-visual,.vfx-chunk[data-layout="feature"] .vfx-chunk-visual img { min-height:320px; height:320px; }
.vfx-chunk[data-kind="questionnaire"] .vfx-chunk-visual,.vfx-chunk[data-kind="questionnaire"] .vfx-chunk-visual img { height:100%; min-height:330px; }
.vfx-chunk.is-hero .vfx-chunk-visual,.vfx-chunk.is-hero .vfx-chunk-visual img { min-height:300px; height:100%; }
.vfx-chunk[data-visual-mode="poster"] .vfx-chunk-visual img { transform:scale(1.06); filter:saturate(1.14) contrast(1.08); }
.vfx-chunk[data-visual-mode="duotone"] .vfx-chunk-visual img { filter:grayscale(.68) sepia(.22) hue-rotate(275deg) saturate(1.5) contrast(1.08); }
.vfx-chunk[data-visual-mode="close-crop"] .vfx-chunk-visual img { transform:scale(1.18); }
.vfx-chunk[data-visual-kind="ai-graphic"] .vfx-visual-shade { background:linear-gradient(145deg,transparent 35%,rgba(5,3,6,.42)); }
.vfx-chunk[data-visual-kind="photograph"],.vfx-chunk[data-visual-kind="editorial-image"] { border-color:color-mix(in srgb,var(--chunk-accent) 42%,rgba(255,255,255,.1)); }
.vfx-chunk[data-visual-kind="typography"] .vfx-chunk-visual img { object-fit:contain; }
.vfx-visual-shade { position:absolute; inset:0; background:linear-gradient(0deg,rgba(5,3,6,.72),transparent 60%); }
.vfx-chunk-visual figcaption { position:absolute; right:16px; bottom:14px; color:#d7cad3; font-size:10px; }.vfx-chunk-visual a { color:#fff; }
.vfx-chunk-copy { min-width:0; max-width:100%; padding:clamp(24px,3vw,42px); }
.vfx-chunk-heading { min-width:0; display:flex; align-items:start; justify-content:space-between; gap:24px; }.vfx-chunk-heading>div { min-width:0; }
.vfx-chunk-heading span { color:var(--chunk-accent); font-size:9px; font-weight:850; letter-spacing:.14em; text-transform:uppercase; }
.vfx-chunk h2 { max-width:100%; margin:8px 0 20px; overflow-wrap:normal; word-break:normal; hyphens:none; font-family:"Iowan Old Style",Georgia,serif; font-size:clamp(30px,3.4vw,52px); font-weight:500; line-height:1; letter-spacing:-.05em; text-wrap:balance; }
.vfx-chunk.is-hero h2 { font-size:clamp(40px,3vw,60px); }
.vfx-reading.is-excerpt { max-height:22rem; overflow:hidden; mask-image:linear-gradient(#000 78%,transparent); }
.vfx-read-more { display:inline-flex; align-items:center; gap:10px; margin:18px 0 4px; padding:10px 0; border:0; border-bottom:1px solid currentColor; background:none; color:var(--accent,#ff9aba); font:inherit; font-size:14px; font-weight:750; cursor:pointer; }
.vfx-chunk[data-expanded="true"] { grid-column:1/-1; display:block; scroll-margin-top:100px; }
.vfx-chunk[data-expanded="true"] .vfx-chunk-copy { max-width:80ch; margin:0 auto; }
.vfx-chunk[data-expanded="true"] .vfx-chunk-visual,.vfx-chunk[data-expanded="true"] .vfx-chunk-visual img { height:clamp(300px,38vw,480px); min-height:300px; }
.vfx-chunk[data-layout="compact"] h2 { font-size:clamp(28px,2.6vw,40px); }
.vfx-save { width:37px; height:37px; flex:none; display:grid; place-items:center; border:1px solid rgba(255,255,255,.17); border-radius:50%; background:rgba(255,255,255,.04); cursor:pointer; }
.vfx-save[aria-pressed="true"] { color:#161016; border-color:#fff; background:#fff; }
.vfx-markdown { min-width:0; max-width:100%; overflow-wrap:anywhere; color:#c7bbc4; font-size:15px; line-height:1.7; }.vfx-markdown p { margin:0 0 16px; }.vfx-markdown p:last-child { margin-bottom:0; }.vfx-markdown a { overflow-wrap:anywhere; color:#ffc0d4; text-decoration-color:#765466; text-underline-offset:3px; }.vfx-markdown blockquote { margin:20px 0 0; padding:18px 20px; border-left:2px solid var(--chunk-accent); border-radius:0 14px 14px 0; color:#efe5eb; background:rgba(255,255,255,.045); font-family:"Iowan Old Style",Georgia,serif; font-size:18px; }.vfx-markdown ul,.vfx-markdown ol { display:grid; gap:8px; padding-left:20px; }.vfx-markdown h1,.vfx-markdown h2,.vfx-markdown h3 { font-family:"Iowan Old Style",Georgia,serif; font-weight:500; }.vfx-markdown h2 { margin:30px 0 12px; font-size:clamp(26px,3vw,40px); line-height:1.06; }.vfx-markdown h3 { margin:24px 0 10px; font-size:clamp(21px,2.2vw,29px); line-height:1.14; }.vfx-markdown pre { display:block; max-width:100%; padding:18px; overflow-x:auto; white-space:pre-wrap; border:1px solid rgba(255,255,255,.11); border-radius:12px; background:#0a070b; }.vfx-markdown code { overflow-wrap:anywhere; word-break:break-word; }.vfx-math { max-width:100%; margin:24px 0; padding:18px 22px; overflow-x:auto; border-left:3px solid var(--chunk-accent); border-radius:0 12px 12px 0; background:rgba(255,255,255,.045); color:#fff7fb; font-family:"Iowan Old Style",Georgia,serif; font-size:clamp(20px,2.7vw,34px); line-height:1.25; letter-spacing:.015em; white-space:nowrap; }
.vfx-table-scroll { max-width:100%; margin:22px 0; overflow-x:auto; overscroll-behavior-inline:contain; -webkit-overflow-scrolling:touch; scrollbar-color:#765466 transparent; }
.vfx-table-scroll:focus-visible { outline:2px solid var(--chunk-accent); outline-offset:3px; }
.vfx-table-scroll table { width:100%; min-width:680px; margin:0; border-collapse:collapse; table-layout:auto; font-size:13px; line-height:1.45; }.vfx-markdown th,.vfx-markdown td { min-width:140px; padding:11px 14px; overflow-wrap:normal; word-break:normal; hyphens:none; border-bottom:1px solid rgba(255,255,255,.11); text-align:left; vertical-align:top; }.vfx-markdown th:first-child,.vfx-markdown td:first-child { min-width:120px; }.vfx-markdown th { color:#f2e8ee; background:rgba(255,255,255,.045); font-size:11px; letter-spacing:.04em; text-transform:uppercase; }
.vfx-inline-visuals { margin:28px 0 4px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.vfx-inline-visuals figure { min-width:0; margin:0; overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:15px; background:#0e0a0f; }.vfx-inline-visuals figure:only-child { grid-column:1/-1; }.vfx-inline-visuals img { width:100%; height:clamp(190px,24vw,320px); display:block; object-fit:cover; }.vfx-inline-visuals figcaption { padding:9px 12px 11px; color:#9e909a; font-size:10px; }.vfx-inline-visuals a { color:#d7cbd3; text-underline-offset:3px; }
.vfx-question>.vfx-markdown { max-width:720px; margin:0 0 24px; color:#d0c3cb; line-height:1.55; }
.vfx-question-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.vfx-question-options button { min-height:54px; padding:10px 15px; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,.14); border-radius:13px; background:rgba(255,255,255,.045); cursor:pointer; text-align:left; }
.vfx-question-options button:hover { border-color:var(--chunk-accent); background:rgba(255,255,255,.08); }.vfx-question-options button[aria-pressed="true"] { border-color:var(--chunk-accent); background:color-mix(in srgb,var(--chunk-accent) 18%,#171017); }.vfx-question-options button>span { width:20px; height:20px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.25); border-radius:50%; }
.vfx-next-page { margin-top:25px; display:flex; align-items:center; gap:7px; color:#8d7e88; font-size:9px; font-weight:750; letter-spacing:.1em; text-transform:uppercase; }
.vfx-source-link { min-width:0; max-width:100%; margin-top:20px; display:inline-flex; flex-wrap:wrap; align-items:center; gap:5px 7px; overflow-wrap:anywhere; color:#ffc0d4; font-size:11px; font-weight:760; text-decoration:none; }.vfx-source-link span { color:#9f909b; font-size:9px; letter-spacing:.08em; text-transform:uppercase; }.vfx-source-link strong { max-width:100%; font-weight:760; }.vfx-source-link:hover { text-decoration:underline; text-underline-offset:3px; }.vfx-source-link .vfx-icon { width:14px; height:14px; flex:none; }
.vfx-card-actions { margin-top:20px; display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:16px; }.vfx-card-actions .vfx-source-link { flex:1 1 220px; margin-top:0; }.vfx-reader-actions { margin-left:auto; display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }.vfx-skip,.vfx-share,.vfx-chat-cta,.vfx-media-button { min-height:34px; padding:0 13px; border:1px solid rgba(255,255,255,.15); border-radius:999px; background:rgba(255,255,255,.045); color:#c9bdc5; cursor:pointer; font-size:11px; }.vfx-chat-cta { display:inline-flex; align-items:center; gap:7px; border-color:var(--chunk-accent); background:color-mix(in srgb,var(--chunk-accent) 20%,#171017); color:#fff; font-weight:800; }.vfx-chat-cta:hover { background:color-mix(in srgb,var(--chunk-accent) 32%,#171017); }.vfx-share { display:inline-flex; align-items:center; gap:7px; color:#f5e9ef; border-color:rgba(255,154,186,.4); background:rgba(255,117,159,.11); }.vfx-share:hover { border-color:#ff9aba; background:rgba(255,117,159,.2); }.vfx-share:disabled { cursor:wait; opacity:.65; }.vfx-skip[aria-pressed="true"] { color:#9c9098; }.vfx-media-button { margin-top:16px; color:#190d13; border-color:#ff9aba; background:#ff9aba; font-weight:760; }.vfx-player { margin-top:18px; overflow:hidden; border-radius:14px; background:#000; aspect-ratio:16/9; }.vfx-player[data-media-provider="soundcloud"] { height:166px; aspect-ratio:auto; background:#fff; }.vfx-player iframe { width:100%; height:100%; display:block; border:0; }
.vfx-footer { width:min(1180px,calc(100% - 40px)); margin:80px auto 0; padding:32px 0 44px; display:flex; justify-content:space-between; gap:20px; border-top:1px solid rgba(255,255,255,.08); color:#766975; font-size:10px; }
@media (max-width:1180px) { .vfx-chunk.is-hero { display:block; }.vfx-chunk.is-hero .vfx-chunk-visual,.vfx-chunk.is-hero .vfx-chunk-visual img { min-height:300px; height:300px; } }
@media (max-width:1050px) { .vfx-chunk[data-layout="compact"],.vfx-chunk[data-layout="feature"] { grid-column:span 6; }.vfx-chunk[data-kind="questionnaire"] { grid-template-columns:minmax(220px,.4fr) minmax(0,1fr); } }
@media (max-width:760px) { .vfx-edition { display:none; }.vfx-library { grid-template-columns:1fr; align-items:stretch; }.vfx-library-status { grid-column:auto; }.vfx-chunks { display:block; }.vfx-chunk,.vfx-chunk[data-kind="questionnaire"] { margin-bottom:24px; display:block; }.vfx-chunk.is-hero { display:block; }.vfx-chunk-visual,.vfx-chunk-visual img,.vfx-chunk[data-layout="compact"] .vfx-chunk-visual,.vfx-chunk[data-layout="compact"] .vfx-chunk-visual img,.vfx-chunk[data-layout="feature"] .vfx-chunk-visual,.vfx-chunk[data-layout="feature"] .vfx-chunk-visual img,.vfx-chunk[data-kind="questionnaire"] .vfx-chunk-visual,.vfx-chunk[data-kind="questionnaire"] .vfx-chunk-visual img { min-height:260px; height:260px; }.vfx-question-options { grid-template-columns:1fr; } }
@media (max-width:560px) { .vfx-header { height:auto; min-height:106px; padding:10px 12px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px 6px; }.vfx-wordmark { grid-column:1/-1; }.vfx-wordmark small { display:none; }.vfx-shell .vfx-find,.vfx-shell .vfx-update,.vfx-shell .vfx-chat { width:100%; min-width:0; min-height:34px; padding:0 4px; justify-content:center; white-space:nowrap; font-size:10px; }.vfx-find .vfx-icon,.vfx-chat .vfx-icon { display:none; }.vfx-edition-intro,.vfx-library,.vfx-library-empty,.vfx-chunks,.vfx-footer { width:calc(100% - 28px); }.vfx-edition-intro,.vfx-library { padding-top:34px; }.vfx-edition-intro h1,.vfx-library h1 { font-size:42px; }.vfx-chunk { border-radius:17px; }.vfx-chunk-copy { padding:24px 20px; }.vfx-chunk h2 { font-size:34px; }.vfx-chunk-visual,.vfx-chunk-visual img { min-height:220px!important; height:220px!important; }.vfx-inline-visuals { grid-template-columns:1fr; }.vfx-inline-visuals figure:only-child { grid-column:auto; }.vfx-inline-visuals img { height:220px; }.vfx-footer { flex-direction:column; } }
@media (prefers-reduced-motion:reduce) { .vfx-shell * { scroll-behavior:auto!important; animation-duration:.001ms!important; transition-duration:.001ms!important; } }
`;

const PUBLIC_SHARE_CSS = `
.vfx-public-share { position:relative; text-align:left; }
.vfx-share-link-panel { position:absolute; z-index:8; top:calc(100% + 8px); right:0; width:min(420px,calc(100vw - 48px)); padding:14px; display:grid; gap:10px; border:1px solid rgba(255,255,255,.18); border-radius:14px; background:#171018; box-shadow:0 16px 42px #0009; }
.vfx-share-link-panel label { min-width:0; display:grid; gap:6px; color:#b5a7b1; font-size:10px; font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
.vfx-share-link-panel input { width:100%; min-height:40px; padding:0 10px; border:1px solid rgba(255,255,255,.17); border-radius:9px; outline:0; color:#fff; background:#0b080c; font:12px/1.4 Inter,"SF Pro Display","Helvetica Neue",sans-serif; letter-spacing:0; text-transform:none; }
.vfx-share-link-panel input:focus { border-color:#ff9aba; box-shadow:0 0 0 3px rgba(255,117,159,.12); }
.vfx-share-link-panel>div { display:flex; flex-wrap:wrap; gap:8px; }
.vfx-share-link-panel>div button { min-height:34px; padding:0 12px; border:1px solid rgba(255,255,255,.18); border-radius:999px; background:rgba(255,255,255,.06); cursor:pointer; font-size:11px; }
.vfx-share-link-panel p { margin:0; color:#c9bdc5; font-size:11px; line-height:1.4; }
@media (max-width:560px) { .vfx-share-link-panel { right:-2px; width:min(360px,calc(100vw - 40px)); } }
`;

const APPEARANCE_CSS = `
.vfx-shell { --page:#080609; --surface:#19121b; --ink:#fffafc; --muted:#c7bac4; --accent:#ff9aba; --edge:#58424f; --wash:#ffffff0b; }
.vfx-shell[data-palette="paper"] { --page:#f4efe5; --surface:#fffdf7; --ink:#29251f; --muted:#60574d; --accent:#963b37; --edge:#c8bdae; --wash:#33251408; color-scheme:light; }
.vfx-shell[data-palette="forest"] { --page:#eaf0e7; --surface:#f9fcf6; --ink:#18392c; --muted:#496355; --accent:#176648; --edge:#b0c8b6; --wash:#163a2708; color-scheme:light; }
.vfx-shell[data-palette="ocean"] { --page:#081b2b; --surface:#102b40; --ink:#f0f9ff; --muted:#b8cfdd; --accent:#7bd8e9; --edge:#3d687e; --wash:#b0e7ff0b; }
.vfx-shell:not([data-view="chat"]),.vfx-shell .vfx-stream { color:var(--ink); background:var(--page); }
.vfx-shell .vfx-stream { background:radial-gradient(ellipse at 85% 0,color-mix(in srgb,var(--accent) 8%,transparent),transparent 40%),var(--page); scrollbar-color:var(--edge) transparent; }
.vfx-shell .vfx-header { background:color-mix(in srgb,var(--page) 94%,transparent); border-color:var(--edge); }
.vfx-shell .vfx-wordmark span { background:none; color:var(--ink); }
.vfx-shell .vfx-wordmark small,.vfx-shell .vfx-edition,.vfx-shell .vfx-edition-intro p,.vfx-shell .vfx-library p,.vfx-shell .vfx-library-status,.vfx-shell .vfx-footer,.vfx-shell .vfx-pull,.vfx-shell .vfx-chunk-meta,.vfx-shell .vfx-share-link-panel p { color:var(--muted); }
.vfx-shell .vfx-edition-intro>span,.vfx-shell .vfx-source-link,.vfx-shell .vfx-markdown a,.vfx-shell .vfx-chunk-heading>div>span { color:var(--accent); }
.vfx-shell .vfx-chunk { background:var(--surface); border-color:var(--edge); box-shadow:0 14px 42px #0000000a; }
.vfx-shell .vfx-markdown { color:var(--muted); }
.vfx-shell .vfx-markdown blockquote,.vfx-shell .vfx-markdown th,.vfx-shell .vfx-math { color:var(--ink); background:var(--wash); }
.vfx-shell .vfx-markdown pre,.vfx-shell .vfx-inline-visuals figure,.vfx-shell .vfx-share-link-panel { color:var(--ink); background:var(--surface); border-color:var(--edge); }
.vfx-shell .vfx-inline-visuals figcaption,.vfx-shell .vfx-inline-visuals a { color:var(--muted); }
.vfx-shell .vfx-share,.vfx-shell .vfx-skip,.vfx-shell .vfx-chat-cta,.vfx-shell .vfx-find,.vfx-shell .vfx-chat,.vfx-shell .vfx-save,.vfx-shell .vfx-update,.vfx-shell .vfx-question-options button { color:var(--ink); background:var(--wash); border-color:var(--edge); }
.vfx-shell .vfx-question-options button[aria-pressed="true"],.vfx-shell .vfx-save[aria-pressed="true"] { color:var(--ink); background:color-mix(in srgb,var(--accent) 18%,var(--surface)); border-color:var(--accent); }
.vfx-shell .vfx-intro-cta,.vfx-shell .vfx-update.is-active,.vfx-shell .vfx-media-button { color:var(--page)!important; background:var(--accent); border-color:var(--accent); }
.vfx-shell .vfx-intro-cta:disabled { opacity:.65; cursor:wait; }
.vfx-shell .vfx-library-search>div,.vfx-shell .vfx-share-link-panel input { background:var(--surface); border-color:var(--edge); color:var(--ink); }
.vfx-shell .vfx-library-search input { color:var(--ink); }
.vfx-shell button:focus-visible,.vfx-shell a:focus-visible { outline-color:var(--accent); }
.vfx-shell[data-text-size="large"] .vfx-markdown { font-size:18px; line-height:1.8; }
.vfx-shell[data-spacing="roomy"] .vfx-chunks { gap:32px; }
.vfx-shell[data-spacing="roomy"] .vfx-chunk-copy { padding:clamp(26px,4vw,52px); }
@media(max-width:760px) { .vfx-header { height:auto; min-height:78px; padding:12px 16px; gap:8px; flex-wrap:wrap; } .vfx-wordmark { margin-right:auto; } .vfx-edition { display:none; } .vfx-header .vfx-find,.vfx-header .vfx-update,.vfx-header .vfx-chat { padding:0 10px; font-size:11px; } }
`;

function installStyles(ctx) {
  ctx.effect(() => {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `${CSS}\n${PUBLIC_SHARE_CSS}\n${APPEARANCE_CSS}`;
    document.getElementById(STYLE_ID)?.remove();
    document.head.appendChild(style);
    return () => style.remove();
  }, "dsh-vibeify: continuous editorial stream styles");
}

export function registerExperienceShell(ctx, { codexFeatures = true } = {}) {
  installStyles(ctx);
  installVibeStreamBridge(ctx);
  installRecipeRunner(ctx);
  installThreadMagazineBridge(ctx);
  installBackgroundEditor(ctx, { codexFeatures });
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: SLOT_ID, order: -100 }, () => <ExperienceShell codexFeatures={codexFeatures} connection={ctx.connection} />));
}
