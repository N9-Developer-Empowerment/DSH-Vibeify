# Vibe magazine lifecycle

This document is the product and engineering contract for Vibe. Vibe is one local, newest-first magazine shared by all DSH Chat threads. It is not a second chat client. Version 0.13 adds a disclosed, bounded background editorial reserve; that reserve never changes the visible magazine and never prompts an ordinary Chat thread.

For the shorter, non-technical explanation and diagrams, start with [How DSH Vibeify works](HOW_IT_WORKS.md).

## Product decision

Opening DSH opens a full-screen website-like edition containing useful material immediately. **Chat** remains the request, progress, approval, Queue, Steer, and evidence surface. A Chat thread runs only after the user sends it a request; after its answer completes, that turn stops. The completed answer remains visible in Chat and can also become a formatted Vibe card.

The visible magazine changes for exactly two reasons:

1. a Chat turn in any local DSH thread durably finishes with `turn/end: completed`; or
2. the user deliberately pulls down at the top of Vibe or presses **Update**.

Opening Vibe, scrolling, reaching the bottom, changing editorial settings, finishing an update, and returning from Chat never start foreground work or change visible pages. A hidden reserve may refill only under the separate gates below.

```text
send a Chat request
  -> that thread runs one turn
  -> the final answer is visible in Chat
  -> durable completion is read locally
  -> a sanitized copy joins the shared Vibe magazine
  -> the Chat thread is idle

pull down at the top / press Update
  -> ready hidden pages are released immediately
  -> one cached visual short and one questionnaire cover an empty reserve
  -> only if fewer than four ready pages exist, one dedicated magazine session receives one bounded update
  -> complete verified chunks join the top as they become ready
  -> the update turn completes and stops

press Stop update
  -> cancel only the dedicated magazine update session
```

## Seven content layers

The layers are implementation details; the reader sees one uninterrupted magazine.

| Layer | Purpose | Model work |
| --- | --- | --- |
| Bundled well | Cold-start guarantee: 24 deterministic editorial chunks with credited photography, labelled AI-assisted graphics and responsive panel spans | None |
| Saved magazine | Return-visit continuity: up to 160 bounded items, rolling visual URLs with provenance, and 32 short questionnaire choices for 30 days | None |
| Completed Chat answers | Conversation continuity across every local DSH thread | None beyond the Chat turn the user already requested |
| Shared public radar | Public headlines, links, geography and broad tribe hints rebuilt by GitHub Actions every 30 minutes | Public data fetch only; no reader data and no model |
| Local editorial reserve | Seven-day signals, three-day candidates, seven-day ready pages, recent-use time and conservative daily spend ledger | Bounded hidden editor only when all gates pass |
| Instant update reserve | One visual short and one questionnaire released synchronously on every explicit update | None |
| Generated magazine update | Further editorial pages from independently verified quick, culture/media and deep lanes when the ready reserve is short | One bounded foreground turn only when required after Pull to update or Update |

Bundled and saved content are read synchronously during initial state creation. They contain no await, provider request, or dependency on a DSH session becoming ready. This provides useful first content without starting invisible work.

## Completed Chat projection

The browser subscribes to DSH's session list and considers only idle, non-blank reader sessions whose durable activity changed. It excludes sessions marked with the `subagent` origin before reading history. It pages through `session.history`, which can inspect a cold persisted log without resuming or publishing an Agent.

For each thread, the bridge:

1. finds turns with a durable `turn/end` reason of `completed`;
2. ignores aborted, interrupted, running, or incomplete turns;
3. ignores every user message, prompt, attachment, reasoning block, tool call, approval, and progress event;
4. selects the final eligible assistant text for each completed turn;
5. rebuilds a bounded title and Markdown card;
6. hashes transient session/message identity into a non-reversible local presentation id; and
7. appends the card to the browser-local magazine.

The bridge has history-read capability only. It does not call session create, prompt, resume, select, or cancel. A new Chat card therefore cannot wake an old thread or consume additional model quota. Visible DOM changes are not accepted as completion evidence.

## Explicit update control

An editorial update is user-driven and bounded:

- pull-to-update begins only when the magazine is already at the top;
- a short pull springs back without doing work;
- crossing the threshold and releasing requests exactly one update;
- the accessible **Update** button provides the same action without a touch gesture;
- a second update is refused while one is active;
- **Stop update** cancels the exact dedicated session, not a Chat thread;
- a 20-minute timeout cancels a stuck update; and
- completion never schedules another update.

The runner reuses one session titled `VIBE magazine updates` and does not navigate the UI to it. Reuse avoids creating a growing stack of `VIBE continuous edition` sessions. Before any provider request, the browser releases up to six ready pages and appends two complete locally prepared pages: a visual short and a questionnaire. If at least four ready pages were released, the update completes without a foreground provider call. Otherwise the lead uses multiple bounded worker lanes, verifies each publishable item independently and retains one parent stop condition.

## Background radar and reserve

`.github/workflows/publish-radar.yml` runs twice an hour and deploys `latest.json` to GitHub Pages. `scripts/build-radar.mjs` fetches the reviewed public sources in `radar/sources.json`, parses them through `radar/radar-core.mjs`, removes tracking parameters, classifies only broad editorial hints, and validates the public content-only schema. Source failure is fail-soft; a reviewed bootstrap edition is the minimum fallback.

The browser fetches that fixed public JSON without credentials or referrer data. It accepts only HTTPS links and bounded schema fields. Reader settings or activity never travel to the radar. The local reserve has three isolated states: signals, candidates and ready pages. Combined mode puts Codex-validated pages in ready state; provider-neutral mode keeps its no-Codex-verification boundary and releases native candidates only on explicit Update.

The hidden editor checks after initial Vibe activity and then at 30-minute intervals. Work is refused unless the document is visible, Vibe was used within 24 hours, **Fill the hidden reserve** is enabled, six valid radar signals exist, the appropriate reserve contains fewer than 12 pages, and the conservative daily ledger has capacity. One attempt reserves US $0.25 against the configured ceiling, which cannot exceed US $2/day. The separate session is titled `VIBE background editor`, has a 15-minute timeout, never opens in Chat and cannot start, resume or steer another session.

The browser listens to DSH's loopback mux stream for the dedicated session. It accumulates text and reasoning deltas only long enough to recognise a complete closed `<vibe-chunk>` envelope for the active run. The final closing delimiter is the publication boundary: incomplete envelopes, ordinary progress and worker prose remain invisible. Final persisted history is read once more on completion, so a dropped live socket loses no completed page.

## Complete semantic chunks

Explicit updates and user-directed public-content answers progressively publish complete envelopes:

```text
<vibe-chunk id="update-id-unique-item" kind="article" title="Reader-facing title">
Complete Markdown for one semantic item.
</vibe-chunk>
```

Allowed kinds are `article`, `editorial`, `recommendation`, `image`, `music`, `video`, and `questionnaire`. The collector accepts only complete closed envelopes whose id belongs to the active run. Plans, partial paragraphs, raw search notes, tool activity, private or draft material, unverified worker prose, and incomplete envelopes stay out of Vibe. Internal subagent sessions are excluded from the all-thread Chat collector, and the dedicated update session can never fall back to a raw Chat card.

Every generated non-questionnaire envelope carries a useful HTTPS content destination inside its Markdown. Visual media has a separate provenance contract: the lead image is followed by its creator/source page, both are lifted into the figure and caption, and the duplicate visual credit is removed from the displayed article body. `feed.js` independently chooses the first safe reader-facing link for the card's **Read source** action, stripping common tracking parameters and rejecting image files, approved image hosts and known photo-credit pages. The original content link stays where the editor placed it in the prose.

For each foreground or background batch, the editorial contract requires a working pool of at least 18 potential images from three or more credible source families. The lead ranks exact subject/entity match, informative value, credit clarity, composition, freshness and recent-use diversity before publishing only the selected image. The browser sends the 80 most recently accepted remote image URLs into the next contract to reduce repetition; candidates and rejected URLs are not presented as content.

Each update namespaces ids so a later update appends rather than replaces. Storage order remains append-only; presentation reverses arrival order so the newest item appears first. If later checking changes the picture, publish a clearly contextualised follow-up instead of silently rewriting the old item.

## Questionnaire method

Every explicit update begins with one questionnaire from the local reserve; generated batches may add another when it is editorially useful. Each card has two to six one-tap choices. The browser stores only the visible chosen label and the chunk id. A choice can influence the next explicitly requested update, but it never starts one and never modifies work already in flight.

Choices are soft editorial signals, not personal facts, commands, diagnoses, or a profile. When the lead delegates, it converts a useful choice into a bounded topic task instead of copying private reader input into a worker packet merely to save quota.

## Worker method

One explicit update can use several independent lanes when this improves verified delivery:

1. the local reserve releases a visual short and questionnaire without waiting for a model;
2. the lead receives one update contract and acceptance boundary and releases one short generated item before waiting for workers;
3. at least three useful independent lanes may run concurrently: quick/practical, culture/media, and deeper sourced work;
4. the lead verifies each artifact or source before releasing a closed reader-facing chunk;
5. a slow lane cannot block an earlier completed item, and raw worker reports never cross the publication boundary; and
6. the parent update finishes after the requested batch and does not ask for another run.

The browser does not create a fan-out of provider calls itself. The lead selects an appropriate bounded lane count under the live routing, privacy, approval, and cost policy.

## Browser-local persistence

`dsh-vibeify.feed.v2` uses schema version 4 and stores only allow-listed presentation data. Version 4 also removes legacy internal worker reports and update summaries that older collectors may have cached:

```text
chunk: hashed/local id, kind, source class, title, bounded Markdown, catalogue topic id, publication time
answer: chunk id, visible option label, answered time
```

It never stores raw prompts, DSH session or message ids, account data, attachments, reasoning, tool calls, approvals, arbitrary form values, worker payloads, or credentials. Both explicitly published chunks and sanitized completed-Chat cards may persist. Entries expire after 30 days, duplicate ids retain the first entry, and the oldest items fall out after 160 chunks. Corrupt, future-dated, oversized, stale, or malformed entries are discarded. Storage failure leaves the current in-memory edition working.

## Content-free measurement

The local ledger holds at most 200 records. Each record contains only event, opaque run id, duration, source class, and timestamp. It contains no content, prompt, URL, answer, session, account, or worker payload and sends no analytics request.

Recorded events are:

- `home-first-frame`;
- `feed-restored`;
- `magazine-update-started`;
- `chunk-appended`;
- `magazine-update-complete`;
- `questionnaire-answered`; and
- `editorial-direction-changed`.

Initial service-level gates are:

| Measure | Target |
| --- | --- |
| Warm local `home-first-frame` p95 | under 1,000 ms |
| Explicit update first new visual page | synchronous, under 1,000 ms |
| Blank content time | 0 ms by design |
| Saved-magazine restore | same initial render, not a later network phase |
| Unrequested model calls from Vibe | 0 |
| One gesture starting multiple parent updates | 0 |
| Completed answer waking its source thread | 0 |

## Failure and safety behaviour

- Empty or corrupt cache: render the bundled 24-item well.
- Storage unavailable: retain the in-memory edition.
- History read unavailable: leave Chat untouched and retry only after session state changes.
- Update session unavailable: show an update error while preserving the existing magazine.
- Update exceeds 20 minutes: cancel it and show a timeout status.
- Worker or source lane fails: omit the item or publish a smaller honest item after lead verification.
- Protected external action: describe it if useful, but perform it only from Chat with normal confirmation.
- User enters Chat during an update: the update may finish or be stopped; no next update is scheduled.

## Implementation map

- `client-src/experience/shell.jsx` — magazine presentation, Update/Stop, pull gesture, Chat escape, cards, and status.
- `client-src/experience/thread-magazine.js` — all-thread durable-history projection without Agent activation.
- `client-src/experience/live-stream-collector.js` — active-run mux deltas to complete closed Vibe chunks, with a persisted-history fallback.
- `client-src/experience/update-session.js` — the dedicated update-session identity shared by the runner and raw-summary exclusion boundary.
- `client-src/experience/refresh-control.js` — pure top-of-page pull state machine.
- `client-src/experience/recipe-runner.js` — one reusable dedicated session, overlap guard, exact Stop, and timeout.
- `client-src/experience/stream-recipe.js` — one-batch update, worker, editorial, and publication contract.
- `client-src/experience/feed.js` — bundled well, newest-first presentation, imagery, and questionnaire parsing; no scheduler.
- `client-src/experience/content-store.js` — append-only bounded presentation and visible-choice cache.
- `client-src/experience/vibe-result.js` — closed-envelope parser, safe Markdown renderer, and Vibe return tab.
- `client-src/experience/editorial-settings.js` — local editorial direction; changing it does not start work.
- `client-src/experience/background-editor.js` — fixed public radar fetch, eligibility gates, dedicated hidden session and reserve ingestion.
- `client-src/experience/reserve-store.js` — isolated signal/candidate/ready caches, activity and hard daily reservation ceiling.
- `client-src/experience/learning-store.js` — bounded on-device explicit interaction learning and reset.
- `client-src/experience/media-embed.js` — privacy-aware click-to-load YouTube, Vimeo, Spotify and SoundCloud players.
- `client-src/experience/state.js` — Vibe/Chat navigation plus saved and last-read ids.
- `client-src/experience/stream-metrics.js` — content-free local lifecycle ledger.
