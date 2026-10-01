# Sharing one Vibe article

Vibe is one private, browser-local magazine across all DSH threads. Sharing does not publish that magazine. It creates an ordinary public web page for one finished article after the reader reviews it twice.

## What the reader experiences

1. For a link that is already public, choose **Share link** on the Vibe card. When the browser supports native sharing, **Share…** opens its share sheet; **Copy link** and the selectable URL remain available everywhere.
2. To make a private Vibe article public, choose **Preview and share** on the finished article.
3. A separate Coding for Justice page opens and displays the exact article, the selected Vibe image or an editorial cover for an image-free article, credits, supported embedded media, and source link that are eligible to leave DSH.
4. Nothing is public yet. Read the preview and close it if it is not right.
5. Choose **Publish public link** on the preview page.
6. After publishing succeeds, the page shows the `share.codingforjustice.org.uk/a/...` URL in a selectable field with **Copy link** and, when supported, **Share…**. Copy failure selects the URL so it can be copied manually. Publishing does not post to a social network; any social post still needs the reader's separate action in that service.

Opening a native share sheet is not evidence that a social post went live. The share page treats cancelling the sheet as normal and keeps the public URL available. Vibeify never schedules, queues or automatically posts a shared link.

The selected lead image in the local Vibe remains the lead image in the private preview and public article, including its Open Graph/X preview. Its source credit and alt text travel with it. The image may also appear on another public Vibe article; reuse does not cause a replacement. If the article has no shareable public image, the private preview creates a 1200×630 JPEG from the reviewed title and a short excerpt of the article. It does not use the prompt, transcript or reasoning. Generated work is labelled and is never presented as photography. Inline images remain in the article gallery.

If the article contains a supported YouTube, Vimeo, Spotify or SoundCloud link that Vibe presented as a player, the preview and published page retain a visible, lazily loaded media player. Playback starts only when the reader chooses it in the player. SoundCloud tracks use the provider's compact 166-pixel player rather than a video-sized frame, so the waveform and controls are visible without a large empty panel. The public contract stores only the fixed provider name, media type, bounded label and validated original HTTPS link; it rejects supplied iframe URLs, embed HTML, credentials and unrelated hosts. The shared reader can always use the visible ordinary provider link if embedding is unavailable.

Public article pages publish complete Open Graph and X summary-card metadata for the reviewed title, description, canonical URL, cover image, and image description. They also answer crawler `HEAD` requests and publish an explicit permissive `robots.txt`. X can cache the first preview it sees for an existing URL, so metadata corrections reliably apply to new shares but may require a new article URL or a repost before an already-published post shows the corrected image.

Every preview and shared page also links to the public DSH Vibeify site with an invitation to download the open-source tools and make a personal Vibe for creativity, curiosity, expression and wellbeing. That call to action is separate from the article and never changes its copy or source links.

## What crosses the boundary

The shared contract is allow-list only:

| Included | Never included |
| --- | --- |
| Article title and kind | User prompt or Chat transcript |
| Bounded rendered Markdown | Reasoning, progress, tools, or approvals |
| Publication time | DSH session, message, thread, or local chunk identity |
| Selected public image URLs, visual kind, alt text, credits, and source pages; or one generated cover made from the reviewed article | Attachments, private files, account data, credentials, prompts, or private Chat text |
| One separate public content/source link | Tribes, settings, interactions, questionnaires, or browser history |
| One optional YouTube, Vimeo, Spotify, or SoundCloud link and visible label | Arbitrary iframe sources, embed HTML, autoplay instructions, or unrecognised hosts |

DSH communicates only with the pinned HTTPS share origin. It checks both the response origin and the exact window it opened before sending the card. The share page cannot reach back into DSH and DSH has no publishing credential.

## Publishing and removal

The public service requires either a human check or the managed host's bounded daily publishing protection and stores the cleaned article in a small database. Generated JPEG covers live in the service's object store under the random article slug. The managed protection hashes the request address with a secret and the current date, stores only that one-day fingerprint, and applies both per-reader and whole-service limits; it never stores a raw address. The service generates a random public slug and a separate high-entropy removal token. The token remains in the share site's browser storage; only its hash is stored with the article. Anyone with the public URL can read the article, but the URL does not grant deletion authority.

The operator chooses a maximum retention of 30, 90, or 365 days. The current configuration defaults to 365 days. An expiry or valid removal request makes the public URL unavailable without changing the local Vibe card.

## Operator setup

The reference host is a dependency-free Cloudflare-compatible service plus D1 under `services/vibe-share/`. The managed Sites deployment supplies the runtime, database, versioning, and exact CNAME target for the `share` subdomain; the Coding for Justice apex site, Hover nameservers, and email records remain untouched. Before first deployment:

1. build the Sites-compatible artifact with `npm run build:sites`;
2. configure the managed D1 binding as `DB` and apply `drizzle/0001_articles.sql`; existing deployments may retain the unused `published_visuals` table;
3. configure the managed R2 binding as `COVERS` for one-off generated JPEG covers;
4. set `VIBE_SHARE_RATE_SECRET` as a managed secret and keep the default per-reader and global daily limits, or explicitly configure stricter values;
5. optionally create a Turnstile widget and set `TURNSTILE_SECRET` plus `TURNSTILE_SITE_KEY` to replace the managed rate check with a visible human check;
6. deploy the public Site and associate `share.codingforjustice.org.uk`;
7. add a Hover CNAME from `share` to the exact target supplied by the managed deployment; and
8. deploy only after the owner confirms the public domain, DNS target, and privacy wording.

Production fails closed when D1 is absent or neither publishing protection is configured. Local development may set `VIBE_SHARE_LOCAL_DEV=true`; that bypass is never part of the production configuration.

Run the dependency-free checks with:

```bash
cd services/vibe-share
npm test
```

For a private local visual preview:

```bash
cd services/vibe-share
npm run dev
```

## Bundled pictorial illustrations

CC0 Open Doodles artwork is shared by a fixed illustration ID. The server checks that ID against the shipped catalogue, supplies canonical creator/credit metadata, and serves only the known SVG at `/illustrations/<id>.svg`. The private preview rasterises the same drawing to a bounded JPEG. Explicit publication stores that JPEG as the article and social cover while preserving its illustration label and creator. Arbitrary SVG, altered credits, private local paths and unknown asset IDs are not accepted.

Self-contained `vibe-app` panels travel with their article Markdown. Private previews and public articles use the same parser and isolated iframe policy. Per-response nonces allow the inline app scripts without granting arbitrary inline scripts to the containing article page. The child policy still blocks remote scripts, requests and form submissions. Embedded form answers stay in the frame and are not added to the publication snapshot.

The built-in `:::vibe-game mochi-meadow` directive also travels unchanged with article Markdown. The magazine, private preview and public reader use the same portable game. Each reader starts with a fresh round and best score; gameplay and form state never cross the sharing boundary. The directive and self-contained `vibe-app` source are article content, not an external iframe URL.

Deploy the updated share service separately from local activation: `npm run build:sites` includes both `vibe-interactive.js` and its `mochi-meadow.js` dependency. An older share service may still display the directive as text. An already published article containing the former local-only placeholder needs a new reader-reviewed share to carry the game; updating the renderer cannot reconstruct a removed directive.

## Single-article layout

Private previews and published articles share one responsive layout. The article uses the viewport width with modest adaptive side gutters; the preview does not apply a second nested width limit. The stylesheet separates three layout roles: a broad headline (1040px maximum), readable prose (68ch), and full-width games, interactive panels and tables. The article body itself remains full width; a three-track grid places prose in the middle track and wide blocks across all tracks. This avoids shrinking games when adjusting typography. Both preview and publication use these same rules, including section headings, introductory text, list spacing and source credits. Mobile gutters and controls remain responsive.

### Layout ownership and embedded app sizing

- `services/vibe-share/src/styles.mjs` owns the shared page layout for preview and publication. `render.mjs` supplies markup only. The build copies this stylesheet module into the deployable worker.
- `shared/interactive-layout.js` owns fitting authored fixed-width apps. It measures the app root’s declared pixel maximum width, scales the complete app uniformly to the iframe width, and reports its content height. This preserves canvas coordinates, control proportions and game code. Apps without a pixel width cap retain their responsive layout.
- Both sharing renderers use `interactiveDocument(..., true)` and the same parent sizing listener. Size messages are accepted only from a currently displayed sandbox iframe and are bounded. No frame receives parent document access; the existing CSP and sandbox remain in force.
- The local magazine keeps its existing sizing until explicitly changed. Preview and published articles load the shared sizing runtime, including when the article has no external media player.

Regression fixtures cover the reported 700px game and 500px demo roots, viewport shrinking, complete scaled height, unrelated-window rejection and height limits. Browser/game acceptance remains a separate visual check.

### HTML and browser-script version agreement

The page renderer takes `APP_SCRIPT_PATH` from the same module that builds `APP_JS`. The URL contains a fingerprint of the complete generated source, including shared runtime functions. A new build therefore cannot reuse an hour-old `/app.js` from the browser cache. Script responses are not stored, and requests for an outdated fingerprint require a page reload. The HTTP regression test checks both preview and published HTML against the exact script served by the worker; function-only tests cannot establish this release boundary.


## Image composition and media players

Images have a distinct layout role from interactive apps. Lead photographs preserve their complete natural aspect ratio inside a centered frame capped at 1040px wide and the smaller of 75% of the viewport height or 720px. Portraits are never forced into a landscape crop; gallery images use containment too. Games retain the full article content width.

Fixed-provider media players appear directly in private preview and publication, load lazily and never autoplay. `services/vibe-share/src/media.mjs` owns the single player URL policy, used by server markup and serialized into the browser client. The transfer still accepts only the cleaned provider link, never supplied iframe markup or code. YouTube uses its privacy-enhanced player; the external provider link remains available if embedding is restricted.
