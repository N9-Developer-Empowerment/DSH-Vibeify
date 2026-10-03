import { PUBLICATION_MASTHEAD_STYLES } from "../../../shared/publication-masthead.js";
import { appearancePaletteStyles } from "../../../shared/article-appearance.js";

/** Share surface adapter. Prose and wide embeds keep their existing roles. */
export const SHARE_APPEARANCE_STYLES = `
${appearancePaletteStyles("body")}
${PUBLICATION_MASTHEAD_STYLES}
body[data-look] .share-utility { height:40px; min-height:40px; gap:12px; font-size:11px; padding:0 clamp(20px,5vw,72px); }
.publication-banner { width:100%; }
.publication-banner .vibe-masthead { width:100%; }
body[data-look] { background:var(--page); color:var(--ink); }
body[data-look] :is(.share-note,.source,.status,.empty,.published-share-status,.published-link-label,.lead figcaption,.gallery figcaption) { color:var(--muted); }
body[data-look] header { background:var(--surface); border-color:var(--edge); }
body[data-look] :is(.article,.gallery figure,.media-card,.try-vibe,.preview-actions,.published-actions,.body pre,.lead) { background:var(--surface); border-color:var(--edge); }
body[data-look] :is(.body a,.source a,.try-vibe p a,.media-actions a,.published-actions>a) { color:var(--accent); }
body[data-look] :is(button,.cta-link,.published-link-label input) { background:var(--surface); color:var(--ink); border-color:var(--edge); }
body[data-look] button.primary { background:var(--accent); color:var(--page); border-color:var(--accent); }
body[data-look] :is(.body th,.math) { color:var(--ink); background:var(--wash); }
body[data-look] :is(.body th,.body td) { border-color:var(--edge); }
body[data-text-size="large"] .body { font-size:clamp(20px,2vw,24px); }
body[data-spacing="roomy"] .copy { padding:clamp(30px,5vw,80px); }
body[data-look="bbc-news"] .article { border:0; border-top:1px solid var(--edge); border-radius:0; box-shadow:none; }
body[data-look="bbc-news"] .lead { border-radius:0; margin:24px auto 32px; }
body[data-look="bbc-news"] :is(h1,h2,h3,h4) { font-family:Georgia,serif; font-weight:700; letter-spacing:-.025em; }
body[data-look="bbc-news"] h1 { font-size:clamp(34px,5vw,60px); line-height:1.1; }
body[data-look="bbc-news"] .body { color:var(--ink); }
body[data-look="bbc-news"] :is(button,.try-vibe,.media-card,.preview-actions,.published-actions,.gallery figure) { border-radius:0; }
`;
