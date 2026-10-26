import { appearancePaletteStyles } from "../../../../shared/article-appearance.js";

import { PUBLICATION_MASTHEAD_STYLES } from "../../../../shared/publication-masthead.js";

export const MAGAZINE_APPEARANCE_STYLES = `
${appearancePaletteStyles(".vfx-shell")}
${PUBLICATION_MASTHEAD_STYLES}
.vfx-shell .vfx-publication-banner { width:100%; }
.vfx-shell .vfx-masthead-home { display:block; width:100%; border:0; padding:0; background:none; cursor:pointer; }
.vfx-shell .vfx-wordmark span { font-size:12px; letter-spacing:.06em; text-transform:uppercase; }
.vfx-shell .vfx-edition { margin-right:auto; margin-left:0; }
.vfx-shell:not([data-view="chat"]),.vfx-shell .vfx-stream { color:var(--ink); background:var(--page); }
.vfx-shell .vfx-stream { background:radial-gradient(ellipse at 85% 0,color-mix(in srgb,var(--accent) 8%,transparent),transparent 40%),var(--page); scrollbar-color:var(--edge) transparent; }
.vfx-shell .vfx-header { background:color-mix(in srgb,var(--page) 94%,transparent); border-color:var(--edge); }
.vfx-shell .vfx-wordmark span { background:none; color:var(--ink); }
.vfx-shell .vfx-wordmark small,.vfx-shell .vfx-edition,.vfx-shell .vfx-edition-intro p,.vfx-shell .vfx-library p,.vfx-shell .vfx-library-status,.vfx-shell .vfx-footer,.vfx-shell .vfx-pull,.vfx-shell .vfx-chunk-meta,.vfx-shell .vfx-share-link-panel p { color:var(--muted); }
.vfx-shell .vfx-edition-intro>span,.vfx-shell .vfx-source-link,.vfx-shell .vfx-markdown a,.vfx-shell .vfx-chunk-heading>div>span { color:var(--accent); }
.vfx-shell .vfx-chunk { background:var(--surface); border-color:var(--edge); box-shadow:0 14px 42px #0000000a; }
.vfx-shell .vfx-markdown { color:var(--muted); }
.vfx-shell .vfx-markdown blockquote,.vfx-shell .vfx-markdown th,.vfx-shell .vfx-math { color:var(--ink); background:var(--wash); }
.vfx-shell .vfx-markdown pre,.vfx-shell .vfx-inline-visuals figure,.vfx-shell .vfx-share-link-panel { color:var(--ink); background:var(--surface); border-color:var(--edge); }
.vfx-shell .vfx-inline-visuals figcaption,.vfx-shell .vfx-inline-visuals a { color:var(--muted); }
.vfx-shell .vfx-share,.vfx-shell .vfx-skip,.vfx-shell .vfx-chat-cta,.vfx-shell .vfx-find,.vfx-shell .vfx-chat,.vfx-shell .vfx-save,.vfx-shell .vfx-update { color:var(--ink); background:var(--wash); border-color:var(--edge); }
.vfx-shell .vfx-save[aria-pressed="true"] { color:var(--ink); background:color-mix(in srgb,var(--accent) 18%,var(--surface)); border-color:var(--accent); }
.vfx-shell .vfx-intro-cta,.vfx-shell .vfx-update.is-active,.vfx-shell .vfx-media-button { color:var(--page)!important; background:var(--accent); border-color:var(--accent); }
.vfx-shell .vfx-intro-cta:disabled { opacity:.65; cursor:wait; }
.vfx-shell .vfx-library-search>div,.vfx-shell .vfx-share-link-panel input { background:var(--surface); border-color:var(--edge); color:var(--ink); }
.vfx-shell .vfx-library-search input { color:var(--ink); }
.vfx-shell button:focus-visible,.vfx-shell a:focus-visible { outline-color:var(--accent); }
.vfx-shell[data-text-size="large"] .vfx-markdown { font-size:18px; line-height:1.8; }
.vfx-shell[data-spacing="roomy"] .vfx-chunks { gap:32px; }
.vfx-shell[data-spacing="roomy"] .vfx-chunk-copy { padding:clamp(26px,4vw,52px); }
.vfx-shell[data-mood="lilac-pop"] .vfx-stream { background:radial-gradient(circle at 88% 4%,#efc8ff 0,transparent 29%),radial-gradient(circle at 5% 28%,#ffd9ee 0,transparent 24%),var(--page); }
.vfx-shell[data-mood="lilac-pop"] .vfx-chunk { border-radius:26px 10px 26px 10px; box-shadow:0 18px 48px #7d3a9d16; }
.vfx-shell[data-mood="lilac-pop"] :is(.vfx-edition-intro h1,.vfx-library h1,.vfx-chunk h2) { font-family:Georgia,"Times New Roman",serif; font-style:italic; }
.vfx-shell[data-mood="cherry-soda"] .vfx-stream { background:repeating-linear-gradient(0deg,transparent 0 42px,color-mix(in srgb,var(--accent) 5%,transparent) 43px),var(--page); }
.vfx-shell[data-mood="cherry-soda"] .vfx-chunk { border-radius:6px; box-shadow:7px 7px 0 color-mix(in srgb,var(--accent) 12%,transparent); }
.vfx-shell[data-mood="cherry-soda"] :is(.vfx-edition-intro h1,.vfx-library h1,.vfx-chunk h2) { font-family:"Arial Rounded MT Bold",Arial,sans-serif; letter-spacing:-.03em; }
.vfx-shell[data-mood="matcha-break"] .vfx-stream { background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 7%,transparent),transparent 34%),var(--page); }
.vfx-shell[data-mood="matcha-break"] .vfx-chunk { border-radius:18px; box-shadow:none; }
.vfx-shell[data-mood="matcha-break"] :is(.vfx-edition-intro h1,.vfx-library h1,.vfx-chunk h2) { font-family:"Avenir Next",Avenir,Inter,sans-serif; font-weight:650; letter-spacing:-.025em; }
.vfx-shell[data-mood="after-dark"] .vfx-stream { background:radial-gradient(circle at 78% 8%,#6b214c55 0,transparent 30%),linear-gradient(155deg,#100914,#190d20 58%,#0c0710); }
.vfx-shell[data-mood="after-dark"] .vfx-chunk { border-radius:2px 22px 2px 22px; box-shadow:0 20px 64px #0008; }
.vfx-shell[data-mood="after-dark"] :is(.vfx-edition-intro h1,.vfx-library h1,.vfx-chunk h2) { font-family:Didot,"Bodoni 72",Georgia,serif; font-weight:600; letter-spacing:.005em; }
@media(max-width:760px) { .vfx-header { height:auto; min-height:78px; padding:12px 16px; gap:8px; flex-wrap:wrap; } .vfx-wordmark { margin-right:auto; } .vfx-edition { display:none; } .vfx-header .vfx-find,.vfx-header .vfx-update,.vfx-header .vfx-chat { padding:0 10px; font-size:11px; } }
/* News hierarchy: a lead story, image-led columns and a separate long-read width. */
.vfx-shell[data-look="bbc-news"] { font-family:Arial,Helvetica,sans-serif; }
.vfx-shell[data-look="bbc-news"] .vfx-stream { background:var(--page); }
.vfx-shell[data-look="bbc-news"] .vfx-header { min-height:56px; height:56px; padding-inline:max(20px,calc((100% - 1240px)/2)); background:var(--page); color:var(--ink); backdrop-filter:none; }
.vfx-shell[data-look="bbc-news"] .vfx-wordmark span { color:var(--ink); font-size:12px; letter-spacing:.06em; }
.vfx-shell[data-look="bbc-news"] .vfx-header :is(.vfx-find,.vfx-chat,.vfx-update) { color:var(--ink); background:transparent; border-color:var(--edge); border-radius:0; }
.vfx-shell[data-look="bbc-news"] .vfx-edition { color:var(--muted); }
.vfx-shell[data-look="bbc-news"] :is(.vfx-edition-intro,.vfx-library,.vfx-footer) { width:min(1240px,calc(100% - 40px)); }
.vfx-shell[data-look="bbc-news"] .vfx-edition-intro { position:relative; padding:28px 190px 28px 0; }
.vfx-shell[data-look="bbc-news"] :is(.vfx-edition-intro h1,.vfx-library h1,.vfx-chunk h2,.vfx-markdown h3) { font-family:Arial,Helvetica,sans-serif; font-style:normal; font-weight:700; letter-spacing:-.025em; line-height:1.12; }
.vfx-shell[data-look="bbc-news"] .vfx-edition-intro h1 { margin:8px 0 10px; font-size:32px; }
.vfx-shell[data-look="bbc-news"] .vfx-edition-intro p { font-size:16px; }
.vfx-shell[data-look="bbc-news"] .vfx-edition-intro .vfx-intro-cta { position:absolute; right:0; top:42px; margin:0; }
.vfx-shell[data-look="bbc-news"] .vfx-edition-intro .vfx-update-note { max-width:none; font-size:12px; margin-top:12px; }
.vfx-shell[data-look="bbc-news"] .vfx-chunks { gap:28px; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk { border:0; border-top:1px solid var(--edge); border-radius:0; box-shadow:none; background:var(--page); }
.vfx-shell[data-look="bbc-news"] .vfx-chunk-copy { padding:18px 0 24px; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk h2 { margin:8px 0 16px; font-size:28px; text-wrap:pretty; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk[data-layout="compact"] h2 { font-size:24px; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk.is-hero:not([data-expanded="true"]):not([data-interactive="true"]):not([data-has-table="true"]) { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr); gap:32px; padding-top:24px; border-top:3px solid var(--accent); }
.vfx-shell[data-look="bbc-news"] .vfx-chunk.is-hero .vfx-chunk-copy { order:0; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk.is-hero .vfx-chunk-visual { order:1; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk.is-hero h2 { font-size:clamp(32px,3vw,46px); line-height:1.08; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk .vfx-chunk-visual { min-height:0; height:auto; background:var(--wash); }
.vfx-shell[data-look="bbc-news"] .vfx-chunk .vfx-chunk-visual img { min-height:0; height:auto; aspect-ratio:16/9; object-fit:cover; transform:none; filter:none; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk.is-hero .vfx-chunk-visual img { aspect-ratio:4/3; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk[data-visual-kind="illustration"] .vfx-chunk-visual img { object-fit:contain; padding:18px; background:#f7efe4; }
.vfx-shell[data-look="bbc-news"] .vfx-visual-shade { display:none; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk .vfx-chunk-visual figcaption { position:static; padding:10px 12px; background:var(--wash); color:var(--muted); font-size:12px; line-height:1.45; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk .vfx-chunk-visual a { color:var(--muted); text-underline-offset:3px; }
.vfx-shell[data-look="bbc-news"] .vfx-markdown { color:var(--ink); font-size:17px; line-height:1.62; }
.vfx-shell[data-look="bbc-news"] .vfx-reading.is-excerpt { max-height:170px; mask-image:linear-gradient(#000 78%,transparent); }
.vfx-shell[data-look="bbc-news"] .vfx-chunk[data-expanded="true"] { grid-column:1/-1; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk[data-expanded="true"] .vfx-chunk-copy { max-width:700px; margin:0 auto; padding:28px 0; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk[data-expanded="true"] .vfx-markdown { font-size:19px; }
.vfx-shell[data-look="bbc-news"] .vfx-chunk[data-expanded="true"] .vfx-chunk-visual img { aspect-ratio:auto; max-height:min(75svh,720px); object-fit:contain; }
.vfx-shell[data-look="bbc-news"][data-text-size="large"] .vfx-markdown { font-size:20px; line-height:1.7; }
.vfx-shell[data-look="bbc-news"][data-text-size="large"] .vfx-chunk[data-expanded="true"] .vfx-markdown { font-size:22px; }
.vfx-shell[data-look="bbc-news"][data-spacing="roomy"] .vfx-chunks { gap:40px; }
.vfx-shell[data-look="bbc-news"][data-spacing="roomy"] .vfx-chunk-copy { padding-block:30px; }
.vfx-shell[data-look="bbc-news"] :is(.vfx-share,.vfx-skip,.vfx-save,.vfx-read-more,.vfx-intro-cta,.vfx-inline-visuals figure,.vfx-player) { border-radius:0; }
.vfx-shell[data-look="bbc-news"] .vfx-card-actions { border-top:1px solid var(--edge); padding-top:16px; }
.vfx-shell[data-look="bbc-news"] .vfx-reader-actions { justify-content:flex-start; margin-left:0; }
.vfx-shell[data-look="bbc-news"] .vfx-source-link { font-size:13px; }
.vfx-shell[data-look="bbc-news"] .vfx-next-page { color:var(--muted); }
.vfx-shell[data-look="bbc-news"] .vfx-inline-visuals img { object-fit:contain; background:var(--wash); }
@media(max-width:900px) {
  .vfx-shell[data-look="bbc-news"] .vfx-chunk.is-hero:not([data-expanded="true"]):not([data-interactive="true"]):not([data-has-table="true"]) { display:block; }
  .vfx-shell[data-look="bbc-news"] .vfx-chunk.is-hero .vfx-chunk-visual img { aspect-ratio:16/9; }
}
@media(max-width:560px) {
  .vfx-shell[data-look="bbc-news"] .vfx-header { height:auto; min-height:92px; padding:12px 16px; }
  .vfx-shell[data-look="bbc-news"] :is(.vfx-edition-intro,.vfx-library,.vfx-chunks,.vfx-footer) { width:calc(100% - 32px); }
  .vfx-shell[data-look="bbc-news"] .vfx-edition-intro { padding:24px 0; }
  .vfx-shell[data-look="bbc-news"] .vfx-edition-intro h1 { font-size:28px; }
  .vfx-shell[data-look="bbc-news"] .vfx-edition-intro .vfx-intro-cta { position:static; margin-top:18px; }
  .vfx-shell[data-look="bbc-news"] .vfx-chunk .vfx-chunk-visual img { min-height:0!important; height:auto!important; }
  .vfx-shell[data-look="bbc-news"] .vfx-chunk h2 { font-size:28px; }
  .vfx-shell[data-look="bbc-news"] .vfx-chunk.is-hero h2 { font-size:32px; }
  .vfx-shell[data-look="bbc-news"] .vfx-chunk[data-expanded="true"] .vfx-markdown { font-size:18px; }
  .vfx-shell[data-look="bbc-news"][data-text-size="large"] .vfx-chunk[data-expanded="true"] .vfx-markdown { font-size:21px; }
}
`;
