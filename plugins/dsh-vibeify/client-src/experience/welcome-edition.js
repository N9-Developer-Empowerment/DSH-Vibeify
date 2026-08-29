const VIBEIFY_SITE = "https://dsh-vibeify.ezzye.chatgpt.site/";
const VIBEIFY_REPOSITORY = "https://github.com/N9-Developer-Empowerment/DSH-Vibeify";
const DSH_REPOSITORY = "https://github.com/deepseek-ai/deepseek-harness";
const DSH_PLUGIN_GUIDE = "https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md";

const PANELS = Object.freeze([
  Object.freeze({
    id: "good-choice",
    kind: "article",
    topicId: "shop-the-scene",
    title: "Good choice. You installed the part where AI becomes worth looking at.",
    markdown: `Most AI starts with an empty box and the faint suspicion that you have accidentally been given homework. VIBE starts with a magazine.

You ask normally in Chat. Useful finished material arrives here with hierarchy, pictures, links and room to breathe. The result is still yours to judge, save and share; it is simply dressed before coming downstairs.

**Try it:** open Chat and ask for something you would genuinely enjoy reading—perhaps a weekend guide, a visual explainer or a short series on a person you admire. Then return to VIBE and watch your own edition take over.

[See what Vibeify is designed to do](${VIBEIFY_SITE}).`,
  }),
  Object.freeze({
    id: "chat-is-the-front-door",
    kind: "article",
    topicId: "say-it-better",
    title: "Chat is the front door, not the whole house",
    markdown: `Chat is where you ask, steer, approve and correct. It is also where you can be gloriously imprecise: “teach me enough about this to have an opinion” is a perfectly respectable beginning.

VIBE is where the finished answer becomes readable. One request runs one turn and stops; the magazine does not secretly restart old conversations. If you want a different direction, ask again in Chat.

**Try it:** ask for “five joyful things happening in science, explained without jargon, with sources and pictures.”

[Read the plain-English Vibeify overview](${VIBEIFY_SITE}).`,
  }),
  Object.freeze({
    id: "stream-before-finished",
    kind: "image",
    topicId: "neon-rain",
    title: "A good page need not wait for the entire issue",
    markdown: `VIBE is built around streaming content, not turn-taking theatre. A checked, complete panel can appear while a deeper article is still being researched. Quick pleasures arrive quickly; slower pieces earn their delay.

Nothing half-written is published. The unit of streaming is a finished visual chunk—a whole paragraph, card, questionnaire or article section—not a sentence twitching across the screen one token at a time.

**Try it:** ask Chat for “a quick visual answer first, followed by a deeper sourced article.”

[See how the streaming magazine is put together](${VIBEIFY_REPOSITORY}/blob/main/docs/CONTENT_STREAMING.md).`,
  }),
  Object.freeze({
    id: "update-on-purpose",
    kind: "image",
    topicId: "street-style-edit",
    title: "Pull for more. Stop when you have enough.",
    markdown: `At the top of VIBE, pull down on a phone or with two fingers on a Mac trackpad. You can also press **Update**. Ready pages appear immediately, then one bounded editorial pass may add more.

There is no endless background slot machine. **Stop update** stops that magazine pass, and finishing one pass never starts another. Opening VIBE, scrolling or changing a setting does not spend anything by itself.

**Try it:** pull down once, watch the first page arrive, then press Stop if the edition has already done its job.

[Learn the visible update rules](${VIBEIFY_REPOSITORY}/blob/main/docs/VIBES.md).`,
  }),
  Object.freeze({
    id: "editorial-direction",
    kind: "article",
    topicId: "street-style-edit",
    title: "Choose an audience lens, then give the editor a note",
    markdown: `VIBE's editorial settings are about perspective rather than demographics. Select any mix of lenses—Global & curious, Builders & nerds, Culture & arts, Parents & families, Sports communities and more—then add a free-text editor note in your own words.

The editor uses those choices as a brief, not as a personality test. It may still include a worthwhile surprise from outside your usual lane; magazines should contain at least one thing you did not know you wanted.

**Try it:** in VIBE settings, choose two lenses and write “be witty, show me the people behind the work, and avoid manufactured outrage.”

[Explore the editorial controls](${VIBEIFY_REPOSITORY}/blob/main/docs/VIBES.md#editorial-direction).`,
  }),
  Object.freeze({
    id: "questionnaires-learn-locally",
    kind: "image",
    topicId: "say-it-better",
    title: "The questionnaires are tiny editorial meetings",
    markdown: `A questionnaire lets you nudge the next edition with one tap: more depth, more creators, a calmer pace, a better surprise. There is no form to complete and no answer required.

Your explicit answers, saves, opens, plays and skips can shape later choices. That learning stays in this browser. It is not an uploaded behavioural dossier, and **Reset what the editor has learned** removes it.

**Try it:** answer one question, request an Update, and see whether the mix moves in the direction you chose.

[Read the local-learning boundary](${VIBEIFY_REPOSITORY}/blob/main/docs/VIBES.md#editorial-direction).`,
  }),
  Object.freeze({
    id: "pictures-do-work",
    kind: "article",
    topicId: "makeup-lessons",
    title: "Pictures are part of the article, not decorative parsley",
    markdown: `Every panel gets a visual immediately. Generated editions prefer relevant, credited documentary photography; longer pieces can place several images at useful pauses. Occasional AI-assisted graphics are labelled as such rather than dressed up as reportage.

Music and video use click-to-load previews, which keeps the opening page quick and avoids autoplay ambushes. Article links lead to useful web content; image credits remain image credits.

**Try it:** ask Chat for a visual history with “relevant photographs at each turning point, plus one video or music link where it genuinely helps.”

[See the visual and provenance rules](${VIBEIFY_REPOSITORY}/blob/main/docs/VIBES.md#visual-provenance).`,
  }),
  Object.freeze({
    id: "save-or-skip",
    kind: "image",
    topicId: "mirror-minute",
    title: "Save the good one. Tell the editor when it has missed.",
    markdown: `The bookmark keeps a panel in your local reading state. **Not for me** is a quiet editorial signal: it marks that card as a miss and helps the local editor avoid more of the same.

Neither button publishes, messages anyone or alters the original Chat. They are simply the reader saying “more like this” or “perhaps never speak of this casserole again.”

**Try it:** save one panel you would return to and dismiss one that does not earn its space.

[Learn how VIBE keeps reading choices local](${VIBEIFY_REPOSITORY}/blob/main/docs/VIBES.md#editorial-direction).`,
  }),
  Object.freeze({
    id: "share-one-good-thing",
    kind: "image",
    topicId: "shop-the-scene",
    title: "Share one good thing, not your private workspace",
    markdown: `**Preview and share** prepares only the article you can see: its title, edited copy, public links and permitted images. Your prompt, Chat history, reasoning, approvals, settings and account details stay behind.

The preview is private until you deliberately choose **Publish public link**. The resulting page can be opened by people who have neither DSH nor a ChatGPT or DeepSeek account.

**Try it:** make a short celebratory article in Chat, preview it in VIBE, check every word and image, then publish only if it is ready to leave home.

[Read the two-step sharing guide](${VIBEIFY_REPOSITORY}/blob/main/docs/SHARING.md).`,
  }),
  Object.freeze({
    id: "dsh-in-plain-english",
    kind: "article",
    topicId: "neon-rain",
    title: "DeepSeek Harness is the stage manager",
    markdown: `DeepSeek Harness—DSH—is the open-source application underneath VIBE. It keeps sessions, agents, models, tools, permissions and approvals in one place. VIBE is not a replacement for that machinery; it is the audience-facing way of experiencing what the machinery produces.

You can use DSH with DeepSeek, ChatGPT, or both, depending on what you connect. An account with either provider is useful but the harness itself is not a subscription trapdoor.

**Try it:** open Chat and ask, “Explain one task you can do here, what tools it would need, and what would still require my approval.”

[Meet DeepSeek Harness at its open-source project](${DSH_REPOSITORY}).`,
  }),
  Object.freeze({
    id: "vibe-is-a-plugin",
    kind: "image",
    topicId: "makeup-lessons",
    title: "VIBE is a plugin. The interesting part is that it did not need permission to become an app.",
    markdown: `Vibeify changes DSH's experience by composing a plugin: presentation, editorial behaviour, safe sharing and—when selected—the Codex lead integration. DSH remains underneath, and removing Vibeify does not turn your conversations into a proprietary format.

Plugins can add tools, settings, agents and entire experiences. Developers can make their own; everyone else can simply benefit from the fact that somebody can.

**Try it:** ask Chat, “What kind of small DSH plugin would make my day easier?” You can stop at the idea or ask it to sketch one safely.

[See the DSH plugin publishing guide](${DSH_PLUGIN_GUIDE}).`,
  }),
  Object.freeze({
    id: "open-source-is-a-practical-feature",
    kind: "article",
    topicId: "street-style-edit",
    title: "Open source means the exit is visible",
    markdown: `Open source is not a guarantee that every line is perfect. It is a guarantee that the important questions can be asked in public: What is installed? What does it send? Who can change it? Can I leave?

DSH and Vibeify publish their code and operating boundaries. That makes independent inspection, repair, adaptation and community plugins possible. It also means a good idea does not have to wait for one company's product meeting.

**Try it:** ask Chat for a friendly tour of the Vibeify repository—what each part does, and which boundaries protect the reader.

[Inspect the Vibeify source and documentation](${VIBEIFY_REPOSITORY}).`,
  }),
  Object.freeze({
    id: "models-have-jobs",
    kind: "image",
    topicId: "neon-rain",
    title: "Use the expensive brain for judgement, not photocopying",
    markdown: `In combined mode, Codex remains the lead: it plans, sets acceptance, checks sources, integrates the result and answers. Eligible discovery and drafting can go to much cheaper DeepSeek workers, with their output treated as unverified until the lead checks it.

DeepSeek-only mode remains available, as does ChatGPT without DeepSeek. The point is choice: use each model for the work it can do well, and do not pretend a cheaper result is equally good until it has actually passed the checks.

**Try it:** ask Chat to explain how it would divide your next task between lead judgement and lower-cost execution.

[See the lead-and-worker architecture](${VIBEIFY_REPOSITORY}/blob/main/docs/HOW_IT_WORKS.md).`,
  }),
  Object.freeze({
    id: "permissions-still-belong-to-you",
    kind: "article",
    topicId: "say-it-better",
    title: "Full Access is not a forged signature",
    markdown: `Full Access reduces interruptions for local work such as reading files and running commands. It does not quietly authorise sending an email, publishing a page, deleting cloud data, buying something or messaging another person.

Those protected external actions keep their own confirmation. The useful distinction is simple: an agent may prepare confidently, but the moment it acts in the outside world still belongs to you.

**Try it:** ask Chat to draft something and show the exact external action it would need before doing it. Preparation should be easy; consent should remain unmistakable.

[Read Vibeify's security boundaries](${VIBEIFY_REPOSITORY}/blob/main/docs/SECURITY.md).`,
  }),
  Object.freeze({
    id: "queue-and-steer",
    kind: "article",
    topicId: "say-it-better",
    title: "Queue the next thought. Steer the one already moving.",
    markdown: `When an agent is busy, **Queue** saves a follow-up for the next turn. **Steer** changes the direction of the work already under way. The distinction prevents a useful correction from becoming a second, contradictory commission.

If the work has gone completely astray, Stop remains Stop. Queue and Steer are for keeping momentum without having to wait politely beside a blinking cursor.

**Try it:** ask Chat for a three-part guide. While it works, steer it toward a warmer tone, then queue a request for a one-paragraph summary after the guide is complete.

[See the live-work controls in the feature guide](${VIBEIFY_REPOSITORY}/blob/main/README.md#what-you-get).`,
  }),
  Object.freeze({
    id: "thinking-and-trajectory",
    kind: "image",
    topicId: "mirror-minute",
    title: "Thinking is scaffolding. The answer is the room.",
    markdown: `While work is live, Vibeify opens **Think** so you can see useful progress rather than wonder whether anything is happening. When the final answer settles, the disclosure closes automatically. You can reopen it whenever the method matters.

**Trajectory** keeps the fuller agent-and-tool story available in Chat. The polished answer remains visually dominant; the evidence has not vanished merely because it stopped standing in the doorway.

**Try it:** give Chat a task with two checkable steps, watch Think while it runs, then open Trajectory after completion to inspect how the work was carried out.

[Read how live work stays visible without taking over](${VIBEIFY_REPOSITORY}/blob/main/README.md#what-you-get).`,
  }),
  Object.freeze({
    id: "images-with-a-boundary",
    kind: "article",
    topicId: "makeup-lessons",
    title: "Bring an image. Keep control of where it goes.",
    markdown: `You can add an image to Chat when seeing it is part of the task—reviewing a layout, identifying a visual problem or making something new. The active lead can use that image in the requested work.

Vibeify does not treat one upload as permission to forward private material to every available provider. Sending a current image to another model or service requires explicit intent, and public sharing still includes only the reviewed article assets.

**Try it:** attach a non-private screenshot and ask Chat to explain one visible design issue before proposing any change.

[Read the image and data-transfer boundary](${VIBEIFY_REPOSITORY}/blob/main/docs/SECURITY.md).`,
  }),
  Object.freeze({
    id: "connected-apps-have-doorbells",
    kind: "image",
    topicId: "shop-the-scene",
    title: "Connected apps have doorbells, not secret passages",
    markdown: `A connected app can let the lead find or prepare work in a service you already use. Reading and drafting can be pleasantly direct. Sending, publishing, buying, deleting or changing access still keeps the service's protected confirmation.

That is the point of a harness: useful capabilities meet in one place without pretending every capability has the same authority.

**Try it:** ask Chat which connected tools are available and request a read-only example. If an external write would be useful, ask it to prepare the exact action without performing it.

[See how connected capabilities keep their boundaries](${VIBEIFY_REPOSITORY}/blob/main/docs/ARCHITECTURE.md#portability-boundary).`,
  }),
  Object.freeze({
    id: "capability-levels",
    kind: "article",
    topicId: "neon-rain",
    title: "Choose the lead's thinking budget without changing its job",
    markdown: `In governed mode, **Settings → Codex** offers Efficient, Balanced, Frontier and Maximum. The setting changes the lead model and reasoning allowance. It does not hand final judgement to a worker or alter your permissions.

Frontier is the quality-preserving default. Lower levels are useful experiments for routine, highly checkable work; Maximum is for the rare task where judgement matters more than speed or economy.

**Try it:** keep Frontier for your first real task. Later, compare one repeatable low-risk request at a lighter level and judge the actual result rather than the label.

[Understand the Codex lead capability choices](${VIBEIFY_REPOSITORY}/blob/main/README.md#what-you-get).`,
  }),
  Object.freeze({
    id: "provider-choice",
    kind: "image",
    topicId: "neon-rain",
    title: "DeepSeek, ChatGPT, both—or connect one later",
    markdown: `Vibeify has three honest arrangements. DeepSeek-only keeps native DSH in the lead. ChatGPT-only uses the ChatGPT-authenticated Codex lead. Combined mode keeps Codex in charge of acceptance while eligible bounded work can go to lower-cost DeepSeek workers.

Neither account is individually compulsory during installation; at least one working provider is needed before asking AI to work. Provider billing and plan limits stay separate rather than being disguised as one subscription.

**Try it:** ask Chat which mode is active now and what would materially change—not merely what buttons would appear—if you chose another.

[Compare the friendly provider choices](${VIBEIFY_REPOSITORY}/blob/main/docs/INSTALL.md#choose-a-provider-mode).`,
  }),
  Object.freeze({
    id: "updates-without-archaeology",
    kind: "image",
    topicId: "mirror-minute",
    title: "Updates should feel like a button, not an archaeological expedition",
    markdown: `Settings includes a read-only update check for DSH, Vibeify and the bundled Codex runtime. It distinguishes an update that is safely compatible from one that has merely appeared upstream.

The non-technical updater downloads, validates and canary-tests the new bundle before switching. A restart happens only after active work has finished and you have authorised it. Your magazine should survive; your patience need not be the backup strategy.

**Try it:** open Settings → Updates and choose **Check again**. Looking is safe; installing and restarting remain separate decisions.

[Open the friendly installation and update guide](${VIBEIFY_REPOSITORY}/blob/main/docs/INSTALL.md).`,
  }),
]);

function validatedPanels(catalog) {
  if (catalog === null || typeof catalog !== "object" || catalog.byId === null || typeof catalog.byId !== "object") {
    throw new TypeError("welcome edition requires a validated editorial catalogue");
  }
  return PANELS.map((panel) => {
    if (catalog.byId[panel.topicId] === undefined) throw new TypeError(`welcome panel references unknown topic ${panel.topicId}`);
    return Object.freeze({
      ...panel,
      id: `welcome-v1-${panel.id}`,
      source: "welcome",
      cta: "chat",
    });
  });
}

/** Evergreen first-run/relaunch editorial copy; it is local and makes no provider call. */
export function createWelcomeEdition(catalog) {
  return Object.freeze(validatedPanels(catalog));
}

function deterministicSource(source) {
  return source === "welcome" || source === "bundle";
}

/** Keep deterministic local depth without spending the reader-content allowance. */
export function boundMagazinePresentation(chunks, dynamicLimit = 160) {
  if (!Array.isArray(chunks)) throw new TypeError("magazine presentation must be an array");
  if (!Number.isInteger(dynamicLimit) || dynamicLimit < 1) throw new TypeError("magazine presentation limit is invalid");
  const retainedDynamicIds = new Set(chunks
    .filter((chunk) => !deterministicSource(chunk?.source))
    .slice(-dynamicLimit)
    .map(({ id }) => id));
  return Object.freeze(chunks.filter((chunk) => deterministicSource(chunk?.source) || retainedDynamicIds.has(chunk?.id)));
}

/**
 * Stored chunks are append-only, while presentation reverses them. Put cached
 * reader material at the base, examples above it, and the authored welcome
 * series last so it opens in the intended order on every launch. New chunks
 * appended during this visit will naturally appear above the welcome series.
 */
export function composeOpeningStream({ cached, bundle, welcome, now = Date.now(), dynamicLimit = 160 }) {
  if (![cached, bundle, welcome].every(Array.isArray)) throw new TypeError("opening stream inputs must be arrays");
  if (!Number.isFinite(now) || now <= 0) throw new TypeError("opening stream time is invalid");
  if (!Number.isInteger(dynamicLimit) || dynamicLimit < 1) throw new TypeError("opening stream limit is invalid");
  const chunks = [];
  const seen = new Set();
  const append = (chunk) => {
    if (chunk === null || typeof chunk !== "object" || typeof chunk.id !== "string" || seen.has(chunk.id)) return;
    seen.add(chunk.id);
    chunks.push(Object.freeze({ ...chunk, publishedAt: chunk.publishedAt ?? now }));
  };
  for (const chunk of cached) {
    if (chunk?.source === "bundle" || chunk?.source === "welcome") continue;
    append(chunk);
  }
  for (const chunk of [...bundle].reverse()) append(chunk);
  for (const chunk of [...welcome].reverse()) append(chunk);
  return boundMagazinePresentation(chunks, dynamicLimit);
}
