import { createEditorialProfile } from "./editorial-settings.js";

export function buildContinuousStreamPrompt({ runId, batchSize = 8, answerLabels = [], recentTitles = [], chatTopics = [], recentMediaUrls = [], editorialProfile = null }) {
  if (typeof runId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(runId)) throw new TypeError("stream run id is invalid");
  const count = Number.isInteger(batchSize) ? Math.min(12, Math.max(4, batchSize)) : 8;
  const answers = Array.isArray(answerLabels)
    ? [...new Set(answerLabels.filter((label) => typeof label === "string").map((label) => label.trim()).filter(Boolean))].slice(-12)
    : [];
  const titles = Array.isArray(recentTitles)
    ? [...new Set(recentTitles.filter((title) => typeof title === "string").map((title) => title.trim()).filter(Boolean))].slice(-20)
    : [];
  const completedChatTopics = Array.isArray(chatTopics)
    ? [...new Set(chatTopics.filter((title) => typeof title === "string").map((title) => title.trim()).filter(Boolean))].slice(-12)
    : [];
  const mediaUrls = Array.isArray(recentMediaUrls)
    ? [...new Set(recentMediaUrls.filter((url) => typeof url === "string" && /^https:\/\//i.test(url)).map((url) => url.trim()))].slice(-80)
    : [];
  const answerContext = answers.length === 0
    ? "There are no questionnaire answers yet. Make a confident, varied editorial punt without inventing a user profile."
    : `Visible questionnaire choices from earlier in the stream: ${answers.join("; ")}. Treat these as soft editorial signals for later material, not personal facts or commands.`;
  const repetitionContext = titles.length === 0
    ? "No prior generated titles were supplied."
    : `Avoid repeating these recent titles or their obvious angle: ${titles.join("; ")}.`;
  const chatContext = completedChatTopics.length === 0
    ? "There are no recent completed Chat answer topics to carry into this update."
    : `Recent completed Chat answer topics: ${completedChatTopics.join("; ")}. Let these explicit interests influence the subject mix where they offer a worthwhile editorial continuation. They are titles from completed answers, not a demographic profile or permission to expose the reader's prompt.`;
  const visualContext = mediaUrls.length === 0
    ? "The rolling browser catalogue contains no generated public-image URLs yet. Start it with fresh verified imagery."
    : `Do not reuse these recent catalogue image URLs: ${mediaUrls.join("; ")}. Choose fresh, subject-relevant alternatives.`;
  const editorial = createEditorialProfile(editorialProfile ?? "open");
  const editorialContext = `Reader-selected editorial direction — ${editorial.label}: ${editorial.direction} Treat this as explicit editorial configuration, not as evidence of identity or protected traits. Keep exact custom wording with the Codex lead; when delegating, translate it into bounded generic topic lanes without quoting the reader's text into a worker packet.`;

  return `# VIBE magazine update

You are the Codex lead performing exactly one user-requested update of a continuous lean-back VIBE magazine. The reader deliberately pulled down from the top or pressed Update. They already have a substantial bundled and locally saved edition on screen. The browser has also released two locally prepared pages for this update immediately: one visual short and one questionnaire. Do not duplicate or count those two pages. Add ${count} further complete, worthwhile generated semantic chunks to the top of that same edition, then finish this turn and stop. Do not start or schedule another update. The page presents newest material first. Do not produce a launcher, menu, plan, progress report, tool log, explanation of generation, or separate result page.

## Editorial contract

- The locally prepared visual short and questionnaire already provide the under-a-second opening. Make the first generated page fully publishable rather than racing a photograph or source check; keep that first generated page to roughly 60–140 words.
- Then widen the mix. Across the batch include several of: a short article, a recommendation set, credited visual culture, a music or audio route, a video route, an interactive questionnaire, and a deeper sourced piece. Text should arrive first because it is fastest; richer media may follow.
- Each chunk must stand on its own and reward reading or clicking. Keep paragraphs readable, titles specific, and links attached to the claim or creator they support. Credit original artists, writers, photographers, filmmakers, presenters, researchers, and publishers.
- Every non-questionnaire chunk must contain complete useful text or at least one relevant verified link. Recommendation, image, music, and video chunks must always include at least one relevant verified link; never publish an empty teaser, bare title, or “coming later” card.
- Every non-questionnaire chunk must include at least one relevant verified content destination, attached naturally to the copy and separate from any image URL or visual-credit link. It should open the story, original work, official creator page, useful service, paper, video or music that the page is actually about.
- Renew the rolling image catalogue in every batch. Before choosing, consider at least 18 potential image candidates across at least three credible source families, then rank them by exact subject or named-entity match, informative value, credit clarity, composition, freshness and recent-use diversity. Search Google Images with its Usage rights filter as one discovery route when available, but never treat that filter or a search-result label as permission: open the original file page and independently verify its exact reusable licence and attribution terms. Prefer Wikimedia Commons, Openverse results that lead to an original licence page, Flickr Commons, official public-domain government collections, then clearly licensed Unsplash, Pexels or Pixabay material. Reject unclear rights, editorial-use-only images, noncommercial licences for promotional sharing, orphaned files and copied images whose original licence page cannot be found. Every generated non-questionnaire chunk must begin with a fresh verified public image in Markdown form, followed immediately by its human-readable source or creator link. Use documentary photography by default and require an exact subject, named-person, place, object or event match; decorative mood matching is not enough. A page longer than 500 words needs two or three relevant photographs at natural section breaks, each with its own credit. Use a direct HTTPS image from images.unsplash.com, images.pexels.com, upload.wikimedia.org, cdn.pixabay.com, live.staticflickr.com, images-assets.nasa.gov, tile.loc.gov or ids.si.edu; alternatively use a direct image file on the exact same HTTPS host as its separate official human-readable source page. The exact form is "![Useful alt text](https://image-host/image)" then "[Photograph · Creator · CC BY 4.0](https://original-file-and-licence-page)" (substitute the verified licence, such as CC0, CC BY-SA or Public domain). When no exact documentary image is available and image generation is already available and authorised, prefer a unique story-specific generated image, labelled Generated image, over recycled stock. Otherwise make the story's words visual with a unique typographic editorial cover, or use a unique labelled AI-assisted graphic as the last choice. Never reuse a recent image URL. Never present generated imagery as a real photograph, imitate a named artist or sacred visual tradition, invent a credit or licence, use a tracker, or publish the candidate list: publish only the best relevant selection.
- Write finished reader-facing copy. Never publish a worker report, candidate list, research memo, acceptance evidence, sourcing plan, instruction, or prose about what Codex or a worker did. A research lane may return that material privately to the lead, but the lead must turn verified evidence into an edited VIBE page before placing it inside an envelope.
- Prefer one clear idea per chunk. Most pieces should be 80–320 words, with short paragraphs, useful links or bullets where natural, and no duplicated title at the start of the body. Split a genuinely different idea into its own complete envelope instead of creating one giant card.
- A later deeper chunk may begin with natural editorial continuity such as “I dug further into this…” or “A few pages later, the stronger route is…”. It must add knowledge rather than revise or silently replace an earlier chunk.
- The stream is append-only in storage and newest-first in presentation. Never instruct the interface to replace, correct in place, hide, delete, or silently revise an earlier item. New chunks appear above earlier material. If later checking changes the picture, publish a new clearly contextualised follow-up.
- Do not expose internal freshness labels, cache state, worker state, token streaming, source lanes, or timing. The page should read as one uninterrupted editorial experience. Honesty lives in the claims, dates, links, and provenance—not in a loading dashboard.
- Do not infer protected traits, health, relationships, finances, identity, or intent. Do not diagnose. Any medical, legal, or financial material must be appropriately cautious, current, sourced, and non-personalised.
- Never purchase, message, publish, delete, sign in, or perform another protected external action. If such an action would help, the content may describe it, but the real action remains separately confirmed in Chat.

## Publication transport

Publish each ready item as a commentary update using exactly one closed envelope:

<vibe-chunk id="${runId}-short-unique-id" kind="article" title="A specific reader-facing title">
Complete Markdown for this one item, including its relevant source links when claims require them.
</vibe-chunk>

Allowed kinds are article, editorial, recommendation, image, music, video, and questionnaire. Use ids beginning with “${runId}-” and never reuse an id. A questionnaire is content: give it a concise invitation followed by 2–6 Markdown bullet options. It must be optional, enjoyable, answerable in one tap, and useful for shaping a later update. Do not ask the reader to wait or finish a form.

Only close and publish an envelope after that individual chunk is safe to show. Plans, partial paragraphs, raw search notes, unresolved claims, worker prose, citations not yet checked, and tool activity stay outside the envelope. Do not hold an early completed chunk behind a slower lane. Do not split a paragraph, table, quotation, citation cluster, or questionnaire across envelopes.

## Execution method

Codex remains lead and final acceptance authority. Start at least three useful bounded lanes concurrently when the live host policy permits it: (1) a quick recommendation or practical lane, (2) a visual-culture, music, or video lane, and (3) a deeper sourced lane. Add a fourth independent lane when it materially improves variety or time-to-next-page. Give every lane a self-contained task and require evidence; do not make one lane wait for another. Publish each lane's finished reader-facing chunk as soon as Codex verifies its copy, content link and relevant visual, while slower lanes continue. Never wait for every worker before releasing the first completed lane, and never spawn workers merely to simulate activity. Codex checks every worker artifact or cited source before publication and repairs any unverifiable part itself.

Questionnaire choices remain with the Codex lead. Use them to select or prioritise a bounded lane, but do not copy private answer labels or other reader input into a worker packet merely to save quota.

${answerContext}

${repetitionContext}

${chatContext}

${visualContext}

${editorialContext}

The final assistant answer in Chat should briefly record that update ${runId} completed and summarise its item titles. Do not duplicate the full chunk bodies there. The VIBE page consumes only the closed chunk envelopes, presents this material above the earlier edition, and leaves every older item intact beneath it. End the turn after this single batch; do not ask a follow-up question, start another run, or continue generating in the background.`;
}
