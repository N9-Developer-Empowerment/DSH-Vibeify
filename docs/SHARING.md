# Sharing one Vibe article

Vibe is one private, browser-local magazine across all DSH threads. Sharing does not publish that magazine. It creates an ordinary public web page for one finished article after the reader reviews it twice.

## What the reader experiences

1. Choose **Preview and share** on a finished Vibe article.
2. A separate Coding for Justice page opens, checks the proposed public images against the permanent public-use register, and displays the exact article, fresh images or unique editorial cover, credits, supported embedded media, and source link that are eligible to leave DSH.
3. Nothing is public yet. Read the preview and close it if it is not right.
4. Choose **Publish public link** on the preview page.
5. The resulting `share.codingforjustice.org.uk/a/...` link is copied to the clipboard automatically. A visible **Copy link** button remains available if the browser blocks clipboard access or the reader wants to copy it again. The recipient needs only a web browser.

Every new public page must include a visual that has never appeared on another Vibeify public page. This is deliberately stricter than personal reading: the local magazine may reuse its small offline catalogue, but the public publisher may not. It removes crop and resize query strings before comparing URLs, permanently reserves each published visual, and does not release that reservation when an article expires or is removed.

The public priority is: an unused, exactly relevant real image or documentary photograph; an unused, story-specific generated image when generation is available and authorised; a unique AI-assisted graphic; then a one-off typographic editorial cover. The publisher ranks eligible visuals by that order. If every proposed image has appeared before—or the article is text-only—the private preview creates a 1200×630 JPEG from the reviewed title and a short excerpt of the article. It does not use the prompt, transcript or reasoning. Generated work is labelled and is never presented as photography. The final first image becomes the responsive cover and Open Graph/X preview; further unused images remain an article gallery.

If the article contains a supported YouTube, Vimeo, Spotify or SoundCloud link that Vibe presented as a player, the preview and published page retain it as a **click-to-load** media card. Playback does not start automatically. SoundCloud tracks use the provider's compact 166-pixel player rather than a video-sized frame, so the waveform and controls are visible without a large empty panel. The public contract stores only the fixed provider name, media type, bounded label and validated original HTTPS link; it rejects supplied iframe URLs, embed HTML, credentials and unrelated hosts. The shared reader can always use the visible ordinary provider link if embedding is unavailable.

Public article pages publish complete Open Graph and X summary-card metadata for the reviewed title, description, canonical URL, cover image, and image description. They also answer crawler `HEAD` requests and publish an explicit permissive `robots.txt`. X can cache the first preview it sees for an existing URL, so metadata corrections reliably apply to new shares but may require a new article URL or a repost before an already-published post shows the corrected image.

Every preview and shared page also links to the public DSH Vibeify site with an invitation to download the open-source tools and make a personal Vibe for creativity, curiosity, expression and wellbeing. That call to action is separate from the article and never changes its copy or source links.

## What crosses the boundary

The shared contract is allow-list only:

| Included | Never included |
| --- | --- |
| Article title and kind | User prompt or Chat transcript |
| Bounded rendered Markdown | Reasoning, progress, tools, or approvals |
| Publication time | DSH session, message, thread, or local chunk identity |
| Selected unused public image URLs, visual kind, alt text, credits, and source pages; or one generated cover made from the reviewed article | Attachments, private files, account data, credentials, prompts, or private Chat text |
| One separate public content/source link | Tribes, settings, interactions, questionnaires, or browser history |
| One optional YouTube, Vimeo, Spotify, or SoundCloud link and visible label | Arbitrary iframe sources, embed HTML, autoplay instructions, or unrecognised hosts |

DSH communicates only with the pinned HTTPS share origin. It checks both the response origin and the exact window it opened before sending the card. The share page cannot reach back into DSH and DSH has no publishing credential.

## Publishing and removal

The public service requires either a human check or the managed host's bounded daily publishing protection and stores the cleaned article plus the permanent public-image key register in a small database. Generated JPEG covers live in the service's object store under the random article slug. The managed protection hashes the request address with a secret and the current date, stores only that one-day fingerprint, and applies both per-reader and whole-service limits; it never stores a raw address. The service generates a random public slug and a separate high-entropy removal token. The token remains in the share site's browser storage; only its hash is stored with the article. Anyone with the public URL can read the article, but the URL does not grant deletion authority.

The operator chooses a maximum retention of 30, 90, or 365 days. The current configuration defaults to 365 days. An expiry or valid removal request makes the public URL unavailable without changing the local Vibe card.

## Operator setup

The reference host is a dependency-free Cloudflare-compatible service plus D1 under `services/vibe-share/`. The managed Sites deployment supplies the runtime, database, versioning, and exact CNAME target for the `share` subdomain; the Coding for Justice apex site, Hover nameservers, and email records remain untouched. Before first deployment:

1. build the Sites-compatible artifact with `npm run build:sites`;
2. configure the managed D1 binding as `DB`, apply `drizzle/0001_articles.sql`, then apply `drizzle/0002_unique_public_visuals.sql` to backfill and protect every existing public image;
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
