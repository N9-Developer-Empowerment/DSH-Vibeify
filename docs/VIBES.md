# VIBEs

A VIBE colour theme is a browser-local visual palette for conventional DSH Chat. It changes appearance, not agent behavior. The full-screen continuous editorial stream belongs to the separate Experience Shell. Chat's aligned **VIBE** navigation tab returns to the newest material in that stream and is distinct from the **VIBE settings** control.

For the complete relationship between Vibe, Chat, DSH, lead agents, workers, and the local content reserve, see [How DSH Vibeify works](HOW_IT_WORKS.md).

Vibe is the default home and reading surface. Normal DSH controls appear after **Chat**. Returning readers open their retained edition with the newest reader pages first. Once an editorial direction is configured, the welcome tutorials and unrelated sample catalogue no longer fill the magazine. A first visit with no configured direction or retained articles can still show the local welcome issue without a provider call. **Update my magazine**, **Update**, and **Update VIBE now** explicitly request new content; opening the app never starts a paid foreground update.

When the reader specifically wants an edited visual article or series, the recommended prompt begins **“Make a Vibe about…”**. The plugin gives DSH's active lead a Vibe publishing contract, and this phrase makes the intended route explicit: complete verified cards, relevant imagery, content links and progressive publication while later work continues. Ordinary completed Chat answers can still join the magazine after completion, but they are not guaranteed to receive that richer editorial treatment. **Make/create/write a Vibe** and **turn this into a Vibe** are equivalent explicit instructions.

Inside Chat, conversation keeps DSH's normal formatting and controls; the Vibe tab returns to the top of one magazine shared across all local threads. On relaunch, locally saved reader pages return first. Any completed Chat page or closed verified public-content chunk that arrives during the current visit is appended normally and therefore rises above the welcome issue. A durably completed assistant answer is projected as a bounded browser-local card without reopening or resuming its thread. The projection never copies the raw user prompt, attachment, hidden reasoning, tool activity, approval data, session identifier, unfinished envelope, incomplete progress or worker payload.

Choose **Find Vibes** in the magazine header to browse or search the retained reader-specific cards by title and article text. Search is entirely browser-local. The same 30-day, 160-card limit still applies, but up to 96 completed Chat-made Vibes have protected room so a large editorial refill cannot displace all of the reader's commissioned work. The durable DSH session-history fallback can restore eligible completed answers after a relaunch even while the local library is still filling; it never resumes those threads.

Vibe never changes its visible magazine merely because it was opened, scrolled, reached the tail, or changed direction. A separate hidden reserve may refill only under the documented recent-use, visibility, capacity and spending gates. Pull down from the top or press **Update** to release one editorial pass. Ready pages matching the current editorial direction arrive immediately; a local questionnaire can cover an empty reserve, and complete foreground pages stream only when more material is needed. On a Mac trackpad, place the magazine at the top, pull down with two fingers until **Release to update** appears, then release. A gesture that begins lower in the magazine remains ordinary scrolling and cannot start work. **Stop update** cancels only the foreground magazine turn. Completing one batch cannot start another.

The Experience Shell mixes real, credited photography with story-specific editorial covers. Every valid tile receives a deterministic visual immediately, varies its crop and treatment, exposes a visual-source or provenance link, and decodes below-the-fold media lazily. Those twelve local assets are an offline reserve rather than a closed catalogue: every explicit Update asks for newly verified public imagery, avoids the most recently used URLs, and keeps the new source metadata with the bounded magazine card. VIBEs may change colour, type, responsive layout, crop treatment and motion, but must not relabel generated imagery as photography or obscure photographer/source credit.

## Built-in palettes

- **System** — removes all Vibeify overrides and follows DSH's normal light/dark theme.
- **Ocean** — calm blue accents and cool surfaces.
- **Broadcast** — confident red accents with warm editorial surfaces.
- **Forest** — green accents and natural cream surfaces.
- **Synthwave** — a dark violet and neon cyan workspace.

Select **Chat**, choose **VIBE settings** near the bottom-right of the conventional DSH UI, then select a palette. The colour choice persists in that browser through local storage. It is not written into sessions, prompts, repositories, or DSH settings.

## Editorial direction

Open **Look & feel** directly from the magazine header. Its **VIBE magazine appearance** section offers Midnight, Paper, Forest and Ocean palettes, standard or large text, and standard or roomy spacing. **Apply magazine appearance** changes only browser-local presentation, without starting editorial work. Chat retains its separate colour control.

The same settings panel controls the editor's future subject mix and voice. It is about audiences and perspective rather than a fixed list of topics. Select any combination of **Global & curious**, **Gen Z**, **Creators & influencers**, **Builders & nerds**, **Entrepreneurs**, **Self-development**, **Parents & families**, **Life-experienced**, **Culture & arts**, **Music communities**, **Gamers**, **Sports communities**, **Sustainability**, **Politics & society**, and **Local life**. Global & curious is the neutral default. A useful-surprise slider lets some worthwhile material arrive from outside the selected lenses, and the free-text editor note refines the brief.

The panel also exposes the hidden-reserve switch, a DeepSeek daily maximum displayed in dollars and cents as **USD/day** and capped at US $2, and gentle content notes. Its **Reset what the editor has learned** action removes the local interaction history. The editor can learn only from explicit saves, opens, plays, skips and questionnaire answers; it does not infer protected traits or upload a behavioural profile.

Editorial direction is explicit configuration, never an inferred identity. It is stored locally and shapes later reserve preparation or a requested foreground update. **Apply editorial direction** saves it without starting work. **Update VIBE now** saves the current controls and starts one explicit magazine update. Prepared pages carry a local direction fingerprint; pages from an older direction are not released, and an in-flight background batch is discarded if the direction changes. Exact custom wording remains with the lead; worker packets receive bounded generic topics rather than the reader's text. The direction does not rewrite or remove existing cards and does not change the handling of ordinary Chat answers.

## Visual provenance

Every magazine card has a real pictorial image from its first frame. The local bundle includes ten credited Open Doodles human scenes by Pablo Stanley under CC0, alongside the curated photographs. A deterministic local matcher chooses a conceptual drawing for learning, relationships, care, creativity, work or movement. It uses article copy only on the device, makes no generation request, and never embeds the copy in the picture. It labels a drawing as an illustration, not a photograph of the article's subject. The artwork and provenance live in `shared/editorial-illustrations/`.

The optional `dsh-visuals` capability improves those pictures with subject-specific images. Wikimedia Commons and Openverse work without image-provider credentials; configured Pexels and Pixabay keys add their libraries. Reusable photos and illustrations retain the original creator, licence and source. Existing links and cached photographs must pass the same browser decode and minimum-size checks as new search candidates. A failed, undersized or unavailable image leaves the local drawing visible. Repeated use alone does not invalidate an editor's selected photograph.

Open **Settings → Images** to see the four sources. Provider credentials remain in DSH's credential service and never enter browser results, caches or sharing snapshots. Search and AI generation use only an explicit public magazine brief. Ordinary Chat may resolve an explicitly linked public Commons image without sending its title or prose. Private Chat, missing services, provider-neutral mode and offline reading all retain a locally selected illustration.

The central image resolver tries the credited direct image before saved choices or search. Explicit Commons credits resolve only that file; unrelated stock and generated artwork cannot override them. Article-content fingerprints invalidate old saved choices after edits. Transient capability and search failures receive bounded retries, and Update explicitly retries failures. It validates every selected image before replacing the local picture. See [Article images](ARTICLE-IMAGES.md) for the single entry point and module responsibilities. Generated bitmaps persist separately from small browser preferences; a storage failure cannot remove the bundled image. Generation remains bounded and optional rather than a prerequisite for an illustrated magazine.

Sharing preserves the selected photograph or illustration. A bundled drawing crosses the boundary by a fixed, allow-listed artwork ID, never arbitrary SVG or private data. The sharing host reconstructs that exact drawing, previews a JPEG and stores the previewed JPEG only when the reader chooses **Publish public link**. The same hosted image becomes the article and social preview cover, with its creator and CC0 credit intact.

Every article should centre people, relationships, motivations and emotional stakes. Opinion is attributed, gossip is limited to sourced public reporting, and quotes or private claims must not be invented. The reader's explicit editor note takes priority. The lead should find relevant, licensed imagery while researching each public article; a meaningful conceptual illustration is preferable to a vaguely related photograph. AI imagery is labelled and must not be presented as documentary evidence.

Supported YouTube, Vimeo, Spotify and SoundCloud links appear as privacy-aware, click-to-load players. If the reader previews and deliberately publishes that article, the provider identity and original public media link cross the same allow-listed boundary and the shared page reconstructs the player only after its reader clicks. Autoplay and arbitrary embed code are never preserved.

The grid uses explicit `compact`, `feature`, `wide`, and `hero` layouts rather than positional selectors. It packs densely on a large screen, becomes two columns on a medium screen, and becomes one readable column on phones. Cards contain long titles, links, emphasis, quotations, structured tables, code, readable display maths and multi-photo galleries without widening or horizontally shifting the magazine. One shared presentation parser supplies the local Vibe, private preview and public article, strips a duplicated opening title and keeps the same heading hierarchy and inline formatting at each stage. The VIBE tab remains aligned with Chat and Trajectory and uses a restrained active underline rather than a floating pill. A visual-source or graphic-provenance link remains in each image caption. Every generated non-questionnaire panel separately includes a relevant verified content destination in its article copy; the card's **Read source** action repeats that useful destination and never points to an image file or visual-credit page.

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

### Photograph recovery and generated illustrations

Magazine images are checked against their original source metadata. Commons
file links (including filenames with parentheses) and Commons thumbnails are
supported. A missing licence in an old caption can be recovered from Commons;
new captions must include the verified licence. A selected replacement must
load at a usable size before it is cached. Failed exact Commons images retain the credited local fallback with a visible retry message. General public image searches can try other candidates when no exact Commons choice exists.

In ChatGPT mode, public magazine stories can use the installed Codex image tool
as a last resort after image search. Only a short public image brief is supplied;
private Chat titles, reader settings and history are not sent. Generation uses
the existing ChatGPT sign-in, a three-minute timeout, one concurrent job and four
attempts per day. Successful PNGs are cached locally and labelled Generated
illustration. If generation is unavailable or the limit is reached, the credited local
pictorial illustration remains. Typographic covers no longer satisfy image readiness.
Provider-neutral mode does not silently invoke Codex. Sharing carries the chosen
photograph or illustration to the private preview; publication remains an
explicit reader action.

## Embedded games and interactive articles

Articles can contain self-contained games, calculators, local forms, interactive SVG/canvas graphs, and small apps. The author emits a `vibe-app` fenced block containing JSON with `title`, `html`, and optional `height` (240–900 pixels). The HTML includes its own CSS and JavaScript. Readers choose **Open interactive** inside the article; **Close interactive** unloads it. Reopening resets its local state. Interactive articles get a full-width panel and are never hidden inside a shortened excerpt.

Use up to three panels, up to 12,000 characters of HTML per panel, and keep the complete article below 16,000 characters. Use scripts with `addEventListener`, not inline event attributes. Do not use CDN imports, external assets, storage, parent-window access or network requests. Forms perform local validation/calculation with `preventDefault`; external submissions are blocked. The iframe has an opaque origin, no access to the magazine or its account data, no popup/top-navigation permissions, and a restrictive content policy. This is a local interaction format, not a general external-site iframe or an authenticated hosted application.

The existing `:::vibe-game mochi-meadow` block uses one portable game implementation in the magazine, private sharing preview and published article. Future games use the reusable `vibe-app` format and require no plugin update. Games, forms, graphs and apps retain their interactions when shared. Publishing remains a separate reader action.

Magazine palette, text size and spacing now apply and save immediately when selected in Look & feel. Chat colour remains separate. Appearance changes do not request new articles or change model settings.

Standalone Commons image credits (including “Video still · Creator · Licence”) are resolved through Commons metadata even when the article omits image markup. Only the public file URL is sent for resolution; the verified image replaces the illustration once it loads.
Caption-style credits also resolve when the creator and licence sit outside the Commons link, for example `Image: Creator; public domain via [Wikimedia Commons](...)`. Italic and bold caption formatting are supported. Ordinary prose links do not become cover-image requests.

The magazine and update checker obtain the current DSH connection through its service registry (`ctx.get("connection")`). This is required for image lookup on DSH 0.1.7; a missing legacy property must not silently disable the image queue.
