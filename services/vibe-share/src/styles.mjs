import { SHARE_APPEARANCE_STYLES } from "./appearance-styles.mjs";
/** Shared by preview and published articles. Keep width policy here, not in renderers. */
export const SHARE_STYLES = `
:root {
  color-scheme:dark;
  --ink:#fffafc;
  --muted:#c8bbc4;
  --accent:#ff86ad;
  --article-width:calc(100% - clamp(24px,6vw,160px));
  --reading-width:68ch;
  --headline-width:1040px;
  --image-width:1040px;
  --image-height:min(75svh,720px);
}

* {
  box-sizing:border-box;
}

body {
  margin:0;
  background:radial-gradient(circle at 82% 0,#35182f 0,transparent 28%),#090609;
  color:var(--ink);
  font-family:Inter,system-ui,sans-serif;
}

header {
  height:76px;
  padding:0 clamp(20px,5vw,72px);
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid #ffffff17;
  background:#090609e8;
}

header a {
  color:inherit;
  text-decoration:none;
}

.brand {
  font-weight:900;
  letter-spacing:.18em;
  background:linear-gradient(100deg,#fff,#ff88ad 58%,#9f8cff);
  background-clip:text;
  color:transparent;
}

.brand small:empty { display:none; }

.brand small {
  display:block;
  margin-top:2px;
  color:#9f929b;
  font-size:9px;
  letter-spacing:.12em;
  text-transform:uppercase;
}

.article {
  width:var(--article-width);
  margin:clamp(28px,6vw,76px) auto 48px;
  overflow:hidden;
  border:1px solid #ffffff1c;
  border-radius:25px;
  background:linear-gradient(145deg,#261521,#110c12);
  box-shadow:0 30px 90px #0005;
}

.lead {
  width:fit-content;
  max-width:min(100%,var(--image-width));
  margin:clamp(20px,3vw,40px) auto 0;
  position:relative;
  background:#151016;
  border-radius:16px;
  overflow:hidden;
}

/* Preserve the full composition, including portraits. Games use a separate width. */
.lead>a {
  display:flex;
  justify-content:center;
}

.lead img {
  width:auto;
  height:auto;
  max-width:100%;
  max-height:var(--image-height);
  margin-inline:auto;
  display:block;
  object-fit:contain;
}

.lead figcaption,.gallery figcaption {
  padding:9px 14px;
  color:#a99ca5;
  font-size:11px;
}

.copy {
  padding:clamp(21px,3vw,64px);
}

.kind {
  color:var(--accent);
  font-size:10px;
  font-weight:850;
  letter-spacing:.15em;
  text-transform:uppercase;
}

h1,h2,h3,h4 {
  font-family:Iowan Old Style,Georgia,serif;
  font-weight:500;
  letter-spacing:-.04em;
}

h1 {
  margin:10px 0 30px;
  font-size:clamp(42px,7vw,82px);
  line-height:.98;
  text-wrap:balance;
}

h2 {
  margin:38px 0 14px;
  font-size:clamp(28px,4vw,44px);
  line-height:1.06;
}

h3 {
  margin:28px 0 12px;
  font-size:26px;
  line-height:1.14;
}

.body {
  color:var(--muted);
  font-size:clamp(16px,1.8vw,20px);
  line-height:1.72;
}

/* Typography and interactive space are independent. Never cap .body itself:
   its wide blocks must still inherit the full article width. */
.copy>.kind,.copy>h1 {
  width:min(100%,var(--headline-width));
  margin-inline:auto;
}

.copy>.kind {
  display:block;
}

.copy>h1 {
  margin-bottom:clamp(32px,4vw,56px);
  line-height:1.06;
}

.copy>.body {
  display:grid;
  grid-template-columns:minmax(0,1fr) min(100%,var(--reading-width)) minmax(0,1fr);
}

.copy>.body>* {
  grid-column:2;
  min-width:0;
}

/* Block roles, shared by the browser and server renderers. */
.copy>.body>:is(.vibe-interactive,.table-scroll,.media-card,.gallery) {
  grid-column:1 / -1;
  width:100%;
}

.copy>.body>p {
  margin:0 0 1.3em;
}

.copy>.body>p:first-child {
  font-size:1.15em;
  line-height:1.65;
  color:var(--ink);
}

.copy>.body>:is(h1,h2,h3,h4) {
  margin:1.3em 0 .55em;
  color:var(--ink);
  font-size:clamp(26px,2.6vw,38px);
  line-height:1.2;
  text-wrap:balance;
}

.copy>.body>:is(ul,ol) {
  margin:0 0 1.5em;
  padding-inline-start:1.4em;
}

.copy>.body li {
  padding-inline-start:.25em;
  margin-bottom:.55em;
}

.copy>.body li::marker {
  color:var(--accent);
}

.copy>.body strong {
  color:var(--ink);
  font-weight:700;
}

.copy>.source {
  max-width:var(--reading-width);
  margin-inline:auto;
  font-size:14px;
  line-height:1.6;
}

.preview-shell .article {
  width:100%;
}

.preview-intro {
  margin-inline:auto;
}

.body a,.source a {
  color:#ffc0d4;
  text-underline-offset:3px;
}

.body blockquote {
  border-left:2px solid var(--accent);
  padding:18px 20px;
  border-radius:0 14px 14px 0;
  background:#ffffff0b;
  font-family:Iowan Old Style,Georgia,serif;
}

.body pre {
  max-width:100%;
  padding:18px;
  overflow-x:auto;
  white-space:pre-wrap;
  border:1px solid #ffffff1c;
  border-radius:12px;
  background:#090609;
}

.body code {
  overflow-wrap:anywhere;
  word-break:break-word;
}

.math {
  max-width:100%;
  margin:26px 0;
  padding:20px 24px;
  overflow-x:auto;
  border-left:3px solid var(--accent);
  border-radius:0 12px 12px 0;
  background:#ffffff0b;
  color:#fff7fb;
  font-family:Iowan Old Style,Georgia,serif;
  font-size:clamp(22px,3vw,36px);
  line-height:1.25;
  letter-spacing:.015em;
  white-space:nowrap;
}

.gallery {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
  max-width:var(--image-width);
  margin:34px auto;
}

.gallery figure {
  margin:0;
  overflow:hidden;
  border:1px solid #ffffff18;
  border-radius:14px;
  background:#0c090d;
}

.gallery img {
  width:100%;
  height:300px;
  display:block;
  object-fit:contain;
}

.source {
  margin-top:42px;
  padding-top:22px;
  border-top:1px solid #ffffff18;
  color:#a899a4;
  font-size:12px;
}

.share-note {
  color:#9c8f98;
  font-size:11px;
}

.delete {
  margin-top:16px;
}

button,.cta-link {
  min-height:42px;
  padding:0 17px;
  border:1px solid #ffffff28;
  border-radius:999px;
  background:#ffffff0c;
  color:#fff;
  cursor:pointer;
  font:inherit;
}

button.primary {
  border-color:#ff9aba;
  background:#ff9aba;
  color:#1a0e15;
  font-weight:800;
}

button:disabled {
  opacity:.55;
  cursor:wait;
}

.preview-shell {
  width:var(--article-width);
  margin:42px auto 28px;
}

.preview-intro {
  max-width:680px;
  margin-bottom:30px;
}

.preview-intro h1 {
  font-size:clamp(38px,6vw,66px);
}

.preview-actions {
  position:sticky;
  z-index:3;
  bottom:18px;
  max-width:1040px;
  margin:28px auto;
  padding:14px;
  display:flex;
  align-items:center;
  gap:14px;
  border:1px solid #ffffff24;
  border-radius:18px;
  background:#171018e8;
  backdrop-filter:blur(18px);
}

.status {
  flex:1;
  color:#c9bdc5;
}

.empty {
  padding:60px 0;
  color:#b6a9b2;
}

.turnstile {
  margin:10px 0;
}

.try-vibe {
  width:var(--article-width);
  margin:0 auto 80px;
  padding:clamp(24px,5vw,48px);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:32px;
  border:1px solid #ffffff1c;
  border-radius:24px;
  background:linear-gradient(120deg,#24111f,#16112d);
}

.try-vibe h2 {
  margin:7px 0 10px;
}

.try-vibe p {
  max-width:690px;
  margin:0;
  color:var(--muted);
  line-height:1.6;
}

.try-vibe p a {
  color:#ffc0d4;
  text-underline-offset:3px;
}

.cta-link {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:180px;
  background:#fff;
  color:#1a0e15;
  text-decoration:none;
  font-weight:850;
  white-space:nowrap;
}

@media(max-width:680px) {
  header {
    height:66px;
  }
  .article {
    border-radius:18px;
  }
  .copy {
    padding:28px 21px;
  }
  .gallery {
    grid-template-columns:1fr;
  }
  .gallery img {
    height:230px;
  }
  .preview-actions,.try-vibe {
    align-items:stretch;
    flex-direction:column;
  }
  .preview-actions button,.cta-link {
    width:100%;
  }
}

.body {
  min-width:0;
}

.table-scroll {
  max-width:100%;
  margin:28px 0;
  overflow-x:auto;
  overscroll-behavior-inline:contain;
  -webkit-overflow-scrolling:touch;
}

.table-scroll:focus-visible {
  outline:2px solid var(--accent);
  outline-offset:3px;
}

.body table {
  width:100%;
  min-width:680px;
  border-collapse:collapse;
  table-layout:auto;
  font-size:14px;
  line-height:1.45;
}

.body th,.body td {
  min-width:150px;
  padding:13px 15px;
  overflow-wrap:normal;
  word-break:normal;
  hyphens:none;
  border-bottom:1px solid #ffffff1c;
  text-align:left;
  vertical-align:top;
}

.body th:first-child,.body td:first-child {
  min-width:120px;
}

.body th {
  color:#fff;
  background:#ffffff0c;
  font-size:12px;
  letter-spacing:.04em;
  text-transform:uppercase;
}

.media-card {
  max-width:var(--headline-width);
  margin:34px auto;
  padding:clamp(18px,4vw,28px);
  overflow:hidden;
  border:1px solid #ffffff20;
  border-radius:18px;
  background:linear-gradient(120deg,#32182d,#121526);
}

.media-actions {
  display:flex;
  align-items:center;
  gap:14px;
  margin-top:12px;
}

.media-actions a {
  color:#ffc0d4;
  font-size:13px;
  text-underline-offset:3px;
}

.media-frame:not(:empty) {
  margin-top:20px;
}

.media-frame iframe {
  width:100%;
  height:clamp(240px,48vw,520px);
  display:block;
  border:0;
  border-radius:14px;
  background:#080609;
}

.media-card[data-media-kind="video"] .media-frame iframe {
  height:auto;
  aspect-ratio:16 / 9;
}

.media-card[data-media-kind="music"] .media-frame iframe {
  height:352px;
}

.media-card[data-media-provider="soundcloud"] .media-frame iframe {
  height:166px;
  background:#fff;
}

@media(max-width:680px) {
  .media-actions {
    align-items:stretch;
    flex-direction:column;
  }
  .media-actions button {
    width:100%;
  }
  .media-frame iframe {
    height:240px;
  }
  .media-card[data-media-provider="soundcloud"] .media-frame iframe {
    height:166px;
  }
}

.published-actions {
  width:min(680px,calc(100% - 28px));
  margin:0 auto 28px;
  padding:18px;
  display:grid;
  gap:12px;
  border:1px solid #ffffff24;
  border-radius:16px;
  background:#171018;
}

.published-link-label {
  display:grid;
  gap:7px;
  color:#b8abb4;
  font-size:11px;
  font-weight:750;
  letter-spacing:.08em;
  text-transform:uppercase;
}

.published-link-label input {
  width:100%;
  min-height:44px;
  padding:0 12px;
  border:1px solid #ffffff2b;
  border-radius:10px;
  outline:0;
  color:#fff;
  background:#0b080c;
  font:13px/1.4 Inter,system-ui,sans-serif;
  letter-spacing:0;
  text-transform:none;
}

.published-link-label input:focus {
  border-color:#ff9aba;
  box-shadow:0 0 0 3px #ff759f20;
}

.published-actions>a {
  color:#ffc0d4;
  font-size:12px;
  text-underline-offset:3px;
}

.published-share-buttons {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}

.published-share-buttons button {
  min-height:40px;
}

.published-share-status {
  margin:0;
  color:#c9bdc5;
  font-size:12px;
  line-height:1.45;
}

.published-actions+.delete {
  display:block;
  width:min(680px,calc(100% - 28px));
  margin:0 auto 48px;
}

@media(max-width:680px) {
  .published-actions {
    padding:15px;
  }
  .published-share-buttons {
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
  .published-share-buttons button {
    width:100%;
    padding-inline:8px;
    font-size:12px;
  }
}

.vibe-interactive {
  width:100%;
  min-width:0;
  margin:24px 0;
}

.vibe-interactive iframe,iframe.vibe-interactive {
  display:block;
  width:100%;
  border:0;
  border-radius:14px;
  background:#fff;
}
${SHARE_APPEARANCE_STYLES}
`;
