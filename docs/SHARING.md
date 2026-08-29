# Sharing one Vibe article

Vibe is one private, browser-local magazine across all DSH threads. Sharing does not publish that magazine. It creates an ordinary public web page for one finished article after the reader reviews it twice.

## What the reader experiences

1. Choose **Preview and share** on a finished Vibe article.
2. A separate Coding for Justice page opens and displays the exact article, images, credits, and source link that are eligible to leave DSH.
3. Nothing is public yet. Read the preview and close it if it is not right.
4. Choose **Publish public link** on the preview page.
5. Copy the resulting `share.codingforjustice.org.uk/a/...` link into a message or social post. The recipient needs only a web browser.

The public page includes Open Graph and large-image social metadata when the article has a suitable public image. It is responsive, uses normal semantic HTML, preserves safe HTTPS article links, and presents visual provenance separately from editorial sources.

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

The public service requires a human check and stores the cleaned article in a small database. It generates a random public slug and a separate high-entropy removal token. The token remains in the share site's browser storage; only its hash is stored with the article. Anyone with the public URL can read the article, but the URL does not grant deletion authority.

The operator chooses a maximum retention of 30, 90, or 365 days. The current configuration defaults to 365 days. An expiry or valid removal request makes the public URL unavailable without changing the local Vibe card.

## Operator setup

The reference host is a dependency-free Cloudflare Pages Function plus D1 and Turnstile under `services/vibe-share/`. Pages is used because an externally managed DNS provider can point only the `share` subdomain at `<project>.pages.dev`; the Coding for Justice apex site, Hover nameservers, and email records can remain untouched. Before first deployment:

1. create the D1 database and replace the placeholder database id in `wrangler.jsonc`;
2. apply `migrations/0001_articles.sql`;
3. create a Turnstile widget for `share.codingforjustice.org.uk`;
4. set `TURNSTILE_SECRET` as a Pages secret and `TURNSTILE_SITE_KEY` as a non-secret variable;
5. deploy the Pages project and associate `share.codingforjustice.org.uk` in its Custom domains screen;
6. add a Hover CNAME from `share` to the exact `<project>.pages.dev` hostname supplied by that deployment; and
7. deploy only after the owner confirms the public domain, DNS target, and privacy wording.

Production fails closed when D1 or the Turnstile configuration is absent. Local development may set `VIBE_SHARE_LOCAL_DEV=true`; that bypass is never part of the production configuration.

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
