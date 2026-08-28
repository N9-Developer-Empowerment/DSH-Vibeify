# VIBEs

A VIBE colour theme is a browser-local visual palette for conventional DSH Chat. It changes appearance, not agent behavior. The full-screen continuous editorial stream belongs to the separate Experience Shell. Chat's title-case **Vibe** tab returns to the newest material in that stream and is distinct from the uppercase **VIBE settings** control.

Vibe is the default home and reading surface. Normal DSH controls appear only after **Chat**. Inside Chat, conversation keeps DSH's normal formatting and controls; the Vibe tab returns to the top of the same append-only feed, which is presented newest-first. Automatic refills and explicit show/find/browse/recommend requests may publish complete closed, verified public-content chunks. In addition, every completed rendered assistant answer is projected as an in-memory Vibe card, including finished technical answers. The projection never copies the raw user prompt, attachment, hidden reasoning, tool activity, approval data, incomplete progress or worker payload, and it is not written to the persistent content cache.

The Experience Shell pairs real, credited photography with AI-assisted graphic treatment. Every valid tile receives its own topic photograph or a deterministic local fallback, and below-the-fold images decode lazily. VIBEs may change colour, type, layout, crop treatment and motion, but must not relabel generated imagery as photography or obscure photographer/source credit.

## Built-in palettes

- **System** — removes all Vibeify overrides and follows DSH's normal light/dark theme.
- **Ocean** — calm blue accents and cool surfaces.
- **Broadcast** — confident red accents with warm editorial surfaces.
- **Forest** — green accents and natural cream surfaces.
- **Synthwave** — a dark violet and neon cyan workspace.

Select **Chat**, choose **VIBE settings** near the bottom-right of the conventional DSH UI, then select a palette. The colour choice persists in that browser through local storage. It is not written into sessions, prompts, repositories, or DSH settings.

## Editorial direction

The same settings panel controls the editor's future subject mix and voice. The default is **Open mix**: broad, curious and deliberately non-demographic. Built-in alternatives are **Style & social life** and **Football, AI & cars**; **Custom direction** accepts a short reader-authored brief.

Editorial direction is explicit configuration, never an inferred profile. It is stored locally, shown in the Vibe masthead, and included in the next Codex-led refill contract. Changing it schedules a fresh editor wave. Exact custom wording remains with the Codex lead; worker packets receive bounded generic topics rather than the reader's text. The direction does not rewrite or remove existing cards and does not change the handling of ordinary Chat answers.

## What never changes

VIBEs do not change:

- the lead or worker model;
- reasoning effort;
- permissions or approvals;
- network or app access;
- model prompts, routing, data transfer, or billing when changing colour themes;
- another user's browser.

Editorial direction is the one content-setting exception in this panel: it intentionally changes later editor-refill prompts, but never model selection, reasoning level, permissions, routing, approvals or billing.

## Add a palette

Developers can add one entry to `VIBE_PRESETS` in `plugins/dsh-vibeify/client-src/legacy-client.template.js`, then run `npm run build:client`. Use existing DSH CSS variables so the palette remains compatible with DSH components. Every palette should include readable foreground/background contrast and visible focus states.

After changing the client, run the repository validation and reinstall the local DSH bundle. Start a new DSH process only after active tasks have finished.
