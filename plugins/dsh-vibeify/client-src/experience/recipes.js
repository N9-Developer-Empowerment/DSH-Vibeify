function buildRecipePrompt(recipe) {
  return `# VIBE one-click content recipe: ${recipe.title}

## Job
Produce a complete, visually structured content page for someone who selected the “${recipe.title}” tile. They chose a result, not a prompt-writing task. Do not begin by asking questions. Give them a genuinely useful first edition immediately, then finish with optional filter chips they could choose for a later refresh.

${recipe.goal}

## Research contract
- Browse current public sources before recommending anything. State the research date near the top and distinguish current facts from durable background knowledge.
- Prefer primary and authoritative sources for factual claims, safety, availability and product specifications. Use credible independent expert or review sources for comparison and context.
- Link every recommendation to its source page. When useful, also provide a separate official image/gallery link and an official or expert video/tutorial/trailer link. Do not copy protected media or invent media URLs.
- Check that links resolve and label region, price and availability uncertainty. Default to the United Kingdom when a region is required, while making the region easy to change.
- Credit the human experts, writers, artists, presenters, photographers and other creators whose work makes the guide useful. Never imply that linked work was created by VIBE.
- Explain why each item was included. “Best” must mean best-supported for a stated need or trade-off, never a universal or paid ranking.
- Do not use affiliate links unless they are unmistakably disclosed. Do not purchase, subscribe, publish, message or perform any other external write.

## Visual and interaction direction
Theme the page as ${recipe.theme}. Use a strong editorial hero, short scene-setting copy, filter-chip suggestions, image-led cards, one honest comparison table, and a small video shelf. The page should feel browsable from a sofa: reveal the strongest options first, keep paragraphs short, and place detail behind clear headings. Use accessible Markdown that VIBE can enhance into cards and interactive views. Never pad the result with generic filler.

## Required page structure
1. Hero: a specific title, one-sentence promise, research date, region and a concise “how this was chosen” disclosure.
2. Quick paths: three to five optional routes such as budget, mood, need, time or experience level. Still provide the default page without waiting for a selection.
3. Main edit: ${recipe.mainEdit}
4. Comparison: a compact table with the decision fields that actually matter, official link, evidence/source link, image link and video link when available.
5. Watch and learn: three to five useful videos or creator resources with presenter/creator credit, duration if known, why it is worth watching and a direct source link.
6. Reality check: limitations, safety or suitability caveats, sponsorship/affiliate disclosures, stale-data risks and what could not be verified.
7. Sources: a clean, non-duplicative list grouped by primary/official, expert and independent context.
8. Refresh controls: end with optional one-tap refinements, not a demand for the user to rewrite the prompt.

## Topic-specific rules
${recipe.rules}

## Progressive VIBE delivery
- The user has a result-only Vibe tab. Do not make them wait for the entire page before anything useful appears.
- A clearly labelled local overview is already on screen. Start by checking and publishing one short hero or quick-path section; do not spend the first response restating the plan or the local overview.
- Split independent research into bounded lanes under the host's concurrency and cost policy. A fast source-check lane may publish before deeper specialist lanes, but Codex must verify every lane before its content becomes visible. Never create workers merely to simulate activity.
- Whenever one self-contained page section is complete and safe to show, send it as a commentary update using exactly this transport envelope: <vibe-section id="hero">complete Markdown section here</vibe-section>.
- Use a short unique id such as hero, quick-paths, main-edit, comparison, watch, reality-check or sources. Send sections in reading order and never repeat an id.
- Prefer compact sections that can be read while the next one is checked. Do not hold a ready early section behind the slowest research lane, and do not split a paragraph, list, table or citation merely to create more updates.
- Publish a section only after its relevant sources have been checked and its claims meet this recipe. Never place plans, tool activity, uncertainty you have not resolved, worker prose or work-in-progress fragments inside a vibe-section envelope.
- Close every Markdown paragraph, link, list and table before closing the envelope. Continue normal commentary outside these envelopes when a genuine progress update is useful.
- The final answer must still contain the complete coherent page without transport envelopes, so Chat retains the canonical result and the Vibe tab can reconcile to it.

## Output contract
- Return the finished guide, not a plan for making one and not the prompt itself.
- Use descriptive links rather than naked URLs. Keep image and video links separate when embedding rights are uncertain.
- Never fabricate a product, price, ingredient, quote, review, creator, image, video, citation or availability claim.
- If browsing or a key source is unavailable, say exactly what could not be verified and produce a smaller honest guide instead of guessing.
- Preserve user agency: recommendations are options, not pressure; external purchases and other consequential actions remain explicit confirmation steps.
`;
}

export const CONTENT_RECIPES = Object.freeze({
  skincare: Object.freeze({
    title: "Skin Care, Beautifully Sorted",
    prompt: buildRecipePrompt({
      title: "Skin Care, Beautifully Sorted",
      goal: "Create a current, evidence-aware skin-care discovery guide that helps an adult compare realistic routines and products without diagnosing them, scoring their appearance or pretending that one routine suits everyone. Organise the guide by skin need and tolerance rather than by gender or an invented personal profile.",
      theme: "a warm rose-quartz beauty editorial with clean clinical details, soft morning light and calm product photography",
      mainEdit: "Build three simple routine routes—gentle essentials, targeted active and budget-conscious—showing morning/evening order, frequency, likely fit, important ingredients, common irritants, price band and what evidence supports each step. Include 8–12 products across multiple brands and price levels; fewer is better when evidence or availability is weak.",
      rules: `- This is general consumer information, not diagnosis or medical treatment. Do not recommend treating a disease or replacing professional care.
- Use authoritative health or dermatology sources for ingredient safety and broad guidance. Separate those sources from brand claims and creator opinions.
- Include patch-testing and gradual-introduction guidance. Flag pregnancy-related ingredient uncertainty and advise checking with an appropriate clinician rather than making a blanket claim.
- Do not infer skin type, allergies, age, ethnicity, pregnancy status or medical conditions. Offer optional filter chips for these only where appropriate and safe.
- Avoid fear-based “clean beauty” language, appearance scoring, pore or ageing shame, and unsupported claims such as detoxification or permanent transformation.
- For each product card include product type, key ingredients, fragrance information if verified, size, current price/date/region, official product link, official image/gallery link, one credible evidence or expert-context link, and a useful tutorial/video link when one exists.`,
    }),
  }),
  makeup: Object.freeze({
    title: "Makeup Lessons Worth Watching",
    prompt: buildRecipePrompt({
      title: "Makeup Lessons Worth Watching",
      goal: "Create a current, creator-led makeup learning edit that helps an adult find genuinely useful techniques, working artists and realistic products without scoring their face, prescribing femininity or replacing the people who teach the craft. Treat makeup as optional creative expression, not correction.",
      theme: "a saturated backstage beauty magazine with real editorial photography, graphic colour swatches and crisp tutorial chapters",
      mainEdit: "Build four tutorial routes—five-minute polish, expressive colour, technique clinic and event-ready longevity. For each route select 2–3 excellent creator or professional videos, explain the specific skill taught, credit the artist and model when available, and pair only the products or tools necessary to practise it. Include different skin tones, face shapes and accessibility needs across the whole edit without claiming one technique is universal.",
      rules: `- Prioritise original videos from working makeup artists, credible educators and the brands or publications that commissioned them. Link the original upload and credit the human creator prominently.
- Separate technique advice from sponsored product placement. State sponsorship, gifted products, affiliate relationships or brand ownership when disclosed or reasonably evident.
- Never analyse attractiveness, identify flaws, lighten skin, prescribe gender expression or imply that makeup is required. Avoid race, age, health or gender inference from an image.
- Flag eye, adhesive, glitter and hygiene risks using authoritative sources where relevant; do not invent cosmetic safety claims.
- For each lesson include creator, platform, duration, skill level, skin-tone or accessibility context when explicitly provided, why an editor picked it, original video link, one still/gallery link where permitted, and a minimal product/tool list with dated UK links.`,
    }),
  }),
  anime: Object.freeze({
    title: "Anime Night, Sorted",
    prompt: buildRecipePrompt({
      title: "Anime Night, Sorted",
      goal: "Create a legal, current anime-night guide that moves someone from a mood to something they can actually watch now. Celebrate the credited writers, directors, animators, musicians and performers; do not generate substitutes for their work.",
      theme: "a luminous midnight-city programme guide with neon rain, cinematic still-link cards and restrained motion",
      mainEdit: "Offer three mood routes—dreamy escape, emotionally intense and playful comfort—with 3–5 titles each. For every title include a spoiler-free reason to choose it tonight, episode or film length, age/content notes, credited key creators, legal UK availability checked today, official title page, official artwork/gallery link and official trailer link.",
      rules: `- Use official distributor, broadcaster, studio or licensed streaming pages for availability and trailers wherever possible.
- Never link piracy, unofficial uploads or deceptive free-streaming pages.
- Distinguish included-with-subscription, rental, purchase and free-with-adverts. Do not start a subscription or purchase.
- Do not reproduce copyrighted artwork. Link to the official page or embeddable media and attribute it.
- Avoid imitating a named living artist or studio in any generated connective visuals.`,
    }),
  }),
  conversation: Object.freeze({
    title: "Say It Better, With Experts",
    prompt: buildRecipePrompt({
      title: "Say It Better, With Experts",
      goal: "Create a compassionate communication guide built from credible educators and useful creator-led videos. It should help rehearse wording while encouraging real human connection, never impersonating a partner, friend or therapist.",
      theme: "an intimate violet evening magazine with conversational scene cards and gentle branching choices",
      mainEdit: "Choose one common low-risk conversation scenario and show three distinct approaches—warm, direct and boundary-first. For each, explain the trade-off, offer a short fictional script, identify language that could escalate tension and link to the expert or creator resource that informed it.",
      rules: `- State clearly that scripts are fictional rehearsal, not a prediction of another person’s response and not therapy or legal advice.
- Do not diagnose either person, encourage dependency on the system or frame the system as a relationship replacement.
- If the topic suggests abuse, coercion, self-harm, immediate danger or another high-risk situation, stop the lifestyle format and give appropriate, location-aware professional or emergency signposting.
- Credit educators and creators, link original videos/articles, and distinguish research-backed guidance from one creator’s perspective.`,
    }),
  }),
  style: Object.freeze({
    title: "Find My Look, With Receipts",
    prompt: buildRecipePrompt({
      title: "Find My Look, With Receipts",
      goal: "Create a shoppable but non-pressuring style guide that turns one cinematic visual direction into realistic outfit options. Make price, stock freshness, sizing uncertainty, sponsorship and creator credit visible.",
      theme: "a jewel-toned fashion story with full-bleed scene imagery, tactile colour swatches and transparent product cards",
      mainEdit: "Build one hero look and three routes—closest visual match, budget remix and wear-again capsule. Include garments, accessories and optional beauty details. For each item show why it belongs, current price/date/region, verified size range when available, material information, official product page, official image/gallery link and a styling or creator-video link.",
      rules: `- Mix brands and price levels; never rank based on commission or undisclosed sponsorship.
- Do not claim an item will suit a body type or score someone’s attractiveness. Offer silhouettes and styling options without body shame.
- Treat stock, sizes, delivery and prices as perishable facts and label the exact check date.
- Do not add anything to a basket or purchase. Any future purchasing step must retain protected confirmation.
- Credit the stylist, photographer, designer, presenter or other creator behind every linked editorial or tutorial resource.`,
    }),
  }),
  streetStyle: Object.freeze({
    title: "The Street-Style Edit",
    prompt: buildRecipePrompt({
      title: "The Street-Style Edit",
      goal: "Create a current street-style edit grounded in real photographers, stylists, designers and people wearing clothes in the world. Turn a small number of credited editorial references into practical outfit ideas without copying a person, inventing a trend or pretending that shopping is the only route to style.",
      theme: "a candid city fashion zine with real photography, bold graphic crop marks, type-led captions and transparent source cards",
      mainEdit: "Select three clearly sourced visual directions from recent street-style photography or editorials, explain why each feels relevant now, and translate each into a wear-what-you-own route, a considered new-item route and a size-aware alternative. Include 2–4 realistic items per direction rather than an oversized shopping list.",
      rules: `- Start from real, credited photography and editorial reporting. Link the original photographer, publication or event page and never present generated imagery as documentary evidence.
- Distinguish an observed styling idea from a claimed trend. Do not call something a trend from one image or from retailer marketing alone.
- Include a wear-what-you-own interpretation before product links. Mix retailers, resale and independent designers; disclose sponsorship or affiliate relationships.
- Do not infer identity, income, body type or attractiveness from photographed people. Describe clothes and styling choices, not bodies.
- For every purchasable item include dated UK price, size range if verified, material information, official page and official image/gallery link. Never add to a basket or purchase.`,
    }),
  }),
});
