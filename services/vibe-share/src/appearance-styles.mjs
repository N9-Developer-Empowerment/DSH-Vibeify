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
body[data-mood="lilac-pop"] { background:radial-gradient(circle at 88% 4%,#efc8ff 0,transparent 29%),var(--page); }
body[data-mood="lilac-pop"] .article { border-radius:26px 10px 26px 10px; box-shadow:0 18px 48px #7d3a9d16; }
body[data-mood="lilac-pop"] :is(h1,h2,h3,h4) { font-family:Georgia,"Times New Roman",serif; font-style:italic; }
body[data-mood="cherry-soda"] { background:repeating-linear-gradient(0deg,transparent 0 42px,color-mix(in srgb,var(--accent) 5%,transparent) 43px),var(--page); }
body[data-mood="cherry-soda"] .article { border-radius:6px; box-shadow:7px 7px 0 color-mix(in srgb,var(--accent) 12%,transparent); }
body[data-mood="cherry-soda"] :is(h1,h2,h3,h4) { font-family:"Arial Rounded MT Bold",Arial,sans-serif; letter-spacing:-.03em; }
body[data-mood="matcha-break"] { background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 7%,transparent),transparent 34%),var(--page); }
body[data-mood="matcha-break"] .article { border-radius:18px; box-shadow:none; }
body[data-mood="matcha-break"] :is(h1,h2,h3,h4) { font-family:"Avenir Next",Avenir,Inter,sans-serif; font-weight:650; letter-spacing:-.025em; }
body[data-mood="after-dark"] { background:radial-gradient(circle at 78% 8%,color-mix(in srgb,var(--accent) 12%,transparent) 0,transparent 30%),var(--page); }
body[data-mood="after-dark"] .article { border-radius:2px 22px 2px 22px; box-shadow:0 20px 64px #0008; }
body[data-mood="after-dark"] :is(h1,h2,h3,h4) { font-family:Didot,"Bodoni 72",Georgia,serif; font-weight:600; letter-spacing:.005em; }
/* Newsroom pages use a wide visual and a narrower, left-aligned reading column. */
body[data-look="bbc-news"] {
  --reading-width:700px;
  --headline-width:1040px;
  --image-width:1040px;
}
body[data-look="bbc-news"] { background:var(--page); font-family:Arial,Helvetica,sans-serif; }
body[data-look="bbc-news"] .article {
  max-width:1120px;
  margin:32px auto 48px;
  border:0;
  border-radius:0;
  box-shadow:none;
  background:var(--page);
}
body[data-look="bbc-news"] .copy>.source { margin-inline:0; border-color:var(--edge); }
body[data-look="bbc-news"] .copy { padding:0 28px; display:grid; grid-template-columns:minmax(0,min(100%,var(--reading-width))) minmax(0,1fr); }
body[data-look="bbc-news"] .copy>* { min-width:0; grid-column:1 / -1; }
body[data-look="bbc-news"] .copy>.kind { grid-row:1; }
body[data-look="bbc-news"] .copy>h1 { grid-row:2; }
body[data-look="bbc-news"] .copy>.lead { grid-row:4; }
body[data-look="bbc-news"] .copy>:is(h1,.kind) { margin-inline:0; }
body[data-look="bbc-news"] .copy>h1 { margin:12px 0 24px; }
body[data-look="bbc-news"] .vibe-masthead[data-treatment="news"] { --masthead-inset:max(20px,calc((100% - 1120px)/2 + 28px)); }
body[data-look="bbc-news"] .lead {
  width:min(100%,var(--image-width));
  max-width:var(--image-width);
  border-radius:0;
  margin:24px 0 32px;
  background:var(--wash);
}
body[data-look="bbc-news"] .lead img {
  width:auto;
  max-width:100%;
  max-height:min(75svh,720px);
  object-fit:contain;
}
body[data-look="bbc-news"] :is(.lead figcaption,.gallery figcaption) {
  background:var(--wash);
  color:var(--muted);
  font-size:13px;
  line-height:1.5;
}
body[data-look="bbc-news"] :is(h1,h2,h3,h4) {
  font-family:Arial,Helvetica,sans-serif;
  font-style:normal;
  font-weight:700;
  letter-spacing:-.025em;
}
body[data-look="bbc-news"] h1 {
  font-size:clamp(32px,5.6vw,52px);
  line-height:1.08;
  text-align:left;
  text-wrap:pretty;
}
body[data-look="bbc-news"] .copy>.body {
  display:contents;
  color:var(--ink);
  font-size:19px;
  line-height:1.62;
}
body[data-look="bbc-news"] .copy>.body>* { grid-column:1; }
body[data-look="bbc-news"] .copy>.body>:is(.vibe-interactive,.table-scroll,.media-card,.gallery) {
  grid-column:1 / -1;
}
body[data-look="bbc-news"] .copy>.body>p:first-child {
  grid-row:3;
  grid-column:1 / -1;
  max-width:880px;
  font-size:1.15em;
  line-height:1.5;
}
body[data-look="bbc-news"][data-text-size="large"] .copy>.body { font-size:clamp(20px,2vw,24px); }
body[data-look="bbc-news"][data-spacing="roomy"] .copy { padding:clamp(30px,5vw,80px); }
body[data-look="bbc-news"] :is(button,.try-vibe,.media-card,.preview-actions,.published-actions,.gallery figure) { border-radius:0; }
@media(max-width:760px) {
  body[data-look="bbc-news"] .copy { padding:0 20px; grid-template-columns:minmax(0,1fr); }
  body[data-look="bbc-news"] .vibe-masthead[data-treatment="news"] { --masthead-inset:20px; }
  body[data-look="bbc-news"] .copy>.body { font-size:18px; }
  body[data-look="bbc-news"][data-text-size="large"] .copy>.body { font-size:22px; }
  body[data-look="bbc-news"][data-spacing="roomy"] .copy { padding:24px 28px; }
  body[data-look="bbc-news"] .copy>.body>:is(.vibe-interactive,.table-scroll,.media-card,.gallery) { grid-column:1; }
}
`;
