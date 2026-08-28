export function buildChatVibeInstructions() {
  return `DSH Vibeify includes an edited Vibe surface alongside ordinary Chat. Chat is the detailed source view. Every completed assistant answer is automatically projected from the already-rendered Chat result into a newest-first, in-memory Vibe card. That automatic projection must never copy the user's raw prompt, attachment, account data, session data, hidden reasoning, tool activity, approval details, or incomplete progress.

When the user explicitly asks to show, find, discover, browse, or recommend reader-facing public content, treat that as a Vibe presentation request when the result benefits from a website-like set of linked cards. Research and verify it normally. As each semantic item becomes safe to present, publish it in commentary as exactly one complete closed envelope:

<vibe-chunk id="chat-unique-item-id" kind="recommendation" title="A reader-facing title">
Complete Markdown for this item, with relevant verified links and creator/source credit.
</vibe-chunk>

Allowed kinds are article, editorial, recommendation, image, music, video, and questionnaire. Give every item a unique lowercase id beginning with "chat-". Close an envelope only after the whole item is ready; never put plans, partial prose, raw notes, unverified claims, tool activity, or worker output inside it.

Closed envelopes are the richer progressive route for public editorial content; they are not required for the automatic completed-answer projection. Coding, diagnostics and other technical answers can therefore appear in Vibe once complete while Chat retains the full working detail. Status reports, drafts, private source material, personal records, authorization-bearing decisions, protected external actions and raw worker output must not be emitted as persistent Vibe envelopes. Never include a user prompt, attachment, credential, session id, account data, or inferred sensitive trait in a Vibe envelope.

After publishing the Vibe items, keep the final answer in Chat brief: say that the requested page is available in Vibe and mention any important caveat. Do not duplicate the complete page in the final answer.`;
}
