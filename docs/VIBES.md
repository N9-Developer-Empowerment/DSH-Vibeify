# VIBEs

A VIBE colour theme is a browser-local visual palette for conventional DSH Chat. It changes appearance, not agent behavior. The full-screen continuous editorial stream belongs to the separate Experience Shell. Chat's title-case **Vibe** tab returns to the newest material in that stream and is distinct from the uppercase **VIBE settings** control.

For the complete relationship between Vibe, Chat, DSH, lead agents, workers, and the local content reserve, see [How DSH Vibeify works](HOW_IT_WORKS.md).

Vibe is the default home and reading surface. Normal DSH controls appear only after **Chat**. Inside Chat, conversation keeps DSH's normal formatting and controls; the Vibe tab returns to the top of one append-only magazine shared across all local threads and presented newest-first. A durably completed assistant answer is projected as a bounded browser-local card without reopening or resuming its thread. Explicit show/find/browse/recommend requests may publish richer closed, verified public-content chunks. The projection never copies the raw user prompt, attachment, hidden reasoning, tool activity, approval data, session identifier, incomplete progress or worker payload.

Vibe never changes its visible magazine merely because it was opened, scrolled, reached the tail, or changed direction. A separate hidden reserve may refill only under the documented recent-use, visibility, capacity and spending gates. Pull down from the top or press **Update** to release one editorial pass. Ready pages arrive immediately; a local visual short and questionnaire cover an empty reserve, and complete foreground pages stream only when more material is needed. On a Mac trackpad, place the magazine at the top, pull down with two fingers until **Release to update** appears, then release. A gesture that begins lower in the magazine remains ordinary scrolling and cannot start work. **Stop update** cancels only the foreground magazine turn. Completing one batch cannot start another.

The Experience Shell mixes real, credited photography with clearly labelled AI-assisted vector graphics. Every valid tile receives a deterministic bundled visual immediately, varies its crop and treatment, exposes a visual-source or provenance link, and decodes below-the-fold media lazily. Those twelve local assets are an offline reserve rather than a closed catalogue: every explicit Update asks for newly verified public imagery, avoids the most recently used URLs, and keeps the new source metadata with the bounded magazine card. VIBEs may change colour, type, responsive layout, crop treatment and motion, but must not relabel generated imagery as photography or obscure photographer/source credit.

## Built-in palettes

- **System** — removes all Vibeify overrides and follows DSH's normal light/dark theme.
- **Ocean** — calm blue accents and cool surfaces.
- **Broadcast** — confident red accents with warm editorial surfaces.
- **Forest** — green accents and natural cream surfaces.
- **Synthwave** — a dark violet and neon cyan workspace.

Select **Chat**, choose **VIBE settings** near the bottom-right of the conventional DSH UI, then select a palette. The colour choice persists in that browser through local storage. It is not written into sessions, prompts, repositories, or DSH settings.

## Editorial direction

The same settings panel controls the editor's future subject mix and voice. It is about audiences and perspective rather than a fixed list of topics. Select any combination of **Global & curious**, **Gen Z**, **Creators & influencers**, **Builders & nerds**, **Entrepreneurs**, **Self-development**, **Parents & families**, **Life-experienced**, **Culture & arts**, **Music communities**, **Gamers**, **Sports communities**, **Sustainability**, **Politics & society**, and **Local life**. Global & curious is the neutral default. A useful-surprise slider lets some worthwhile material arrive from outside the selected lenses, and the free-text editor note refines the brief.

The panel also exposes the hidden-reserve switch, a DeepSeek daily maximum capped at US $2, and gentle content notes. Its **Reset what the editor has learned** action removes the local interaction history. The editor can learn only from explicit saves, opens, plays, skips and questionnaire answers; it does not infer protected traits or upload a behavioural profile.

Editorial direction is explicit configuration, never an inferred identity. It is stored locally and shapes later reserve preparation or a requested foreground update. Changing it does not immediately start work. Exact custom wording remains with the lead; worker packets receive bounded generic topics rather than the reader's text. The direction does not rewrite or remove existing cards and does not change the handling of ordinary Chat answers.

## Visual provenance

The local bundle contains six credited Unsplash photographs and six AI-assisted SVG compositions authored for Vibeify. A card labels the former **Photograph** and links the named photographer's source page; it labels the latter **AI-assisted graphic** and links here. These assets are packaged with the plugin, so changing cards, resizing the window, or opening the magazine makes no image-generation request and does not wait for a remote image host.

An explicit Update renews the rolling catalogue. At least two generated cards must start with a newly verified public image and its human-readable creator or source link. The browser accepts direct HTTPS media only from the small reviewed image-host list, sends no referrer, rejects arbitrary hosts, remembers the 24 most recently used remote URLs so the next update can avoid them, and substitutes the card's local fallback if loading fails. The generated image URL and source link live only inside the same 30-day, 160-card browser cache as the rest of the magazine. Opening or reading Vibe never performs this renewal by itself.

The grid uses explicit `compact`, `feature`, `wide`, and `hero` layouts rather than positional selectors. It packs densely on a large screen, becomes two columns on a medium screen, and becomes one readable column on phones. A visual-source or graphic-provenance link remains visible on every panel. Generated recommendation, image, music and video panels must additionally include a relevant verified link; text-led panels may instead carry the complete useful copy.

## What never changes

VIBEs do not change:

- the lead or worker model;
- reasoning effort;
- permissions or approvals;
- network or app access;
- model prompts, routing, data transfer, or billing when changing colour themes;
- another user's browser.

Editorial direction is the one content-setting exception in this panel: it intentionally changes the next explicit magazine-update prompt, but never model selection, reasoning level, permissions, routing, approvals or billing.

## Add a palette

Developers can add one entry to `VIBE_PRESETS` in `plugins/dsh-vibeify/client-src/legacy-client.template.js`, then run `npm run build:client`. Use existing DSH CSS variables so the palette remains compatible with DSH components. Every palette should include readable foreground/background contrast and visible focus states.

After changing the client, run the repository validation and reinstall the local DSH bundle. Start a new DSH process only after active tasks have finished.
