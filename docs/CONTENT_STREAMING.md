# Vibe magazine lifecycle

This document is the product and engineering contract for Vibe. Vibe is one local, newest-first magazine shared by all DSH Chat threads. It is not a second chat client and it is not an autonomous background agent.

## Product decision

Opening DSH opens a full-screen website-like edition containing useful material immediately. **Chat** remains the request, progress, approval, Queue, Steer, and evidence surface. A Chat thread runs only after the user sends it a request; after its answer completes, that turn stops. The completed answer remains visible in Chat and can also become a formatted Vibe card.

Vibe changes for exactly two reasons:

1. a Chat turn in any local DSH thread durably finishes with `turn/end: completed`; or
2. the user deliberately pulls down at the top of Vibe or presses **Update**.

Opening Vibe, scrolling, reaching the bottom, changing editorial settings, finishing an update, and returning from Chat never start model work.

```text
send a Chat request
  -> that thread runs one turn
  -> the final answer is visible in Chat
  -> durable completion is read locally
  -> a sanitized copy joins the shared Vibe magazine
  -> the Chat thread is idle

pull down at the top / press Update
  -> one dedicated magazine session receives one bounded update
  -> complete verified chunks join the top as they become ready
  -> the update turn completes and stops

press Stop update
  -> cancel only the dedicated magazine update session
```

## Four content layers

The layers are implementation details; the reader sees one uninterrupted magazine.

| Layer | Purpose | Model work |
| --- | --- | --- |
| Bundled well | Cold-start guarantee: 24 deterministic editorial chunks with credited local photography | None |
| Saved magazine | Return-visit continuity: up to 160 bounded items and 32 short questionnaire choices for 30 days | None |
| Completed Chat answers | Conversation continuity across every local DSH thread | None beyond the Chat turn the user already requested |
| Explicit magazine update | New editorial depth and variety in one batch of eight complete semantic chunks | One bounded turn, only after Pull to update or Update |

Bundled and saved content are read synchronously during initial state creation. They contain no await, provider request, or dependency on a DSH session becoming ready. This provides useful first content without starting invisible work.

## Completed Chat projection

The browser subscribes to DSH's session list and considers only idle, non-blank sessions whose durable activity changed. It pages through `session.history`, which can inspect a cold persisted log without resuming or publishing an Agent.

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

The runner reuses one session titled `VIBE magazine updates` and does not navigate the UI to it. Reuse avoids creating a growing stack of `VIBE continuous edition` sessions. One update may use multiple bounded worker lanes behind the active lead, but the lead verifies each publishable item and the parent turn still has one stop condition.

## Complete semantic chunks

Explicit updates and user-directed public-content answers can progressively publish complete envelopes:

```text
<vibe-chunk id="update-id-unique-item" kind="article" title="Reader-facing title">
Complete Markdown for one semantic item.
</vibe-chunk>
```

Allowed kinds are `article`, `editorial`, `recommendation`, `image`, `music`, `video`, and `questionnaire`. The collector accepts only complete closed envelopes. Plans, partial paragraphs, raw search notes, tool activity, private or draft material, unverified worker prose, and incomplete envelopes stay out of Vibe.

Each update namespaces ids so a later update appends rather than replaces. Storage order remains append-only; presentation reverses arrival order so the newest item appears first. If later checking changes the picture, publish a clearly contextualised follow-up instead of silently rewriting the old item.

## Questionnaire method

Questionnaires are optional content cards with two to six one-tap choices. The browser stores only the visible chosen label and the chunk id. A choice can influence the next explicitly requested update, but it never starts one and never modifies work already in flight.

Choices are soft editorial signals, not personal facts, commands, diagnoses, or a profile. When the lead delegates, it converts a useful choice into a bounded topic task instead of copying private reader input into a worker packet merely to save quota.

## Worker method

One explicit update can use several independent lanes when this improves verified delivery:

1. the lead receives one update contract and acceptance boundary;
2. a fast, non-current editorial item can be prepared first;
3. separate source, culture, media, recommendation, or questionnaire lanes may run;
4. the lead verifies each artifact or source before releasing a closed chunk;
5. a slow lane cannot block an earlier completed item; and
6. the parent update finishes after the requested batch and does not ask for another run.

The browser does not create a fan-out of provider calls itself. The lead selects an appropriate bounded lane count under the live routing, privacy, approval, and cost policy.

## Browser-local persistence

`dsh-vibeify.feed.v2` uses schema version 3 and stores only allow-listed presentation data:

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
- `client-src/experience/refresh-control.js` — pure top-of-page pull state machine.
- `client-src/experience/recipe-runner.js` — one reusable dedicated session, overlap guard, exact Stop, and timeout.
- `client-src/experience/stream-recipe.js` — one-batch update, worker, editorial, and publication contract.
- `client-src/experience/feed.js` — bundled well, newest-first presentation, imagery, and questionnaire parsing; no scheduler.
- `client-src/experience/content-store.js` — append-only bounded presentation and visible-choice cache.
- `client-src/experience/vibe-result.js` — closed-envelope parser, safe Markdown renderer, and Vibe return tab.
- `client-src/experience/editorial-settings.js` — local editorial direction; changing it does not start work.
- `client-src/experience/state.js` — Vibe/Chat navigation plus saved and last-read ids.
- `client-src/experience/stream-metrics.js` — content-free local lifecycle ledger.
