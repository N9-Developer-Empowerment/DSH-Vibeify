# Sharing one Vibe article

Vibe is one private, browser-local magazine across all DSH threads. Sharing does not publish that magazine. It creates an ordinary public web page for one finished article after the reader reviews it twice.

## What the reader experiences

1. Choose **Preview and share** on a finished Vibe article.
2. A separate Coding for Justice page opens and displays the exact article, images, credits, and source link that are eligible to leave DSH.
3. Nothing is public yet. Read the preview and close it if it is not right.
4. Choose **Publish public link** on the preview page.
5. The resulting `share.codingforjustice.org.uk/a/...` link is copied to the clipboard automatically. A visible **Copy link** button remains available if the browser blocks clipboard access or the reader wants to copy it again. The recipient needs only a web browser.

Every new public page must include at least one selected public image. A Vibe card backed by a bundled local photograph transfers the credited public copy of that photograph; remote editorial images keep their reviewed public URL. The first selected image becomes the responsive cover and social preview, with further images retained as an article gallery. Older text-only links remain readable. The page uses normal semantic HTML, preserves safe HTTPS article links, and presents visual provenance separately from editorial sources.

Every preview and shared page also links to the public DSH Vibeify site with an invitation to download the open-source tools and make a personal Vibe for creativity, curiosity, expression and wellbeing. That call to action is separate from the article and never changes its copy or source links.

## What crosses the boundary

The shared contract is allow-list only:

| Included | Never included |
| --- | --- |
| Article title and kind | User prompt or Chat transcript |
| Bounded rendered Markdown | Reasoning, progress, tools, or approvals |
| Publication time | DSH session, message, thread, or local chunk identity |
| Selected public image URLs, alt text, credits, and source pages | Attachments, private files, account data, or credentials |
| One separate public content/source link | Tribes, settings, interactions, questionnaires, or browser history |

DSH communicates only with the pinned HTTPS share origin. It checks both the response origin and the exact window it opened before sending the card. The share page cannot reach back into DSH and DSH has no publishing credential.

## Publishing and removal

The public service requires either a human check or the managed host's bounded daily publishing protection and stores the cleaned article in a small database. The managed protection hashes the request address with a secret and the current date, stores only that one-day fingerprint, and applies both per-reader and whole-service limits; it never stores a raw address. The service generates a random public slug and a separate high-entropy removal token. The token remains in the share site's browser storage; only its hash is stored with the article. Anyone with the public URL can read the article, but the URL does not grant deletion authority.

The operator chooses a maximum retention of 30, 90, or 365 days. The current configuration defaults to 365 days. An expiry or valid removal request makes the public URL unavailable without changing the local Vibe card.

## Operator setup

The reference host is a dependency-free Cloudflare-compatible service plus D1 under `services/vibe-share/`. The managed Sites deployment supplies the runtime, database, versioning, and exact CNAME target for the `share` subdomain; the Coding for Justice apex site, Hover nameservers, and email records remain untouched. Before first deployment:

1. build the Sites-compatible artifact with `npm run build:sites`;
2. configure the managed D1 binding as `DB` and apply `drizzle/0001_articles.sql`;
3. set `VIBE_SHARE_RATE_SECRET` as a managed secret and keep the default per-reader and global daily limits, or explicitly configure stricter values;
4. optionally create a Turnstile widget and set `TURNSTILE_SECRET` plus `TURNSTILE_SITE_KEY` to replace the managed rate check with a visible human check;
5. deploy the public Site and associate `share.codingforjustice.org.uk`;
6. add a Hover CNAME from `share` to the exact target supplied by the managed deployment; and
7. deploy only after the owner confirms the public domain, DNS target, and privacy wording.

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
