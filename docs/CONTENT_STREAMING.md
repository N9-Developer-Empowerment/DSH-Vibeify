# Vibe generated-content streaming method

This document is the product and engineering contract for Vibe. The useful analogy is audio or video playout: the reader consumes one continuous edition while a local well, a persistent cache, and background generation keep enough material ahead of their reading position that generation time is normally invisible.

## Product decision

Vibe is the product, not a launcher. Opening DSH opens a full-screen website-like editorial feed containing useful material immediately. There is no guide catalogue, recipe selection, prompt box, player-to-result transition, loading page, or ordinary DSH chrome inside Vibe.

The only lean-forward escape is **Chat**. Chat reveals the conventional DSH conversation and technical controls. Its **Vibe** tab returns to the continuous feed. Returning or reloading always lands on Vibe; Chat is never remembered as the next home.

```text
open DSH
  -> render saved stream and bundled editorial well synchronously
  -> start background refill after the first frame
  -> add each complete verified semantic chunk at the top
  -> keep older material available below

click Chat
  -> reveal conventional DSH Chat / Trajectory / sessions / settings
click Vibe
  -> return to the newest item at the top of the same continuous edition
```

## Playout model

Vibe uses four layers. The layers are implementation details; the page presents them as one uninterrupted editorial experience.

| Layer | Purpose | Current implementation |
| --- | --- | --- |
| L0 bundled well | Cold-start guarantee | 24 deterministic editorial chunks built from the validated catalogue and bundled credited photography. Text, images and questionnaires need no network or model call. |
| L1 saved stream | Return-visit continuity | Up to 160 append-only chunks and 32 short questionnaire answers in bounded browser storage, with a 30-day expiry. |
| L2 background refill | New depth and variety | Automatic batches of eight closed semantic chunks from fresh Codex-led DSH sessions. Three warm-up refills are attempted per Vibe visit; further refills use low-water demand. |
| L3 Chat projection | Conversation continuity | Every completed rendered assistant answer becomes a newest-first in-memory card. Raw prompts and working detail stay in Chat; automatic projections never enter L1 storage. |

L0 and L1 are read synchronously during React state initialisation. They contain no await, network request, provider call, or dependency on the DSH session becoming ready. That is the basis of the under-one-second first-content target.

## Buffer policy

The current policy is deliberately simple and measurable:

- bundled well: 24 chunks;
- generated batch: 8 chunks;
- high-water target: 64 chunks;
- low-water threshold: fewer than 14 chunks ahead of the reader;
- warm-up: at least 3 sequential background refill runs per Vibe visit, continuing toward high water;
- safety ceiling: 6 automatic refill runs per visit.

The first refill is scheduled after the first rendered frame so it does not compete with initial content. Refill waves are sequential at the DSH-session level because the browser runner can prove a fresh idle session before submitting one request. Inside each wave, the Codex lead may use multiple independent source, culture, media, and editorial lanes under the live host policy. A completed wave triggers the next warm-up wave. Later, the scroll position triggers another wave before the reader reaches the tail.

There is no “load more” control or loading spinner. If the runner cannot prove that a fresh session is safe, it fails closed and the already-present well remains readable. It does not submit into an unrelated Chat session or turn failure text into content.

## Append-only storage, newest-first reading

Generated content uses closed envelopes:

```text
<vibe-chunk id="refill-id-unique-item" kind="article" title="Reader-facing title">
Complete Markdown for one semantic item.
</vibe-chunk>
```

Allowed kinds are `article`, `editorial`, `recommendation`, `image`, `music`, `video`, and `questionnaire`. Automatic refills use this transport, and a user-explicit request to show, find, browse or recommend public reader-facing content may use it from Chat. The collector ignores plans, tool activity, ordinary progress, private or draft source material, raw worker output and incomplete envelopes.

Every browser run namespaces its chunk ids. Reusing a semantic id in a later run therefore creates a new entry rather than updating an old one. Storage remains append-only, but presentation reverses arrival order so each new item appears above the earlier edition. Earlier material is never silently replaced or collapsed into a canonical result. If deeper research changes the picture, the editor publishes a new follow-up such as “I dug further into this…” and explains the change in context.

Completed Chat answers use a second path. Once DSH marks an assistant answer settled, the browser rebuilds safe Markdown from that rendered result and places it at the top. All settled answers in the visible conversation are eligible, including technical answers; Chat remains the detailed source view. Explicit user-role rows, prompts, reasoning, tool activity, approvals and incomplete output are excluded. These cards are memory-only and can be reconstructed from the current visible conversation after reload. Their bounded titles also become soft topic signals for a later refill, so Chat interests can alter the editor's subject mix without sending the raw prompt.

This is intentionally different from token streaming. A chunk is a complete reading or interaction unit: its paragraph, list, citation cluster, media links, or questionnaire stay together. Small semantic units reduce time to the next useful item without creating broken prose or jumpy layout.

## Questionnaire method

Questionnaires are content, not interruptions. They appear as designed cards among articles and images, normally with two to six one-tap options. The stream continues regardless of whether the reader answers.

The browser stores only the visible chosen label and the chunk id. A later refill receives recent labels as soft editorial signals. They are not treated as personal facts, commands, diagnoses, or a profile. They never modify an already-running refill, which keeps the causal contract honest.

Choices must have a real downstream effect. Vibe can create the visual abundance and low-friction exploration familiar from streaming services, but it must not present a button as meaningful when the system knowingly ignores it. When Codex delegates, it converts any useful signal into a bounded topic task; it does not copy private questionnaire input into a worker packet merely to save quota.

## Worker method

Vibe can spend substantial background effort, but concurrency is useful only when it increases verified playout rate.

1. The browser publishes L0/L1 with no worker.
2. The Codex lead receives one refill contract and releases a fast non-current editorial text chunk first.
3. Independent bounded lanes can check sources, visual culture, music/video routes, recommendations, or questionnaire ideas.
4. Codex verifies each lane and releases a closed chunk as soon as that chunk is safe; a slow lane cannot hold an earlier completed item.
5. Chat receives a short refill record rather than a second copy of the edition.
6. The buffer scheduler starts the next refill only after the prior DSH session has completed or the reader reaches low water.

The browser does not directly create tens of provider calls. It creates bounded refill waves. The Codex lead decides the appropriate lane count for each wave, keeps approval and privacy decisions, verifies artifacts and sources, and remains final acceptance authority. This allows many workers over a long reading session without turning uncontrolled fan-out, duplicated searches, or verification debt into a slower stream.

## Persistent store

`dsh-vibeify.feed.v2` contains only allow-listed presentation data:

```text
chunk: id, kind, source class, title, Markdown, catalogue topic id, published time
answer: chunk id, visible option label, answered time
```

It never accepts prompts, DSH session ids, account data, attachments, arbitrary form values, automatic Chat projections, worker payloads, or credentials. Deliberately published closed public-content chunks may persist; completed Chat cards remain in memory only. Entries expire after 30 days. Duplicate ids retain the first entry. Oldest entries fall out after 160 chunks. Corrupt, future-dated, oversized, wrong-version, stale, or malformed entries are discarded. Quota failure disables persistence without disabling the page.

The current synchronous store is intentionally bounded. If measurement shows that richer media metadata or a larger well makes parsing material to the first-frame budget, the next storage layer should be IndexedDB with a small synchronous index and an in-memory L0 well—not unbounded `localStorage`.

## Measurement

The local content-free ledger records at most 200 timing events. A record has exactly: event, run id, duration in milliseconds, source class, and timestamp. It contains no content, URL, answer, prompt, session, account, or worker payload and performs no analytics request.

Recorded events are:

- `home-first-frame` — navigation start to first Vibe frame;
- `feed-restored` — saved/bundled stream available to the page;
- `buffer-run-started` — automatic refill handed to the runner;
- `chunk-appended` — one or more closed fresh chunks entered the feed;
- `buffer-run-complete` — refill session reached a completed answer;
- `buffer-low-water` — reading position crossed the refill threshold;
- `questionnaire-answered` — an interaction occurred, without recording its answer.
- `editorial-direction-changed` — the local direction changed, without recording its label or custom text.

Initial service-level gates are:

| Measure | Target |
| --- | --- |
| Warm local `home-first-frame` p95 | under 1,000 ms |
| Blank content time | 0 ms by design |
| Saved-stream restore | same initial render, not a later network phase |
| Reader reaches an empty tail | 0 normal sessions |
| Gap between ready verified chunks | measured by refill and content category before changing lane count |

The important operational measurement is not only model duration. It is **buffer ahead in readable chunks divided by observed consumption rate**. That converts worker and research latency into the same question a media player asks: how many minutes of useful material remain before underrun?

## Failure and safety behaviour

- Empty/corrupt cache: render the bundled 24-chunk well.
- Storage unavailable: keep the in-memory edition and timing-free operation.
- Fresh session unavailable: stop automatic refills for the visit; do not expose an error page.
- Worker/source lane failure: omit that item or publish a smaller honest item after Codex verification.
- Repeated semantic topic: append a contextual follow-up, never mutate the earlier entry.
- Protected external action: describe it in content if useful, but perform it only from Chat with the normal confirmation.
- Chat opened during a refill: the active task may finish, but new refill waves do not start until the reader returns to Vibe.

## Implementation map

- `client-src/experience/shell.jsx` — continuous website shell, scroll playout, automatic refill scheduler, questionnaire cards, Chat escape, and timing hooks.
- `client-src/experience/feed.js` — 24-chunk bundled well, newest-first presentation, questionnaire parsing, and high/low-water policy.
- `client-src/experience/content-store.js` — append-only bounded stream and visible-answer cache.
- `client-src/experience/editorial-settings.js` — local default, preset and custom direction with bounded sanitisation.
- `client-src/experience/stream-recipe.js` — continuous refill, editorial direction, recent-Chat topic, worker and publication contract.
- `client-src/experience/recipe-runner.js` — fresh-session fail-closed submission.
- `client-src/experience/vibe-result.js` — closed-chunk collector, completed-Chat projector, safe Markdown renderer, completion detector, and the Vibe return tab inside Chat.
- `client-src/experience/state.js` — Vibe/Chat navigation plus saved and last-read ids.
- `client-src/experience/stream-metrics.js` — content-free duration and buffer event ledger.

## Next evidence-led improvements

- Replace chunk-count buffering with measured reading-time estimates per format and per reader.
- Schedule media discovery earlier when text buffer is healthy, so images, audio, and video arrive before they are needed.
- Add a dedicated multi-wave host scheduler if browser-session sequencing becomes the bottleneck; do not infer this merely from worker count.
- Learn which questionnaire placements increase continued reading without becoming repetitive or manipulative.
- Separate durable and perishable expiry rules: prices and availability should age faster than essays or creator profiles.
- Introduce IndexedDB and media-aware pre-caching when the content mix justifies it.
- Measure topic repetition and editorial transition quality, not only quantity and latency.
