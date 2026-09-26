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

Vibeify discovers a separate optional `dsh-visuals` capability. The friendly installers compose it alongside either provider mode, while manual or older installations can omit it without breaking Vibe: every card still receives the existing unique local typographic/graphic fallback. When active, it searches Wikimedia Commons and Openverse without credentials, then adds Pexels and Pixabay when their keys are configured. It sends only the short public title of an explicit magazine page; ordinary Chat cards, article bodies, prompts, attachments, reader history, settings and keys never enter the search request.

Open **Settings → Images** to see the four sources. Pexels and Pixabay each have a write-only password field and a separate remove action. The browser can ask whether a named credential is configured, but it can never read its value. Keys are kept by DSH's credential service, resolved by the host plugin for one search, and omitted from RPC results, visual caches, previews and published pages. A blank field preserves the current value.

The local bundle retains six credited Unsplash photographs and six legacy AI-assisted SVG compositions. Magazine cards use credited photographs or a story-specific typographic cover instead of selecting those generic SVG compositions. These assets are packaged with the plugin, so changing cards, resizing the window, or opening the magazine makes no image-generation request and does not wait for a remote image host.

The share preview preserves the selected article image, its ordering and credits; the first image is also the published cover and social preview image. It no longer substitutes another picture merely because that image appeared in a previous share. Articles with a typographic cover use the same deterministic cover renderer locally and in the private preview; the preview rasterises that cover as a JPEG. A local-only graphic cannot be transferred as an arbitrary private data URL.

Every article should centre people, relationships, motivations and emotional stakes, regardless of subject. Opinion is attributed, gossip is limited to sourced public reporting and labelled as such, and quotes or private claims must not be invented. The reader's explicit editor note takes priority over general topic suggestions. Generic tutorials about making VIBE are not an editorial update unless requested.

An explicit Update renews the rolling catalogue. The editor first considers at least 18 potential images across at least three credible source families and ranks them by exact subject/entity relevance, informative value, licence clarity, composition, freshness and recent-use diversity. Google Images may be used with its Usage rights filter for discovery, but the original file page remains authoritative: the editor verifies the actual reusable licence and attribution before selection. Preferred routes are Wikimedia Commons, Openverse results with an original licence page, Flickr Commons, official public-domain collections, then clearly licensed Unsplash, Pexels or Pixabay material. Every generated non-questionnaire card then starts with selected, verified subject-relevant photography and its human-readable creator, licence and source link. Articles above 500 words may add two or three credited photographs as visual beats. AI-assisted graphics remain occasional, explicitly labelled and story-specific, never generic documentary substitutes. The browser accepts direct HTTPS media only from the reviewed catalogue/family list or a direct first-party image paired with its separate official source page. It sends no referrer, rejects unrelated hosts, strips rejected image syntax from article prose and remembers the 80 most recently used remote URLs so the next update can avoid them. If a generated or Chat-derived story has no accepted exact image, Vibe creates a deterministic article-specific typographic visual from its title and excerpt instead of assigning an unrelated bundled photograph. The share preview uses the same title/excerpt identity for its public JPEG fallback. After a serious web-image search, the lead may use the latest available ChatGPT image-generation capability when present and authorised, with a clearly labelled illustration made only from the public story brief. The visuals plugin itself does not currently provide an automatic ChatGPT image-generation connection. The generated image URLs and source links live only inside the same 30-day, 160-card browser cache as the rest of the magazine. Opening or reading Vibe never performs this renewal by itself.

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
