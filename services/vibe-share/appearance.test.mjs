import { renderPublicationMasthead } from "../../shared/publication-masthead.js";
import test from "node:test";
import assert from "node:assert/strict";
import {runInNewContext} from "node:vm";
import {cleanShareSnapshot} from "../../shared/vibe-share-contract.js";
import {renderNewPage, renderNotFound, renderPublicArticle} from "./src/render.mjs";
import {APP_JS} from "./src/app-source.mjs";
const value = {version:1,title:"The kettle has called a press conference",kind:"editorial",markdown:"A complete playful article.\n\n## Sources\n\n[Original](https://example.org)",publishedAt:Date.now(),visual:null,inlineVisuals:[],contentLink:null,media:null,appearance:{look:"bbc-news",palette:"news",textSize:"large",spacing:"roomy"}};
test("website look survives cleaning, persistence and public rendering", () => {
 const stored = JSON.parse(JSON.stringify(cleanShareSnapshot(value)));
 const html = renderPublicArticle(cleanShareSnapshot(stored), "https://share.codingforjustice.org.uk/a/example");
 assert.match(html, /<body data-look="bbc-news" data-mood="classic" data-palette="news" data-text-size="large" data-spacing="roomy">/);
 assert.doesNotMatch(html, /VIBE parody|independent of the BBC|<small class="look-note">/);
 assert.match(html, /--reading-width:68ch/);
 assert.match(html, /grid-column:1 \/ -1/);
});
test("private browser preview uses the same catalogue and appearance as public rendering", () => {
 const context = {document:{getElementById:()=>null},window:{addEventListener(){},parent:null},console};
 // Extract and run the shipped catalogue/normaliser, then compare with server cleaning.
 const prefix = APP_JS.slice(0, APP_JS.indexOf('function mediaEmbedSource'));
 const appearance = runInNewContext(prefix+';cleanArticleAppearance('+JSON.stringify(value.appearance)+')', context);
 assert.deepEqual(JSON.parse(JSON.stringify(appearance)), cleanShareSnapshot(value).appearance);
 assert.match(APP_JS, /document.body.dataset\[key\] = selected/);
});

function runPreviewAppearance(appearance) {
 const masthead = {innerHTML:""};
 const node = () => ({append(){},replaceChildren(){},setAttribute(){},className:"",textContent:""});
 const context = {
  document:{body:{dataset:{}},getElementById:(id)=>id === "publication-banner" ? masthead : null,createElement:node},
  preview:node(),renderVisual:()=>"",renderMarkdown:node,renderMedia:()=>null,
 };
 const prefix = APP_JS.slice(0, APP_JS.indexOf('function mediaEmbedSource'));
 const renderer = APP_JS.slice(APP_JS.indexOf('function renderSnapshot('),APP_JS.indexOf('async function receiveShareSnapshot('));
 runInNewContext(prefix+"\n"+renderer+'\nrenderSnapshot('+JSON.stringify({...value,appearance})+')',context);
 return {markup:masthead.innerHTML,appearance:context.document.body.dataset};
}

test("article appearance changes the preview to the exact server publication masthead", () => {
 for (const look of ["vibe", "bbc-news"]) {
  const appearance = {...value.appearance,look};
  const preview = runPreviewAppearance(appearance);
  const html = renderPublicArticle(cleanShareSnapshot({...value,appearance}),"https://example.org/a/test");
  assert.equal(preview.markup,renderPublicationMasthead(look));
  assert.ok(html.includes('<div class="publication-banner" id="publication-banner">'+preview.markup+'</div>'));
  assert.equal(preview.appearance.look,look);
  assert.doesNotMatch(preview.markup,/BBC|parody|independent/);
 }
 assert.doesNotMatch(APP_JS,/look-note/);
});

test("waiting preview and unavailable pages carry the stable default publication", () => {
 for (const html of [renderNewPage(),renderNotFound()]) {
  assert.match(html,/<body data-look="vibe" data-mood="classic" data-palette="midnight" data-text-size="standard" data-spacing="standard">/);
  assert.ok(html.includes(renderPublicationMasthead("vibe","classic")));
  assert.ok(html.indexOf('id="publication-banner"') < html.indexOf('<main'));
 }
});

test("unknown and malicious looks fall back without adding supplied markup", () => {
 for (const look of ['<img src=x onerror=alert(1)>','__proto__','constructor',null]) {
  const appearance = {...value.appearance,look,editorialPrompt:"PRIVATE_EDITORIAL_PREFERENCE"};
  const preview = runPreviewAppearance(appearance);
  const cleaned = cleanShareSnapshot({...value,appearance});
  const html = renderPublicArticle(cleaned,"https://example.org/a/test");
  assert.equal(preview.appearance.look,"vibe");
  assert.equal(preview.markup,renderPublicationMasthead("vibe"));
  assert.ok(html.includes(preview.markup));
  assert.doesNotMatch(html,/onerror=alert|PRIVATE_EDITORIAL_PREFERENCE/);
  assert.deepEqual(Object.keys(cleaned.appearance),["look","mood","palette","textSize","spacing"]);
 }
});

test("the four fixed VIBE moods retain their masthead in private preview and public rendering", () => {
 for (const mood of ["lilac-pop","cherry-soda","matcha-break","after-dark"]) {
  const appearance = {look:"bbc-news",mood,palette:mood,textSize:"standard",spacing:"standard"};
  const preview = runPreviewAppearance(appearance);
  const cleaned = cleanShareSnapshot({...value,appearance});
  const html = renderPublicArticle(cleaned,"https://example.org/a/test");
  assert.equal(preview.appearance.look,"bbc-news");
  assert.equal(preview.appearance.mood,mood);
  assert.ok(html.includes(`data-look="bbc-news" data-mood="${mood}" data-palette="${mood}"`));
  assert.equal(preview.markup,renderPublicationMasthead("bbc-news",mood));
  assert.ok(html.includes(preview.markup));
 }
});
