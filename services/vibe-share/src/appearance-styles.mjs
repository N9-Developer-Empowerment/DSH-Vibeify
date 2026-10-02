import { appearancePaletteStyles } from "../../../shared/article-appearance.js";

/** Share surface adapter. Prose and wide embeds keep their existing roles. */
export const SHARE_APPEARANCE_STYLES = `
${appearancePaletteStyles("body")}
body[data-look] { background:var(--page); color:var(--ink); }
body[data-look] header { background:var(--surface); border-color:var(--edge); }
body[data-look] .brand { background:none; color:var(--ink); }
body[data-look] :is(.brand small,.share-note,.source,.status,.empty,.published-share-status,.published-link-label,.lead figcaption,.gallery figcaption) { color:var(--muted); }
body[data-look] :is(.article,.gallery figure,.media-card,.try-vibe,.preview-actions,.published-actions,.body pre,.lead) { background:var(--surface); border-color:var(--edge); }
body[data-look] :is(.body a,.source a,.try-vibe p a,.media-actions a,.published-actions>a) { color:var(--accent); }
body[data-look] :is(button,.cta-link,.published-link-label input) { background:var(--surface); color:var(--ink); border-color:var(--edge); }
body[data-look] button.primary { background:var(--accent); color:var(--page); border-color:var(--accent); }
body[data-look] :is(.body th,.math) { color:var(--ink); background:var(--wash); }
body[data-look] :is(.body th,.body td) { border-color:var(--edge); }
body[data-text-size="large"] .body { font-size:clamp(20px,2vw,24px); }
body[data-spacing="roomy"] .copy { padding:clamp(30px,5vw,80px); }
body[data-look="bbc-news"] header { height:auto; min-height:104px; background:var(--accent); color:var(--page); border-bottom:5px solid var(--ink); gap:16px; }
body[data-look="bbc-news"] .brand { color:var(--page); font-size:38px; letter-spacing:-.02em; }
body[data-look="bbc-news"] :is(.brand small,.share-note) { color:var(--page); }
body[data-look="bbc-news"] .brand small { font-size:11px; letter-spacing:0; text-transform:none; }
body[data-look="bbc-news"] .article { border:0; border-top:1px solid var(--edge); border-radius:0; box-shadow:none; }
body[data-look="bbc-news"] .lead { border-radius:0; margin:24px auto 32px; }
body[data-look="bbc-news"] :is(h1,h2,h3,h4) { font-family:Georgia,serif; font-weight:700; letter-spacing:-.025em; }
body[data-look="bbc-news"] h1 { font-size:clamp(34px,5vw,60px); line-height:1.1; }
body[data-look="bbc-news"] .body { color:var(--ink); }
body[data-look="bbc-news"] :is(button,.try-vibe,.media-card,.preview-actions,.published-actions,.gallery figure) { border-radius:0; }
@media(max-width:680px) { body[data-look="bbc-news"] header { padding:16px; align-items:flex-start; flex-direction:column; } }
`;
